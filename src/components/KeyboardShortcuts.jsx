import React, { useState, useRef, useEffect } from 'react';

const SHORTCUTS = [
  { keys: '⌘K', description: 'Open command palette (search everything)' },
  { keys: '⌘⇧K', description: 'Open command palette (Feeds filter)' },
  { keys: '.', description: 'Focus quick search bar' },
  { keys: 'Esc', description: 'Close search / cancel edit mode' },
  { keys: '1 – 9', description: 'Switch to profile by position' },
  { keys: 'Tab', description: 'Cycle filter / view in search' },
  { keys: '↑ ↓', description: 'Navigate search results' },
  { keys: 'Enter', description: 'Open selected search result' },
];

const KeyboardShortcuts = () => {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
  };

  const hide = () => {
    timerRef.current = setTimeout(() => setVisible(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="shortcuts-container"
      ref={containerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        className="shortcuts-trigger"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts"
        onFocus={show}
        onBlur={hide}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H5z" clipRule="evenodd" />
          <path d="M6 7a1 1 0 011-1h0a1 1 0 011 1v0a1 1 0 01-1 1h0a1 1 0 01-1-1v0zM9 7a1 1 0 011-1h0a1 1 0 011 1v0a1 1 0 01-1 1h0a1 1 0 01-1-1v0zM12 7a1 1 0 011-1h0a1 1 0 011 1v0a1 1 0 01-1 1h0a1 1 0 01-1-1v0zM7 10a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
          <path d="M5 15a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
        </svg>
      </button>
      {visible && (
        <div className="shortcuts-popover">
          <div className="shortcuts-title">Keyboard Shortcuts</div>
          <ul className="shortcuts-list">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="shortcuts-item">
                <kbd className="shortcuts-key">{s.keys}</kbd>
                <span className="shortcuts-desc">{s.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default KeyboardShortcuts;
