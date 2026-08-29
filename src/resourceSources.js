const SOURCES_KEY = 'chrometab_resource_sources';

// Legacy: every source's cache entry was stored together under this single
// key. Concurrent syncs that read-modify-wrote this combined blob could
// clobber each other (one source's write would overwrite another source's
// in-flight update with a stale snapshot). The cache is now sharded into
// one key per source so writes are atomic with respect to other sources.
// The legacy key is migrated on first read.
const LEGACY_CACHE_KEY = 'chrometab_resource_cache';
const CACHE_KEY_PREFIX = 'chrometab_resource_cache:';

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getChromeStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

function getLastError() {
  if (typeof chrome === 'undefined' || !chrome.runtime) return null;
  return chrome.runtime.lastError || null;
}

function cacheKeyFor(sourceId) {
  return `${CACHE_KEY_PREFIX}${sourceId}`;
}

function storageGet(key) {
  const storage = getChromeStorage();
  if (!storage) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return Promise.resolve(JSON.parse(saved)); } catch { /* fall through */ }
    }
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    storage.get(key, (result) => resolve(result[key] || null));
  });
}

function storageGetAll() {
  const storage = getChromeStorage();
  if (!storage) {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      try { all[k] = JSON.parse(localStorage.getItem(k)); } catch { /* skip */ }
    }
    return Promise.resolve(all);
  }
  return new Promise((resolve) => {
    storage.get(null, (result) => resolve(result || {}));
  });
}

function storageSet(key, value) {
  const storage = getChromeStorage();
  if (!storage) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return new Promise((resolve, reject) => {
    storage.set({ [key]: value }, () => {
      const err = getLastError();
      if (err) reject(new Error(err.message || 'Storage write failed'));
      else resolve();
    });
  });
}

function storageRemove(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  const storage = getChromeStorage();
  if (!storage) {
    for (const k of list) localStorage.removeItem(k);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    storage.remove(list, () => {
      const err = getLastError();
      if (err) reject(new Error(err.message || 'Storage remove failed'));
      else resolve();
    });
  });
}

// --- Resource Sources (per-profile config) ---

export function loadResourceSources() {
  return storageGet(SOURCES_KEY).then((data) => data || {});
}

export function saveResourceSources(sourcesMap) {
  return storageSet(SOURCES_KEY, sourcesMap);
}

export function getSourcesForProfile(sourcesMap, profileId) {
  return sourcesMap?.[profileId] || [];
}

export function setSourcesForProfile(sourcesMap, profileId, sources) {
  return { ...sourcesMap, [profileId]: sources };
}

export function stripSourceSecrets(sourcesMap) {
  const stripped = {};
  for (const [profileId, sources] of Object.entries(sourcesMap)) {
    stripped[profileId] = sources.map((s) => {
      const clean = { ...s };
      if (clean.token) clean.token = '';
      if (clean.headers && typeof clean.headers === 'object') {
        const h = { ...clean.headers };
        for (const key of Object.keys(h)) {
          if (/auth/i.test(key)) h[key] = '';
        }
        clean.headers = h;
      }
      return clean;
    });
  }
  return stripped;
}

// --- Resource Cache (per-source, atomic) ---

let _migrationPromise = null;

/**
 * One-time migration from the legacy combined cache key into per-source
 * keys. Idempotent: re-running just rewrites identical entries. If any
 * per-source write fails (e.g. quota), the legacy key is left in place
 * so a future call can retry.
 */
function migrateLegacyCacheIfNeeded() {
  if (_migrationPromise) return _migrationPromise;
  _migrationPromise = (async () => {
    const legacy = await storageGet(LEGACY_CACHE_KEY);
    if (!legacy || typeof legacy !== 'object') return;
    const entries = Object.entries(legacy);
    if (entries.length === 0) {
      await storageRemove(LEGACY_CACHE_KEY).catch(() => {});
      return;
    }
    let allOk = true;
    for (const [sourceId, entry] of entries) {
      if (!entry || !Array.isArray(entry.items)) continue;
      try {
        await storageSet(cacheKeyFor(sourceId), entry);
      } catch {
        allOk = false;
      }
    }
    if (allOk) {
      await storageRemove(LEGACY_CACHE_KEY).catch(() => {});
    } else {
      // Allow another attempt on next load.
      _migrationPromise = null;
    }
  })();
  return _migrationPromise;
}

/**
 * Returns the combined cache snapshot { [sourceId]: { lastSynced, items } }.
 * Reads each source's slot independently so a stale snapshot from one
 * source cannot overwrite another source's data.
 */
export async function loadResourceCache() {
  await migrateLegacyCacheIfNeeded();
  const all = await storageGetAll();
  const cache = {};

  // Fall back to any not-yet-migrated legacy entries first; per-source
  // entries below override them.
  const legacy = all[LEGACY_CACHE_KEY];
  if (legacy && typeof legacy === 'object') {
    for (const [sourceId, entry] of Object.entries(legacy)) {
      if (entry && Array.isArray(entry.items)) cache[sourceId] = entry;
    }
  }

  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(CACHE_KEY_PREFIX) && value && Array.isArray(value.items)) {
      const sourceId = key.slice(CACHE_KEY_PREFIX.length);
      cache[sourceId] = value;
    }
  }

  return cache;
}

/**
 * Atomic per-source write: stamps `lastSynced` and persists only this
 * source's slot. Rejects if the underlying storage write fails (e.g.
 * `chrome.storage.local` quota exceeded), so callers see real errors
 * instead of silently losing data.
 */
export function saveCacheEntry(sourceId, items) {
  const entry = { lastSynced: new Date().toISOString(), items };
  return storageSet(cacheKeyFor(sourceId), entry).then(() => entry);
}

/**
 * Atomic per-source delete.
 */
export function deleteCacheEntry(sourceId) {
  return storageRemove(cacheKeyFor(sourceId));
}

// --- Pure helpers retained for UI snapshot use ---

export function getCacheEntry(cache, sourceId) {
  return cache?.[sourceId] || null;
}

export function isCacheStale(cacheEntry, intervalMs) {
  if (!cacheEntry?.lastSynced) return true;
  const interval = intervalMs != null ? intervalMs : SYNC_INTERVAL_MS;
  return Date.now() - new Date(cacheEntry.lastSynced).getTime() > interval;
}

let _idCounter = Date.now();
export function nextSourceId() {
  return `src_${_idCounter++}`;
}

export function createGitHubSource({ label, org, baseUrl, includeUserRepos, token }) {
  return {
    id: nextSourceId(),
    type: 'github',
    label: label || org || 'GitHub',
    baseUrl: baseUrl || 'https://api.github.com',
    org: org || '',
    includeUserRepos: !!includeUserRepos,
    token: token || '',
  };
}

export function createGenericSource({ label, fetchUrl, headers, resultPath, nameField, descriptionField, urlTemplate, paginationType, sourceFormat, syncIntervalMs }) {
  return {
    id: nextSourceId(),
    type: 'generic',
    label: label || 'API Source',
    fetchUrl: fetchUrl || '',
    headers: headers || {},
    resultPath: resultPath || '$',
    nameField: nameField || 'name',
    descriptionField: descriptionField || '',
    urlTemplate: urlTemplate || '',
    paginationType: paginationType || 'none',
    sourceFormat: sourceFormat || 'json',
    syncIntervalMs: syncIntervalMs != null ? syncIntervalMs : SYNC_INTERVAL_MS,
  };
}
