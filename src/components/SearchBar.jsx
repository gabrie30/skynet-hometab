import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  buildConfigLinkIndex,
  useBookmarks,
  useHistorySearch,
  useRecentlyClosed,
} from '../searchSources';

const SHORTCUT_KEY = '.';
const RESULTS_ITEM_HEIGHT = 48;
const RESULTS_PADDING = 8;
const RESULTS_TAB_BAR_HEIGHT = 32;
const RESULTS_MIN_VISIBLE = 3;
const VIEWPORT_BOTTOM_MARGIN = 16;

const CATEGORY_LABELS = {
  column: 'Column',
  dropdown: 'Dropdown',
  navbar: 'Navbar',
  tabset: 'Tab Set',
  bookmark: 'Bookmark',
  history: 'History',
  closed: 'Closed Tab',
};

function useAvailableHeight(containerRef, open) {
  const [maxHeight, setMaxHeight] = useState(400);

  const recalc = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const bottomOfInput = rect.bottom + 6;
    const available = window.innerHeight - bottomOfInput - VIEWPORT_BOTTOM_MARGIN;
    const minHeight = RESULTS_ITEM_HEIGHT * RESULTS_MIN_VISIBLE + RESULTS_PADDING + RESULTS_TAB_BAR_HEIGHT;
    setMaxHeight(Math.max(available, minHeight));
  }, [containerRef]);

  useEffect(() => {
    if (!open) return;
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [open, recalc]);

  return maxHeight;
}

const TAB_LINKS = 'links';
const TAB_HISTORY = 'history';
const TAB_CLOSED = 'closed';
const TABS_ORDER = [TAB_LINKS, TAB_HISTORY, TAB_CLOSED];

const SearchBar = ({ config, openLinksInNewTab = true, editing, searchBookmarks = true, searchHistory = true }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(TAB_LINKS);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const maxHeight = useAvailableHeight(containerRef, open);
  const historyResults = useHistorySearch(query, searchHistory);
  const recentlyClosedEntries = useRecentlyClosed();
  const bookmarkEntries = useBookmarks(searchBookmarks);

  const configIndex = useMemo(() => buildConfigLinkIndex(config), [config]);
  const linkIndex = useMemo(
    () => [...configIndex, ...bookmarkEntries],
    [configIndex, bookmarkEntries],
  );

  const linkResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return linkIndex.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        entry.url.toLowerCase().includes(q) ||
        (entry.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [query, linkIndex]);

  const closedResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return recentlyClosedEntries.filter(
      (entry) => entry.name.toLowerCase().includes(q) || entry.url.toLowerCase().includes(q),
    );
  }, [query, recentlyClosedEntries]);

  const resultsByTab = { [TAB_LINKS]: linkResults, [TAB_HISTORY]: historyResults, [TAB_CLOSED]: closedResults };
  const visibleResults = resultsByTab[activeTab] || [];
  const hasLinkResults = linkResults.length > 0;
  const hasHistoryResults = historyResults.length > 0;
  const hasClosedResults = closedResults.length > 0;
  const hasAnyResults = hasLinkResults || hasHistoryResults || hasClosedResults;
  const showTabs = query.trim() && (searchHistory || hasClosedResults);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleResults]);

  useEffect(() => {
    if (!query.trim()) {
      setActiveTab(TAB_LINKS);
    }
  }, [query]);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (editing) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (document.activeElement !== inputRef.current) return;
      }
      if (e.key === SHORTCUT_KEY && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        e.preventDefault();
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [editing]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('.search-result--active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const navigate = (url) => {
    if (openLinksInNewTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Tab' && showTabs && open) {
      e.preventDefault();
      const curIdx = TABS_ORDER.indexOf(activeTab);
      const nextIdx = (curIdx + (e.shiftKey ? TABS_ORDER.length - 1 : 1)) % TABS_ORDER.length;
      setActiveTab(TABS_ORDER[nextIdx]);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, visibleResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && visibleResults.length > 0) {
      e.preventDefault();
      navigate(visibleResults[activeIndex].url);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  if (editing) return null;

  const showDropdown = open && query.trim();

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={'Search links\u2026  press  .  to focus'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
        />
      </div>
      {showDropdown && hasAnyResults && (
        <div className="search-results" style={{ maxHeight }}>
          {showTabs && (
            <div className="search-tabs">
              <button
                className={`search-tab ${activeTab === TAB_LINKS ? 'search-tab--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setActiveTab(TAB_LINKS); }}
              >
                Links
              </button>
              <button
                className={`search-tab ${activeTab === TAB_HISTORY ? 'search-tab--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setActiveTab(TAB_HISTORY); }}
              >
                History
              </button>
              <button
                className={`search-tab ${activeTab === TAB_CLOSED ? 'search-tab--active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); setActiveTab(TAB_CLOSED); }}
              >
                Closed
              </button>
              <span className="search-tab-hint">Tab to switch</span>
            </div>
          )}
          {visibleResults.length > 0 ? (
            <ul className="search-results-list" ref={listRef} role="listbox">
              {visibleResults.map((entry, i) => (
                <li
                  key={`${entry.category}-${entry.url}-${i}`}
                  className={`search-result ${i === activeIndex ? 'search-result--active' : ''}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    navigate(entry.url);
                  }}
                >
                  <div className="search-result-main">
                    <span className="search-result-name">{entry.name}</span>
                    <span className="search-result-url">{entry.url}</span>
                  </div>
                  <div className="search-result-meta">
                    <span className="search-result-category">{entry.categoryName}</span>
                    <span className={`search-result-badge search-result-badge--${entry.category}`}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="search-no-results-inline">
              No {activeTab === TAB_LINKS ? 'links' : activeTab === TAB_HISTORY ? 'history' : 'closed tabs'} found
            </div>
          )}
        </div>
      )}
      {showDropdown && !hasAnyResults && (
        <div className="search-results search-no-results">
          No results found for &ldquo;{query.trim()}&rdquo;
        </div>
      )}
    </div>
  );
};

export default SearchBar;
