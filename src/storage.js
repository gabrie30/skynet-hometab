import { getDefaultLinks } from './defaultLinks';

const STORAGE_KEY = 'chrometab_config';

let idCounter = Date.now();
export const nextProfileId = () => `prof_${idCounter++}`;

const DEFAULT_TITLE_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Skynet_Terminator_logo.png/330px-Skynet_Terminator_logo.png';

export function getEmptyConfig() {
  return {
    columns: [],
    navbar: { left: { name: '', url: '' }, right: { name: '', url: '' } },
    dropdowns: [],
    tabSets: [],
    titleImage: '',
  };
}

export { DEFAULT_TITLE_IMAGE };

function getChromeStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

/**
 * Detects the old flat config format (pre-profiles) and wraps it
 * in the new envelope structure as a single "Default" profile.
 */
function ensureTitleImage(config) {
  if (config && !('titleImage' in config)) {
    return { ...config, titleImage: DEFAULT_TITLE_IMAGE };
  }
  return config;
}

/**
 * Ensures config has a tabSets array (for migration/import).
 */
function ensureTabSets(config) {
  if (config && !Array.isArray(config.tabSets)) {
    return { ...config, tabSets: [] };
  }
  return config;
}

/**
 * Normalizes dropdown items to { value, label? }[] (legacy string items become { value }).
 */
export function ensureDropdownItems(config) {
  if (!config || !Array.isArray(config.dropdowns)) return config;
  return {
    ...config,
    dropdowns: config.dropdowns.map((dd) => ({
      ...dd,
      items: (dd.items || []).map((it) =>
        typeof it === 'string' ? { value: it } : { value: it.value, label: it.label }
      ),
    })),
  };
}

/**
 * Ensures each profile has a todos array (for import/normalization).
 */
export function ensurePerProfileTodos(data) {
  if (!data || !data.profiles || !Array.isArray(data.profiles)) return data;
  const profiles = data.profiles.map((p) => ({
    ...p,
    todos: Array.isArray(p.todos) ? p.todos : [],
  }));
  return { ...data, profiles };
}

function migrateIfNeeded(data) {
  if (!data) return null;

  if (data.profiles && Array.isArray(data.profiles)) {
    const profiles = data.profiles.map((p) => ({
      ...p,
      config: ensureDropdownItems(ensureTabSets(ensureTitleImage(p.config))),
      todos: Array.isArray(p.todos) ? p.todos : [],
    }));
    return { ...data, profiles };
  }

  if (data.columns && data.navbar && data.dropdowns) {
    const id = nextProfileId();
    return {
      activeProfileId: id,
      profiles: [{
        id,
        name: 'Default',
        config: ensureDropdownItems(ensureTabSets(ensureTitleImage(data))),
      }],
    };
  }

  return null;
}

function loadRaw() {
  const storage = getChromeStorage();
  if (!storage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return Promise.resolve(JSON.parse(saved)); } catch { /* fall through */ }
    }
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    storage.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || null);
    });
  });
}

export function loadConfig() {
  return loadRaw().then(migrateIfNeeded);
}

export function saveConfig(appData) {
  const storage = getChromeStorage();
  if (!storage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    storage.set({ [STORAGE_KEY]: appData }, resolve);
  });
}

export async function loadOrSeedConfig() {
  const existing = await loadConfig();
  if (existing) return existing;

  const id = nextProfileId();
  const appData = {
    activeProfileId: id,
    profiles: [{ id, name: 'Default', config: getDefaultLinks() }],
  };
  await saveConfig(appData);
  return appData;
}

export function exportConfig(appData) {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skynet-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Accepts both the full envelope format ({ profiles, activeProfileId })
 * and the legacy single-profile format ({ columns, navbar, dropdowns }).
 */
export function importConfig() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return reject(new Error('No file selected'));

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);

          if (data.profiles && Array.isArray(data.profiles) && data.activeProfileId) {
            return resolve(data);
          }

          if (data.columns && data.navbar && data.dropdowns) {
            const id = nextProfileId();
            return resolve({
              activeProfileId: id,
              profiles: [{ id, name: 'Imported', config: data }],
            });
          }

          reject(new Error('Invalid config format'));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

// --- Gist ID persistence ---

const GIST_ID_KEY = 'chrometab_gist_id';

// --- GitHub token (for auto-sync to Gist on save) ---

const GITHUB_TOKEN_KEY = 'chrometab_github_token';

export function saveGithubToken(token) {
  const storage = getChromeStorage();
  const value = token ? String(token).trim() : null;
  if (!storage) {
    if (value) localStorage.setItem(GITHUB_TOKEN_KEY, value);
    else localStorage.removeItem(GITHUB_TOKEN_KEY);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    if (value) storage.set({ [GITHUB_TOKEN_KEY]: value }, resolve);
    else storage.remove(GITHUB_TOKEN_KEY, resolve);
  });
}

export function loadGithubToken() {
  const storage = getChromeStorage();
  if (!storage) {
    return Promise.resolve(localStorage.getItem(GITHUB_TOKEN_KEY));
  }
  return new Promise((resolve) => {
    storage.get(GITHUB_TOKEN_KEY, (result) => {
      resolve(result[GITHUB_TOKEN_KEY] || null);
    });
  });
}

export function saveGistId(gistId) {
  const storage = getChromeStorage();
  if (!storage) {
    localStorage.setItem(GIST_ID_KEY, gistId);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    storage.set({ [GIST_ID_KEY]: gistId }, resolve);
  });
}

export function loadGistId() {
  const storage = getChromeStorage();
  if (!storage) {
    return Promise.resolve(localStorage.getItem(GIST_ID_KEY));
  }
  return new Promise((resolve) => {
    storage.get(GIST_ID_KEY, (result) => {
      resolve(result[GIST_ID_KEY] || null);
    });
  });
}
