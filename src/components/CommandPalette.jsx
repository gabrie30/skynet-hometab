import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  loadResourceSources,
  saveResourceSources,
  getSourcesForProfile,
  setSourcesForProfile,
  loadResourceCache,
  deleteCacheEntry,
  getCacheEntry,
  isCacheStale,
  createGitHubSource,
  createGenericSource,
} from '../resourceSources';
import { syncAllSources, syncSource, getCachedItems } from '../syncEngine';
import {
  buildConfigLinkIndex,
  useBookmarks,
  useHistorySearch,
  useRecentlyClosed,
} from '../searchSources';

const VIEWPORT_MARGIN = 40;
const FILTER_DEBOUNCE_MS = 80;
const MAX_RENDERED_RESULTS = 200;

const VIEW_SEARCH = 'search';
const VIEW_SETTINGS = 'settings';
const VIEW_ADD_GITHUB = 'add_github';
const VIEW_ADD_GENERIC = 'add_generic';
const VIEW_EDIT_GENERIC = 'edit_generic';
const VIEW_ADD_RSS = 'add_rss';
const VIEW_EDIT_RSS = 'edit_rss';

// --- Unified category filter ---
//
// The palette presents a single row of category filter pills:
//   All | GitHub | API | Links | Feeds | History | Closed
//
// `Tab` inside the search input cycles through whichever pills are
// currently visible (pills hide when their category has zero items
// available).
const FILTER_ALL = 'all';
const FILTER_GITHUB = 'github';
const FILTER_API = 'api';
const FILTER_LINK = 'link';
const FILTER_FEED = 'feed';
const FILTER_HISTORY = 'history';
const FILTER_CLOSED = 'closed';

const FILTER_ORDER = [
  FILTER_ALL,
  FILTER_GITHUB,
  FILTER_API,
  FILTER_LINK,
  FILTER_FEED,
  FILTER_HISTORY,
  FILTER_CLOSED,
];

const FILTER_LABELS = {
  [FILTER_ALL]: 'All',
  [FILTER_GITHUB]: 'GitHub',
  [FILTER_API]: 'API',
  [FILTER_LINK]: 'Links',
  [FILTER_FEED]: 'Feeds',
  [FILTER_HISTORY]: 'History',
  [FILTER_CLOSED]: 'Closed',
};

const CATEGORY_BADGE_LABEL = {
  [FILTER_GITHUB]: 'GitHub',
  [FILTER_API]: 'API',
  [FILTER_LINK]: 'Link',
  [FILTER_FEED]: 'RSS',
  [FILTER_HISTORY]: 'History',
  [FILTER_CLOSED]: 'Closed',
};

function formatSyncTime(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const STORAGE_QUOTA_BYTES = 10 * 1024 * 1024;

function getStorageBytes() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => resolve(bytes));
    });
  }
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    total += key.length + (localStorage.getItem(key) || '').length;
  }
  return Promise.resolve(total * 2);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function maskToken(token) {
  if (!token || token.length < 8) return '\u2022\u2022\u2022\u2022';
  const prefix = token.slice(0, 4);
  const suffix = token.slice(-4);
  return `${prefix}\u2026${suffix}`;
}

/**
 * Convert a cached resource-source item (as produced by syncEngine)
 * into a unified palette item. Resource sources may be GitHub repos,
 * generic JSON APIs, or RSS feeds.
 */
function resourceToPaletteItem(item, idx) {
  let category;
  if (item.sourceFormat === 'rss') category = FILTER_FEED;
  else if (item.sourceType === 'github') category = FILTER_GITHUB;
  else category = FILTER_API;

  return {
    id: `${category}-${item.sourceId}-${idx}`,
    name: item.name,
    description: item.description || '',
    url: item.url,
    category,
    sourceLabel: item.sourceLabel,
    pubDate: item.pubDate,
  };
}

/**
 * Convert a config/bookmark link (legacy SearchBar shape) into a
 * unified palette item under the "link" category.
 */
function linkToPaletteItem(entry, idx) {
  return {
    id: `link-${idx}-${entry.url}`,
    name: entry.name,
    url: entry.url,
    category: FILTER_LINK,
    sourceLabel: entry.categoryName,
    tags: entry.tags,
  };
}

function historyToPaletteItem(entry, idx) {
  return {
    id: `history-${idx}-${entry.url}`,
    name: entry.name,
    url: entry.url,
    category: FILTER_HISTORY,
    sourceLabel: 'Browser History',
  };
}

function closedToPaletteItem(entry, idx) {
  return {
    id: `closed-${idx}-${entry.url}`,
    name: entry.name,
    url: entry.url,
    category: FILTER_CLOSED,
    sourceLabel: 'Recently Closed',
  };
}

const ResultRow = React.memo(({ item, isActive, onHover, onSelect }) => (
  <li
    className={`cmd-result ${isActive ? 'cmd-result--active' : ''}`}
    role="option"
    aria-selected={isActive}
    onMouseEnter={onHover}
    onMouseDown={onSelect}
  >
    <div className="cmd-result-main">
      <span className="cmd-result-name">{item.name}</span>
      {item.description && (
        <span className="cmd-result-desc">{item.description}</span>
      )}
    </div>
    <div className="cmd-result-meta">
      {item.sourceLabel && <span className="cmd-result-source">{item.sourceLabel}</span>}
      {item.pubDate && (
        <span className="cmd-result-feed-date">
          {new Date(item.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      )}
      <span className={`cmd-result-badge cmd-result-badge--${item.category}`}>
        {CATEGORY_BADGE_LABEL[item.category]}
      </span>
    </div>
  </li>
));

const CommandPalette = ({
  profileId,
  open,
  onClose,
  initialMode,
  config,
  searchBookmarks = true,
  searchHistory = true,
}) => {
  const [view, setView] = useState(VIEW_SEARCH);
  const [activeFilter, setActiveFilter] = useState(FILTER_ALL);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [sources, setSources] = useState([]);
  const [allSourcesMap, setAllSourcesMap] = useState({});
  const [cachedItems, setCachedItems] = useState([]);
  const [cache, setCache] = useState({});
  const [syncing, setSyncing] = useState({});
  const [syncProgress, setSyncProgress] = useState({});
  const [syncErrors, setSyncErrors] = useState({});
  const [storageUsage, setStorageUsage] = useState(null);
  const [closedReloadKey, setClosedReloadKey] = useState(0);

  const [ghOrg, setGhOrg] = useState('');
  const [ghBaseUrl, setGhBaseUrl] = useState('https://api.github.com');
  const [ghLabel, setGhLabel] = useState('');
  const [ghIncludeUser, setGhIncludeUser] = useState(false);
  const [ghToken, setGhToken] = useState('');

  const [genLabel, setGenLabel] = useState('');
  const [genFetchUrl, setGenFetchUrl] = useState('');
  const [genHeaders, setGenHeaders] = useState('');
  const [genResultPath, setGenResultPath] = useState('$');
  const [genNameField, setGenNameField] = useState('name');
  const [genDescField, setGenDescField] = useState('');
  const [genUrlTemplate, setGenUrlTemplate] = useState('');
  const [genPagination, setGenPagination] = useState('none');
  const [editingSourceId, setEditingSourceId] = useState(null);

  const [rssLabel, setRssLabel] = useState('');
  const [rssFeedUrl, setRssFeedUrl] = useState('');
  const [rssSyncInterval, setRssSyncInterval] = useState('86400000');
  const [editingRssId, setEditingRssId] = useState(null);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const overlayRef = useRef(null);

  const loadData = useCallback(async () => {
    const sourcesMap = await loadResourceSources();
    setAllSourcesMap(sourcesMap);
    const profileSources = getSourcesForProfile(sourcesMap, profileId);
    setSources(profileSources);
    const items = await getCachedItems(profileSources);
    setCachedItems(items);
    const c = await loadResourceCache();
    setCache(c);
    getStorageBytes().then(setStorageUsage);
  }, [profileId]);

  useEffect(() => {
    if (open) {
      loadData();
      setView(VIEW_SEARCH);
      setActiveFilter(initialMode === 'feeds' ? FILTER_FEED : FILTER_ALL);
      setQuery('');
      setActiveIndex(0);
      setClosedReloadKey((k) => k + 1);
    }
  }, [open, loadData, initialMode]);

  useEffect(() => {
    if (open && view === VIEW_SEARCH) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, view]);

  // --- Build unified item index ---

  const resourceItems = useMemo(
    () => cachedItems.map(resourceToPaletteItem),
    [cachedItems],
  );

  const configLinks = useMemo(() => buildConfigLinkIndex(config), [config]);
  const bookmarkLinks = useBookmarks(open && searchBookmarks);
  const linkItems = useMemo(
    () => [...configLinks, ...bookmarkLinks].map(linkToPaletteItem),
    [configLinks, bookmarkLinks],
  );

  // History is only meaningful when there's a query and the user has
  // opted-in via searchHistory. We narrow the hook with an `enabled`
  // flag so it doesn't issue chrome.history calls when the palette is
  // closed or history is disabled.
  const historyEnabled =
    open &&
    searchHistory &&
    (activeFilter === FILTER_ALL || activeFilter === FILTER_HISTORY);
  const historyEntries = useHistorySearch(query, historyEnabled);
  const historyItems = useMemo(
    () => historyEntries.map(historyToPaletteItem),
    [historyEntries],
  );

  const closedEntries = useRecentlyClosed(closedReloadKey);
  const closedItems = useMemo(
    () => closedEntries.map(closedToPaletteItem),
    [closedEntries],
  );

  const itemsByCategory = useMemo(() => ({
    [FILTER_GITHUB]: resourceItems.filter((i) => i.category === FILTER_GITHUB),
    [FILTER_API]: resourceItems.filter((i) => i.category === FILTER_API),
    [FILTER_FEED]: resourceItems.filter((i) => i.category === FILTER_FEED),
    [FILTER_LINK]: linkItems,
    [FILTER_HISTORY]: historyItems,
    [FILTER_CLOSED]: closedItems,
  }), [resourceItems, linkItems, historyItems, closedItems]);

  // Pills are visible only if their category has any candidate items
  // OR if it's history (where items only appear after typing). We
  // always show the History pill when history search is enabled so
  // users know it's a switchable category even when the query is empty.
  const visibleFilters = useMemo(() => {
    const list = [FILTER_ALL];
    if (itemsByCategory[FILTER_GITHUB].length > 0) list.push(FILTER_GITHUB);
    if (itemsByCategory[FILTER_API].length > 0) list.push(FILTER_API);
    if (itemsByCategory[FILTER_LINK].length > 0) list.push(FILTER_LINK);
    if (itemsByCategory[FILTER_FEED].length > 0) list.push(FILTER_FEED);
    if (searchHistory) list.push(FILTER_HISTORY);
    if (itemsByCategory[FILTER_CLOSED].length > 0) list.push(FILTER_CLOSED);
    return list;
  }, [itemsByCategory, searchHistory]);

  // If the active filter is no longer visible (e.g. category emptied),
  // fall back to All.
  useEffect(() => {
    if (!visibleFilters.includes(activeFilter)) {
      setActiveFilter(FILTER_ALL);
    }
  }, [visibleFilters, activeFilter]);

  // --- Search index + filtering ---

  // Ordering rationale for the `All` filter:
  // GitHub repos are typically the largest category and tend to drown
  // out shorter, higher-signal results (saved links, recent history,
  // closed tabs). Show them last so the more specific categories
  // surface first.
  const candidateItems = useMemo(() => {
    if (activeFilter === FILTER_ALL) {
      return [
        ...itemsByCategory[FILTER_LINK],
        ...itemsByCategory[FILTER_API],
        ...itemsByCategory[FILTER_FEED],
        ...itemsByCategory[FILTER_HISTORY],
        ...itemsByCategory[FILTER_CLOSED],
        ...itemsByCategory[FILTER_GITHUB],
      ];
    }
    return itemsByCategory[activeFilter] || [];
  }, [activeFilter, itemsByCategory]);

  const searchIndex = useMemo(
    () => candidateItems.map((item) => ({
      item,
      text: [
        item.name,
        item.description || '',
        item.url,
        item.sourceLabel || '',
        ...(item.tags || []),
      ].join('\0').toLowerCase(),
    })),
    [candidateItems],
  );

  const [filteredItems, setFilteredItems] = useState([]);
  const filterTimerRef = useRef(null);

  useEffect(() => {
    const q = query.trim().toLowerCase();

    // Per product spec: nothing is shown until the user starts typing.
    if (!q) {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
      setFilteredItems([]);
      setActiveIndex(0);
      return undefined;
    }

    if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    filterTimerRef.current = setTimeout(() => {
      const results = [];
      for (let i = 0; i < searchIndex.length; i++) {
        const entry = searchIndex[i];
        if (!entry.text.includes(q)) continue;
        results.push(entry.item);
        if (results.length >= MAX_RENDERED_RESULTS) break;
      }
      setFilteredItems(results);
      setActiveIndex(0);
    }, FILTER_DEBOUNCE_MS);

    return () => {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current);
    };
  }, [query, searchIndex]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('.cmd-result--active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const navigate = useCallback((url) => {
    if (url) window.open(url, '_blank');
  }, []);

  const cycleFilter = useCallback((direction) => {
    if (visibleFilters.length <= 1) return;
    const idx = visibleFilters.indexOf(activeFilter);
    const safeIdx = idx === -1 ? 0 : idx;
    const nextIdx = (safeIdx + direction + visibleFilters.length) % visibleFilters.length;
    setActiveFilter(visibleFilters[nextIdx]);
  }, [visibleFilters, activeFilter]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      cycleFilter(e.shiftKey ? -1 : 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredItems.length > 0) {
      e.preventDefault();
      navigate(filteredItems[activeIndex]?.url);
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filteredItems, activeIndex, navigate, onClose, cycleFilter]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // --- Source CRUD / sync (unchanged from prior implementation) ---

  const handleSyncAll = useCallback(async () => {
    const toSync = sources.map((s) => s.id);
    setSyncing((prev) => {
      const next = { ...prev };
      toSync.forEach((id) => { next[id] = true; });
      return next;
    });
    setSyncErrors({});

    try {
      await syncAllSources(sources, {
        force: true,
        onProgress: ({ sourceId, status, error, page, itemsSoFar }) => {
          if (status === 'syncing' && page != null) {
            setSyncProgress((prev) => ({ ...prev, [sourceId]: { page, itemsSoFar } }));
          }
          if (status === 'done' || status === 'error') {
            setSyncing((prev) => ({ ...prev, [sourceId]: false }));
            setSyncProgress((prev) => { const n = { ...prev }; delete n[sourceId]; return n; });
          }
          if (error) {
            setSyncErrors((prev) => ({ ...prev, [sourceId]: error }));
          }
        },
      });
    } catch {
      toSync.forEach((id) => {
        setSyncing((prev) => ({ ...prev, [id]: false }));
        setSyncProgress((prev) => { const n = { ...prev }; delete n[id]; return n; });
      });
    }

    await loadData();
  }, [sources, loadData]);

  const handleSyncOne = useCallback(async (source) => {
    setSyncing((prev) => ({ ...prev, [source.id]: true }));
    setSyncErrors((prev) => { const n = { ...prev }; delete n[source.id]; return n; });
    setSyncProgress((prev) => { const n = { ...prev }; delete n[source.id]; return n; });

    try {
      await syncSource(source, {
        onPage: ({ page, itemsSoFar }) => {
          setSyncProgress((prev) => ({ ...prev, [source.id]: { page, itemsSoFar } }));
        },
      });
    } catch (err) {
      setSyncErrors((prev) => ({ ...prev, [source.id]: err.message }));
    }

    setSyncing((prev) => ({ ...prev, [source.id]: false }));
    setSyncProgress((prev) => { const n = { ...prev }; delete n[source.id]; return n; });
    await loadData();
  }, [loadData]);

  const handleRemoveSource = useCallback(async (sourceId) => {
    const updated = sources.filter((s) => s.id !== sourceId);
    const newMap = setSourcesForProfile(allSourcesMap, profileId, updated);
    await saveResourceSources(newMap);
    await deleteCacheEntry(sourceId);
    await loadData();
  }, [sources, allSourcesMap, profileId, loadData]);

  const resetGhForm = () => {
    setGhOrg('');
    setGhBaseUrl('https://api.github.com');
    setGhLabel('');
    setGhIncludeUser(false);
    setGhToken('');
  };

  const handleAddGitHub = useCallback(async () => {
    if ((!ghOrg && !ghIncludeUser) || !ghToken.trim()) return;
    const source = createGitHubSource({
      label: ghLabel || ghOrg || 'My Repos',
      org: ghOrg,
      baseUrl: ghBaseUrl,
      includeUserRepos: ghIncludeUser,
      token: ghToken.trim(),
    });
    const updated = [...sources, source];
    const newMap = setSourcesForProfile(allSourcesMap, profileId, updated);
    await saveResourceSources(newMap);
    resetGhForm();
    setView(VIEW_SETTINGS);
    await loadData();
    handleSyncOne(source);
  }, [ghOrg, ghBaseUrl, ghLabel, ghIncludeUser, ghToken, sources, allSourcesMap, profileId, loadData, handleSyncOne]);

  const resetGenericForm = () => {
    setGenLabel('');
    setGenFetchUrl('');
    setGenHeaders('');
    setGenResultPath('$');
    setGenNameField('name');
    setGenDescField('');
    setGenUrlTemplate('');
    setGenPagination('none');
    setEditingSourceId(null);
  };

  const resetRssForm = () => {
    setRssLabel('');
    setRssFeedUrl('');
    setRssSyncInterval('86400000');
    setEditingRssId(null);
  };

  const handleAddGeneric = useCallback(async () => {
    if (!genFetchUrl) return;
    let parsedHeaders = {};
    if (genHeaders.trim()) {
      try { parsedHeaders = JSON.parse(genHeaders); } catch { return; }
    }
    const source = createGenericSource({
      label: genLabel,
      fetchUrl: genFetchUrl,
      headers: parsedHeaders,
      resultPath: genResultPath,
      nameField: genNameField,
      descriptionField: genDescField,
      urlTemplate: genUrlTemplate,
      paginationType: genPagination,
      sourceFormat: 'json',
    });
    const updated = [...sources, source];
    const newMap = setSourcesForProfile(allSourcesMap, profileId, updated);
    await saveResourceSources(newMap);
    resetGenericForm();
    setView(VIEW_SETTINGS);
    await loadData();
    handleSyncOne(source);
  }, [genLabel, genFetchUrl, genHeaders, genResultPath, genNameField, genDescField, genUrlTemplate, genPagination, sources, allSourcesMap, profileId, loadData, handleSyncOne]);

  const handleAddRss = useCallback(async () => {
    if (!rssFeedUrl) return;
    const source = createGenericSource({
      label: rssLabel || 'RSS Feed',
      fetchUrl: rssFeedUrl,
      sourceFormat: 'rss',
      syncIntervalMs: Number(rssSyncInterval),
    });
    const updated = [...sources, source];
    const newMap = setSourcesForProfile(allSourcesMap, profileId, updated);
    await saveResourceSources(newMap);
    resetRssForm();
    setView(VIEW_SETTINGS);
    await loadData();
    handleSyncOne(source);
  }, [rssLabel, rssFeedUrl, rssSyncInterval, sources, allSourcesMap, profileId, loadData, handleSyncOne]);

  const handleEditGenericOpen = useCallback((source) => {
    if (source.sourceFormat === 'rss') {
      setEditingRssId(source.id);
      setRssLabel(source.label || '');
      setRssFeedUrl(source.fetchUrl || '');
      setRssSyncInterval(String(source.syncIntervalMs || 86400000));
      setView(VIEW_EDIT_RSS);
      return;
    }
    setEditingSourceId(source.id);
    setGenLabel(source.label || '');
    setGenFetchUrl(source.fetchUrl || '');
    setGenHeaders(source.headers ? JSON.stringify(source.headers, null, 2) : '');
    setGenResultPath(source.resultPath || '$');
    setGenNameField(source.nameField || 'name');
    setGenDescField(source.descriptionField || '');
    setGenUrlTemplate(source.urlTemplate || '');
    setGenPagination(source.paginationType || 'none');
    setView(VIEW_EDIT_GENERIC);
  }, []);

  const handleEditGenericSave = useCallback(async () => {
    if (!genFetchUrl || !editingSourceId) return;
    let parsedHeaders = {};
    if (genHeaders.trim()) {
      try { parsedHeaders = JSON.parse(genHeaders); } catch { return; }
    }
    const updated = sources.map((s) => {
      if (s.id !== editingSourceId) return s;
      return {
        ...s,
        label: genLabel || s.label,
        fetchUrl: genFetchUrl,
        headers: parsedHeaders,
        resultPath: genResultPath,
        nameField: genNameField,
        descriptionField: genDescField,
        urlTemplate: genUrlTemplate,
        paginationType: genPagination,
      };
    });
    const newMap = setSourcesForProfile(allSourcesMap, profileId, updated);
    await saveResourceSources(newMap);
    resetGenericForm();
    setView(VIEW_SETTINGS);
    await loadData();
  }, [editingSourceId, genLabel, genFetchUrl, genHeaders, genResultPath, genNameField, genDescField, genUrlTemplate, genPagination, sources, allSourcesMap, profileId, loadData]);

  const handleEditRssSave = useCallback(async () => {
    if (!rssFeedUrl || !editingRssId) return;
    const updated = sources.map((s) => {
      if (s.id !== editingRssId) return s;
      return { ...s, label: rssLabel || s.label, fetchUrl: rssFeedUrl, syncIntervalMs: Number(rssSyncInterval) };
    });
    const newMap = setSourcesForProfile(allSourcesMap, profileId, updated);
    await saveResourceSources(newMap);
    resetRssForm();
    setView(VIEW_SETTINGS);
    await loadData();
  }, [editingRssId, rssLabel, rssFeedUrl, rssSyncInterval, sources, allSourcesMap, profileId, loadData]);

  // --- Auto-sync stale sources on open ---

  const autoSyncRanRef = useRef(false);

  useEffect(() => {
    if (!open) {
      autoSyncRanRef.current = false;
      return undefined;
    }
    if (autoSyncRanRef.current || sources.length === 0) return undefined;
    autoSyncRanRef.current = true;

    let cancelled = false;

    (async () => {
      const freshCache = await loadResourceCache();
      const stale = sources.filter((s) => isCacheStale(getCacheEntry(freshCache, s.id), s.syncIntervalMs));
      if (stale.length === 0 || cancelled) return;

      stale.forEach((s) => {
        setSyncing((prev) => ({ ...prev, [s.id]: true }));
      });

      try {
        await syncAllSources(stale, {
          force: true,
          onProgress: ({ sourceId, status, error, page, itemsSoFar }) => {
            if (cancelled) return;
            if (status === 'syncing' && page != null) {
              setSyncProgress((prev) => ({ ...prev, [sourceId]: { page, itemsSoFar } }));
            }
            if (status === 'done' || status === 'error') {
              setSyncing((prev) => ({ ...prev, [sourceId]: false }));
              setSyncProgress((prev) => { const n = { ...prev }; delete n[sourceId]; return n; });
            }
            if (error) {
              setSyncErrors((prev) => ({ ...prev, [sourceId]: error }));
            }
          },
        });
      } catch {
        stale.forEach((s) => {
          setSyncing((prev) => ({ ...prev, [s.id]: false }));
          setSyncProgress((prev) => { const n = { ...prev }; delete n[s.id]; return n; });
        });
      }

      if (!cancelled) await loadData();
    })();

    return () => { cancelled = true; };
  }, [open, sources.length, sources, loadData]);

  if (!open) return null;

  const maxListHeight = window.innerHeight - VIEWPORT_MARGIN * 2 - 60 - 44;
  const isSyncing = Object.values(syncing).some(Boolean);
  const showFilters = visibleFilters.length > 1;
  const trimmedQuery = query.trim();

  const renderEmptyState = () => {
    if (isSyncing) {
      const active = Object.entries(syncProgress);
      if (active.length > 0) {
        const [, p] = active[active.length - 1];
        return `Syncing\u2026 page ${p.page} (${p.itemsSoFar} repos)`;
      }
      return 'Syncing\u2026';
    }
    if (activeFilter === FILTER_FEED) return 'Type to search RSS feed items.';
    if (activeFilter === FILTER_HISTORY) return 'Type to search browser history.';
    if (activeFilter === FILTER_CLOSED) return 'Type to search recently closed tabs.';
    if (activeFilter === FILTER_GITHUB) return 'Type to search GitHub repos.';
    if (activeFilter === FILTER_API) return 'Type to search API resources.';
    if (activeFilter === FILTER_LINK) return 'Type to search saved links and bookmarks.';
    return 'Type to search across resources, links, history, and closed tabs.';
  };

  const renderSearch = () => (
    <div className="cmd-palette-inner">
      <div className="cmd-palette-header">
        <svg className="cmd-palette-search-icon" viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="cmd-palette-input"
          placeholder="Search resources, links, history\u2026"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="cmd-palette-settings-btn"
          onClick={() => setView(VIEW_SETTINGS)}
          title="Configure sources"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {showFilters && (
        <div className="cmd-palette-filter-bar">
          {visibleFilters.map((f) => (
            <button
              key={f}
              className={`cmd-palette-filter-pill ${activeFilter === f ? 'cmd-palette-filter-pill--active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); setActiveFilter(f); }}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      )}

      {filteredItems.length > 0 ? (
        <ul
          className="cmd-palette-results"
          ref={listRef}
          role="listbox"
          style={{ maxHeight: maxListHeight }}
        >
          {filteredItems.map((item, i) => (
            <ResultRow
              key={item.id}
              item={item}
              isActive={i === activeIndex}
              onHover={() => setActiveIndex(i)}
              onSelect={(e) => {
                e.preventDefault();
                navigate(item.url);
                onClose();
              }}
            />
          ))}
        </ul>
      ) : trimmedQuery ? (
        <div className="cmd-palette-no-results">
          No results for &ldquo;{trimmedQuery}&rdquo;{activeFilter !== FILTER_ALL ? ` in ${FILTER_LABELS[activeFilter]}` : ''}
        </div>
      ) : (
        <div className="cmd-palette-no-results">
          {renderEmptyState()}
        </div>
      )}

      <div className="cmd-palette-footer">
        <span className="cmd-palette-hint">
          <kbd>&uarr;&darr;</kbd> navigate &nbsp; <kbd>Tab</kbd> filter &nbsp; <kbd>Enter</kbd> open &nbsp; <kbd>Esc</kbd> close
        </span>
        <span className="cmd-palette-footer-right">
          {storageUsage != null && (
            <span className={`cmd-palette-storage ${storageUsage / STORAGE_QUOTA_BYTES > 0.8 ? 'cmd-palette-storage--warn' : ''}`}>
              {formatBytes(storageUsage)} / {formatBytes(STORAGE_QUOTA_BYTES)}
            </span>
          )}
          {sources.length > 0 && (
            <span className="cmd-palette-sync-status">
              {isSyncing
                ? (() => {
                    const active = Object.entries(syncProgress);
                    if (active.length > 0) {
                      const [, p] = active[active.length - 1];
                      return `Syncing\u2026 page ${p.page} (${p.itemsSoFar} repos)`;
                    }
                    return 'Syncing\u2026';
                  })()
                : 'Synced'}
            </span>
          )}
        </span>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="cmd-palette-inner">
      <div className="cmd-palette-header">
        <button className="cmd-palette-back-btn" onClick={() => setView(VIEW_SEARCH)}>
          &larr;
        </button>
        <span className="cmd-palette-header-title">Resource Sources</span>
      </div>

      <div className="cmd-palette-settings-body" style={{ maxHeight: maxListHeight }}>
        {sources.length === 0 ? (
          <div className="cmd-palette-empty">
            <p>No sources configured for this profile.</p>
          </div>
        ) : (
          <ul className="cmd-palette-source-list">
            {sources.map((source) => {
              const entry = getCacheEntry(cache, source.id);
              const stale = isCacheStale(entry, source.syncIntervalMs);
              const isSrcSyncing = syncing[source.id];
              const progress = syncProgress[source.id];
              const error = syncErrors[source.id];

              return (
                <li key={source.id} className="cmd-palette-source-item">
                  <div className="cmd-palette-source-info">
                    <span className="cmd-palette-source-label">{source.label}</span>
                    <span className="cmd-palette-source-detail">
                      {source.type === 'github'
                        ? `${source.baseUrl !== 'https://api.github.com' ? source.baseUrl + ' \u00b7 ' : ''}${source.org ? 'org: ' + source.org : ''}${source.includeUserRepos ? (source.org ? ' + user repos' : 'user repos') : ''}`
                        : source.fetchUrl}
                    </span>
                    {source.type === 'github' && source.token && (
                      <span className="cmd-palette-source-token">
                        token: {maskToken(source.token)}
                      </span>
                    )}
                    <span className={`cmd-palette-source-sync-status ${stale ? 'cmd-palette-source-sync-status--stale' : ''}`}>
                      {isSrcSyncing
                        ? `syncing\u2026${progress ? ` page ${progress.page} (${progress.itemsSoFar} repos)` : ''}`
                        : `synced ${formatSyncTime(entry?.lastSynced)}`}
                      {entry?.items ? ` \u00b7 ${entry.items.length} items` : ''}
                    </span>
                    {error && <span className="cmd-palette-source-error">{error}</span>}
                  </div>
                  <div className="cmd-palette-source-actions">
                    <button
                      className="cmd-palette-icon-btn"
                      title="Sync now"
                      disabled={isSrcSyncing}
                      onClick={() => handleSyncOne(source)}
                    >
                      &#x21bb;
                    </button>
                    {source.type === 'generic' && (
                      <button
                        className="cmd-palette-icon-btn"
                        title="Edit"
                        onClick={() => handleEditGenericOpen(source)}
                      >
                        &#x270E;
                      </button>
                    )}
                    <button
                      className="cmd-palette-icon-btn cmd-palette-icon-btn--danger"
                      title="Remove"
                      onClick={() => handleRemoveSource(source.id)}
                    >
                      &times;
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="cmd-palette-add-btns">
          <button
            className="cmd-palette-action-btn"
            onClick={() => { resetGhForm(); setView(VIEW_ADD_GITHUB); }}
          >
            + GitHub
          </button>
          <button className="cmd-palette-action-btn" onClick={() => { resetGenericForm(); setView(VIEW_ADD_GENERIC); }}>
            + API
          </button>
          <button className="cmd-palette-action-btn" onClick={() => { resetRssForm(); setView(VIEW_ADD_RSS); }}>
            + RSS Feed
          </button>
          {sources.length > 0 && (
            <button
              className="cmd-palette-action-btn"
              onClick={handleSyncAll}
              disabled={isSyncing}
              title="Force-sync all sources now"
            >
              Sync all
            </button>
          )}
        </div>
      </div>

      <div className="cmd-palette-footer">
        <span className="cmd-palette-hint">
          Configure which APIs to cache and search
        </span>
      </div>
    </div>
  );

  const renderAddGitHub = () => (
    <div className="cmd-palette-inner">
      <div className="cmd-palette-header">
        <button className="cmd-palette-back-btn" onClick={() => setView(VIEW_SETTINGS)}>
          &larr;
        </button>
        <span className="cmd-palette-header-title">Add GitHub Source</span>
      </div>

      <div className="cmd-palette-form" style={{ maxHeight: maxListHeight }}>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Fine-Grained Personal Access Token</span>
          <input
            type="password"
            className="cmd-palette-field-input"
            placeholder="github_pat_..."
            value={ghToken}
            onChange={(e) => setGhToken(e.target.value)}
          />
          <span className="cmd-palette-field-hint">
            Create a fine-grained token at github.com &rarr; Settings &rarr; Developer settings &rarr; Fine-grained tokens.
            Grant read-only access to the org&rsquo;s repositories. Each source needs its own token scoped to that org.
          </span>
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Label</span>
          <input
            type="text"
            className="cmd-palette-field-input"
            placeholder="e.g. My Org"
            value={ghLabel}
            onChange={(e) => setGhLabel(e.target.value)}
          />
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Organization</span>
          <input
            type="text"
            className="cmd-palette-field-input"
            placeholder="e.g. my-org (leave empty for user repos only)"
            value={ghOrg}
            onChange={(e) => setGhOrg(e.target.value)}
          />
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">API Base URL</span>
          <input
            type="text"
            className="cmd-palette-field-input"
            placeholder="https://api.github.com"
            value={ghBaseUrl}
            onChange={(e) => setGhBaseUrl(e.target.value)}
          />
          <span className="cmd-palette-field-hint">
            For GitHub Enterprise: https://github.yourcompany.com/api/v3
          </span>
        </label>
        <label className="cmd-palette-checkbox">
          <input
            type="checkbox"
            checked={ghIncludeUser}
            onChange={(e) => setGhIncludeUser(e.target.checked)}
          />
          <span>Include personal repos (via /user/repos)</span>
        </label>

        <div className="cmd-palette-form-actions">
          <button
            className="cmd-palette-action-btn cmd-palette-action-btn--primary"
            onClick={handleAddGitHub}
            disabled={(!ghOrg && !ghIncludeUser) || !ghToken.trim()}
          >
            Add Source
          </button>
          <button className="cmd-palette-action-btn" onClick={() => setView(VIEW_SETTINGS)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderGenericForm = (isEdit) => (
    <div className="cmd-palette-inner">
      <div className="cmd-palette-header">
        <button className="cmd-palette-back-btn" onClick={() => { resetGenericForm(); setView(VIEW_SETTINGS); }}>
          &larr;
        </button>
        <span className="cmd-palette-header-title">{isEdit ? 'Edit' : 'Add'} API Source</span>
      </div>

      <div className="cmd-palette-form" style={{ maxHeight: maxListHeight }}>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Label</span>
          <input type="text" className="cmd-palette-field-input" placeholder="e.g. Jira Projects" value={genLabel} onChange={(e) => setGenLabel(e.target.value)} />
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Fetch URL</span>
          <input type="text" className="cmd-palette-field-input" placeholder="https://api.example.com/items" value={genFetchUrl} onChange={(e) => setGenFetchUrl(e.target.value)} />
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Headers (JSON)</span>
          <textarea className="cmd-palette-field-textarea" placeholder='{"Authorization": "Bearer ..."}' value={genHeaders} onChange={(e) => setGenHeaders(e.target.value)} rows={3} />
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Result Path</span>
          <input type="text" className="cmd-palette-field-input" placeholder="$ (root array) or data.items" value={genResultPath} onChange={(e) => setGenResultPath(e.target.value)} />
          <span className="cmd-palette-field-hint">Dot-notation path to the array in the JSON response. Use $ for root.</span>
        </label>
        <div className="cmd-palette-field-row">
          <label className="cmd-palette-field cmd-palette-field--half">
            <span className="cmd-palette-field-label">Name Field</span>
            <input type="text" className="cmd-palette-field-input" placeholder="name" value={genNameField} onChange={(e) => setGenNameField(e.target.value)} />
          </label>
          <label className="cmd-palette-field cmd-palette-field--half">
            <span className="cmd-palette-field-label">Description Field</span>
            <input type="text" className="cmd-palette-field-input" placeholder="(optional)" value={genDescField} onChange={(e) => setGenDescField(e.target.value)} />
          </label>
        </div>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">URL Template</span>
          <input type="text" className="cmd-palette-field-input" placeholder="https://example.com/{id}" value={genUrlTemplate} onChange={(e) => setGenUrlTemplate(e.target.value)} />
          <span className="cmd-palette-field-hint">Use &#123;fieldName&#125; placeholders from the response items.</span>
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Pagination</span>
          <select className="cmd-palette-field-input" value={genPagination} onChange={(e) => setGenPagination(e.target.value)}>
            <option value="none">None</option>
            <option value="link-header">Link Header (GitHub-style)</option>
            <option value="offset">Offset / Limit</option>
          </select>
        </label>

        <div className="cmd-palette-form-actions">
          <button
            className="cmd-palette-action-btn cmd-palette-action-btn--primary"
            onClick={isEdit ? handleEditGenericSave : handleAddGeneric}
            disabled={!genFetchUrl}
          >
            {isEdit ? 'Save' : 'Add Source'}
          </button>
          <button className="cmd-palette-action-btn" onClick={() => { resetGenericForm(); setView(VIEW_SETTINGS); }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderRssForm = (isEdit) => (
    <div className="cmd-palette-inner">
      <div className="cmd-palette-header">
        <button className="cmd-palette-back-btn" onClick={() => { resetRssForm(); setView(VIEW_SETTINGS); }}>
          &larr;
        </button>
        <span className="cmd-palette-header-title">{isEdit ? 'Edit' : 'Add'} RSS Feed</span>
      </div>

      <div className="cmd-palette-form" style={{ maxHeight: maxListHeight }}>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Label</span>
          <input type="text" className="cmd-palette-field-input" placeholder="e.g. Hacker News" value={rssLabel} onChange={(e) => setRssLabel(e.target.value)} />
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Feed URL</span>
          <input type="text" className="cmd-palette-field-input" placeholder="https://example.com/feed.xml" value={rssFeedUrl} onChange={(e) => setRssFeedUrl(e.target.value)} />
          <span className="cmd-palette-field-hint">
            Supports RSS 2.0 and Atom feeds. Each item&rsquo;s title, description, and link will be extracted automatically.
          </span>
        </label>
        <label className="cmd-palette-field">
          <span className="cmd-palette-field-label">Refresh Interval</span>
          <select className="cmd-palette-field-input" value={rssSyncInterval} onChange={(e) => setRssSyncInterval(e.target.value)}>
            <option value="900000">Every 15 minutes</option>
            <option value="1800000">Every 30 minutes</option>
            <option value="3600000">Every hour</option>
            <option value="14400000">Every 4 hours</option>
            <option value="43200000">Every 12 hours</option>
            <option value="86400000">Once a day</option>
            <option value="604800000">Once a week</option>
          </select>
        </label>

        <div className="cmd-palette-form-actions">
          <button
            className="cmd-palette-action-btn cmd-palette-action-btn--primary"
            onClick={isEdit ? handleEditRssSave : handleAddRss}
            disabled={!rssFeedUrl}
          >
            {isEdit ? 'Save' : 'Add Feed'}
          </button>
          <button className="cmd-palette-action-btn" onClick={() => { resetRssForm(); setView(VIEW_SETTINGS); }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="cmd-palette-overlay" ref={overlayRef} onMouseDown={handleOverlayClick}>
      <div className="cmd-palette">
        {view === VIEW_SEARCH && renderSearch()}
        {view === VIEW_SETTINGS && renderSettings()}
        {view === VIEW_ADD_GITHUB && renderAddGitHub()}
        {view === VIEW_ADD_GENERIC && renderGenericForm(false)}
        {view === VIEW_EDIT_GENERIC && renderGenericForm(true)}
        {view === VIEW_ADD_RSS && renderRssForm(false)}
        {view === VIEW_EDIT_RSS && renderRssForm(true)}
      </div>
    </div>
  );
};

export default CommandPalette;
