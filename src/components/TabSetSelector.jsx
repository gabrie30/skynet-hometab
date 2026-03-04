import React, { useState, useRef, useEffect } from 'react';

/** Normalize url: no scheme → https://; http:// → https://. */
function toAbsoluteUrl(url) {
  const u = (url || '').trim();
  if (!u) return '';
  if (/^https:\/\//i.test(u)) return u;
  if (/^http:\/\//i.test(u)) return 'https://' + u.slice(7);
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return u; // other scheme (e.g. file:) leave as-is
  return 'https://' + u;
}

/**
 * Footer button "tabset" that toggles a list of tab sets; clicking one opens all its URLs.
 */
const TabSetSelector = ({ tabSets }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSet = (set) => {
    if (set && Array.isArray(set.urls)) {
      set.urls.forEach((link) => {
        const url = toAbsoluteUrl(link.url);
        if (url) window.open(url, '_blank');
      });
    }
    setOpen(false);
  };

  if (!tabSets || tabSets.length === 0) return null;

  const singleSet = tabSets.length === 1;

  const handleButtonClick = () => {
    if (singleSet) {
      handleSelectSet(tabSets[0]);
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <div className="tabset-footer-container" ref={containerRef}>
        <button
          type="button"
          className="footer-edit-btn"
          onClick={handleButtonClick}
        >
          tabset
        </button>
        {!singleSet && open && (
          <div className="profile-popover tabset-popover">
            <ul className="profile-list">
              {tabSets.map((set) => (
                <li key={set.id} className="profile-list-item">
                  <button
                    type="button"
                    className="profile-list-btn"
                    onClick={() => handleSelectSet(set)}
                  >
                    {set.name || 'Unnamed set'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
  );
};

export default TabSetSelector;
