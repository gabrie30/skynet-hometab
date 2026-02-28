import { getDefaultLinks } from './defaultLinks';

const STORAGE_KEY = 'chrometab_config';

let idCounter = Date.now();
export const nextProfileId = () => `prof_${idCounter++}`;

const DEFAULT_TITLE_IMAGE = 'https://user-images.githubusercontent.com/1512282/128574386-7c64eab8-30d9-4d4b-a942-488bbbb7a6ec.jpeg';

export function getEmptyConfig() {
  return {
    columns: [],
    navbar: { left: { name: '', url: '' }, right: { name: '', url: '' } },
    dropdowns: [],
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

function migrateIfNeeded(data) {
  if (!data) return null;

  if (data.profiles && Array.isArray(data.profiles)) {
    const profiles = data.profiles.map((p) => ({
      ...p,
      config: ensureTitleImage(p.config),
    }));
    return { ...data, profiles };
  }

  if (data.columns && data.navbar && data.dropdowns) {
    const id = nextProfileId();
    return {
      activeProfileId: id,
      profiles: [{ id, name: 'Default', config: ensureTitleImage(data) }],
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

export function exportConfig(config) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'skynet-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

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
          const config = JSON.parse(ev.target.result);
          if (!config.columns || !config.navbar || !config.dropdowns) {
            return reject(new Error('Invalid config format'));
          }
          resolve(config);
        } catch {
          reject(new Error('Invalid JSON'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
