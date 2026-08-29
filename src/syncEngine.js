import { fetchGitHubSource } from './fetchers/github';
import { fetchGenericSource } from './fetchers/generic';
import {
  loadResourceCache,
  saveCacheEntry,
  getCacheEntry,
  isCacheStale,
} from './resourceSources';

async function fetchSource(source, { onPage } = {}) {
  if (source.type === 'github') {
    return fetchGitHubSource(source, { onPage });
  }
  if (source.type === 'generic') {
    return fetchGenericSource(source);
  }
  throw new Error(`Unknown source type: ${source.type}`);
}

/**
 * Sync one source and atomically persist its cache slot. Uses a per-source
 * storage key so that concurrent syncs of *other* sources cannot clobber
 * this source's freshly-written data (and vice-versa). A failed underlying
 * storage write (e.g. quota exceeded) rejects instead of silently dropping
 * the items.
 */
export async function syncSource(source, { onPage } = {}) {
  const items = await fetchSource(source, { onPage });
  const entry = await saveCacheEntry(source.id, items);
  return { sourceId: source.id, itemCount: items.length, lastSynced: entry.lastSynced };
}

export async function syncAllSources(sources, { force = false, onProgress } = {}) {
  const cache = await loadResourceCache();
  const results = [];

  for (const source of sources) {
    const entry = getCacheEntry(cache, source.id);
    if (!force && !isCacheStale(entry, source.syncIntervalMs)) {
      results.push({ sourceId: source.id, skipped: true });
      continue;
    }

    try {
      if (onProgress) onProgress({ sourceId: source.id, status: 'syncing' });
      const result = await syncSource(source, {
        onPage: onProgress
          ? ({ page, itemsSoFar }) => onProgress({ sourceId: source.id, status: 'syncing', page, itemsSoFar })
          : undefined,
      });
      results.push(result);
      if (onProgress) onProgress({ sourceId: source.id, status: 'done', ...result });
    } catch (err) {
      results.push({ sourceId: source.id, error: err.message });
      if (onProgress) onProgress({ sourceId: source.id, status: 'error', error: err.message });
    }
  }

  return results;
}

export async function getStaleSources(sources) {
  const cache = await loadResourceCache();
  return sources.filter((s) => isCacheStale(getCacheEntry(cache, s.id), s.syncIntervalMs));
}

export async function getCachedItems(sources) {
  const cache = await loadResourceCache();
  const all = [];

  for (const source of sources) {
    const entry = getCacheEntry(cache, source.id);
    if (!entry?.items) continue;
    for (const item of entry.items) {
      all.push({ ...item, sourceId: source.id, sourceLabel: source.label, sourceType: source.type, sourceFormat: source.sourceFormat });
    }
  }

  return all;
}
