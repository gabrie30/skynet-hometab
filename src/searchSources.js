import { useState, useEffect } from 'react';

/**
 * Shared helpers for building a unified search index across:
 *   - config-driven links (columns, dropdowns, navbar, tab sets)
 *   - Chrome bookmarks
 *   - Chrome browser history (per-query)
 *   - Chrome recently-closed tabs/windows
 *
 * Both `SearchBar` (navbar quick search) and `CommandPalette` (Cmd+K)
 * consume these helpers so we have a single source of truth for what
 * counts as a "link", how history is queried, etc.
 *
 * Two distinct entry shapes are produced:
 *
 *   SearchBar shape   (legacy / used by Navbar SearchBar):
 *     { name, url, tags?, category, categoryName }
 *     category ∈ 'column' | 'dropdown' | 'navbar' | 'tabset'
 *               | 'bookmark' | 'history' | 'closed'
 *
 *   Palette shape     (used by the unified Cmd+K palette):
 *     { id, name, description?, url, category, categoryLabel,
 *       sourceLabel?, tags? }
 *     category ∈ 'github' | 'api' | 'link' | 'feed' | 'history' | 'closed'
 *
 * Helpers below construct both shapes. The legacy (SearchBar) shape is
 * preserved so the existing SearchBar continues to work unchanged.
 */

const HISTORY_DEBOUNCE_MS = 200;
const HISTORY_MAX_RESULTS = 100;
const CLOSED_MAX_RESULTS = 25;

// ---------- Config-link index (legacy SearchBar shape) ----------

/**
 * Builds a flat list of link-like entries from the active profile config.
 * Used by both SearchBar and the unified palette.
 *
 * @returns {Array<{name, url, tags, category, categoryName}>}
 */
export function buildConfigLinkIndex(config) {
  if (!config) return [];
  const entries = [];

  (config.columns ?? []).forEach((col) => {
    (col.links ?? []).forEach((link) => {
      entries.push({
        name: link.name,
        url: link.url,
        tags: link.tags ?? [],
        category: 'column',
        categoryName: col.heading,
      });
    });
  });

  (config.dropdowns ?? []).forEach((dd) => {
    const template = dd.urlTemplate || '';
    (dd.items ?? []).forEach((item) => {
      const value = typeof item === 'string' ? item : item.value;
      const label = typeof item === 'string' ? item : (item.label ?? item.value);
      const tags = (typeof item === 'object' && item.tags) ? item.tags : [];
      const url = value.trim().toLowerCase().startsWith('https://')
        ? value.trim()
        : template.replace(/\{part(\d*)\}/gi, (_, num) => {
            const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
            const idx = num ? parseInt(num, 10) - 1 : 0;
            return parts[idx] ?? '';
          });
      entries.push({
        name: label,
        url,
        tags,
        category: 'dropdown',
        categoryName: dd.heading,
      });
    });
  });

  if (config.navbar) {
    if (config.navbar.left?.url) {
      entries.push({
        name: config.navbar.left.name,
        url: config.navbar.left.url,
        tags: config.navbar.left.tags ?? [],
        category: 'navbar',
        categoryName: 'Nav Left',
      });
    }
    if (config.navbar.right?.url) {
      entries.push({
        name: config.navbar.right.name,
        url: config.navbar.right.url,
        tags: config.navbar.right.tags ?? [],
        category: 'navbar',
        categoryName: 'Nav Right',
      });
    }
  }

  (config.tabSets ?? []).forEach((ts) => {
    (ts.urls ?? []).forEach((link) => {
      entries.push({
        name: link.name,
        url: link.url,
        tags: link.tags ?? [],
        category: 'tabset',
        categoryName: ts.name,
      });
    });
  });

  return entries;
}

// ---------- Bookmarks ----------

/** Recursively flatten a Chrome bookmark tree into entry rows. */
export function flattenBookmarkTree(nodes, path = []) {
  const entries = [];
  for (const node of nodes) {
    const currentPath = node.title ? [...path, node.title] : path;
    if (node.url) {
      entries.push({
        name: node.title || node.url,
        url: node.url,
        category: 'bookmark',
        categoryName: path.join(' / ') || 'Bookmarks',
      });
    }
    if (node.children) {
      entries.push(...flattenBookmarkTree(node.children, currentPath));
    }
  }
  return entries;
}

/**
 * React hook: subscribe to the user's bookmark tree (one-time read).
 * Returns [] when bookmarks are disabled or unavailable.
 */
export function useBookmarks(enabled = true) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setEntries([]);
      return;
    }
    if (typeof chrome === 'undefined' || !chrome.bookmarks?.getTree) {
      return;
    }
    chrome.bookmarks.getTree((tree) => {
      setEntries(flattenBookmarkTree(tree));
    });
  }, [enabled]);

  return entries;
}

// ---------- History (per-query, debounced) ----------

/**
 * React hook: search Chrome history for the given query. Debounced.
 * Returns [] when disabled, when there's no query, or when the
 * chrome.history API isn't available.
 */
export function useHistorySearch(query, enabled = true) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = (query ?? '').trim();
    if (!enabled || !q) {
      setResults([]);
      return undefined;
    }
    if (typeof chrome === 'undefined' || !chrome.history?.search) {
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      chrome.history.search({ text: q, maxResults: HISTORY_MAX_RESULTS })
        .then((items) => {
          if (cancelled) return;
          setResults(
            (items || []).map((item) => ({
              name: item.title || item.url,
              url: item.url,
              category: 'history',
              categoryName: 'Browser History',
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, HISTORY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return results;
}

// ---------- Recently closed tabs/windows ----------

/** Flatten Chrome `sessions.getRecentlyClosed` output into entry rows. */
export function flattenSessions(sessions) {
  const entries = [];
  for (const session of sessions) {
    if (session.tab && session.tab.url) {
      entries.push({
        name: session.tab.title || session.tab.url,
        url: session.tab.url,
        category: 'closed',
        categoryName: 'Recently Closed',
      });
    }
    if (session.window && Array.isArray(session.window.tabs)) {
      for (const tab of session.window.tabs) {
        if (tab.url) {
          entries.push({
            name: tab.title || tab.url,
            url: tab.url,
            category: 'closed',
            categoryName: 'Recently Closed',
          });
        }
      }
    }
  }
  return entries;
}

/**
 * React hook: load the user's recently-closed sessions once.
 * Reloads when `reloadKey` changes (e.g. each time the palette opens).
 */
export function useRecentlyClosed(reloadKey = 0) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.sessions?.getRecentlyClosed) {
      return;
    }
    chrome.sessions.getRecentlyClosed({ maxResults: CLOSED_MAX_RESULTS })
      .then((sessions) => setEntries(flattenSessions(sessions || [])))
      .catch(() => setEntries([]));
  }, [reloadKey]);

  return entries;
}
