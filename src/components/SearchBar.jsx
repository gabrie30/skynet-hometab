import React, { useState, useEffect, useRef, useMemo } from 'react';

const SHORTCUT_KEY = '.';

/**
 * Builds a flat, searchable index from the active profile config.
 * Each entry: { name, url, category, categoryName }
 *   category     – "column" | "dropdown" | "navbar" | "tabset"
 *   categoryName – e.g. "Cloud Platforms", "AWS Services", "Nav Left"
 */
function buildSearchIndex(config) {
  if (!config) return [];
  const entries = [];

  (config.columns ?? []).forEach((col) => {
    (col.links ?? []).forEach((link) => {
      entries.push({
        name: link.name,
        url: link.url,
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
        category: 'navbar',
        categoryName: 'Nav Left',
      });
    }
    if (config.navbar.right?.url) {
      entries.push({
        name: config.navbar.right.name,
        url: config.navbar.right.url,
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
        category: 'tabset',
        categoryName: ts.name,
      });
    });
  });

  return entries;
}

const CATEGORY_LABELS = {
  column: 'Column',
  dropdown: 'Dropdown',
  navbar: 'Navbar',
  tabset: 'Tab Set',
};

const SearchBar = ({ config, openLinksInNewTab = true, editing }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const index = useMemo(() => buildSearchIndex(config), [config]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.filter(
      (entry) => entry.name.toLowerCase().includes(q),
    );
  }, [query, index]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      navigate(results[activeIndex].url);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  if (editing) return null;

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
      {open && results.length > 0 && (
        <ul className="search-results" ref={listRef} role="listbox">
          {results.map((entry, i) => (
            <li
              key={`${entry.url}-${i}`}
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
      )}
      {open && query.trim() && results.length === 0 && (
        <div className="search-results search-no-results">
          No links found for &ldquo;{query.trim()}&rdquo;
        </div>
      )}
    </div>
  );
};

export default SearchBar;
