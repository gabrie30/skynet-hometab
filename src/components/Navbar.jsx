import React, { useState } from 'react';
import SearchBar from './SearchBar';

const parseTags = (str) =>
  str.split(',').map((s) => s.trim()).filter(Boolean);

const Navbar = ({ navbar, editing, onUpdate, openLinksInNewTab = true, config, searchBookmarks = true, searchHistory = true }) => {
  const [expandedTags, setExpandedTags] = useState({ left: false, right: false });

  const handleChange = (side, field, value) => {
    if (field === 'tags') {
      const tags = parseTags(value);
      onUpdate({
        ...navbar,
        [side]: { ...navbar[side], tags: tags.length ? tags : undefined },
      });
      return;
    }
    onUpdate({
      ...navbar,
      [side]: { ...navbar[side], [field]: value },
    });
  };

  const renderButton = (side, className) => {
    const btn = navbar[side];
    const hasTags = (btn.tags ?? []).length > 0;
    const showTags = expandedTags[side] || hasTags;
    if (editing) {
      const label = side === 'left' ? 'Nav Left' : 'Nav Right';
      return (
        <div className={className}>
          <div className="nav-edit-group edit-section edit-section--navbar">
            <span className="edit-section-badge edit-section-badge--navbar">{label}</span>
            <div className="nav-edit-fields">
              <div className="nav-edit-fields-row">
                <input
                  type="text"
                  className="nav-edit-input"
                  value={btn.name}
                  onChange={(e) => handleChange(side, 'name', e.target.value)}
                  placeholder="Label"
                />
                <input
                  type="text"
                  className="nav-edit-input"
                  value={btn.url}
                  onChange={(e) => handleChange(side, 'url', e.target.value)}
                  placeholder="URL"
                />
                <button
                  className={`tags-toggle-btn ${hasTags ? 'tags-toggle-btn--active' : ''}`}
                  onClick={() => setExpandedTags((prev) => ({ ...prev, [side]: !prev[side] }))}
                  title="Edit search tags"
                  type="button"
                >
                  #
                </button>
              </div>
              {showTags && (
                <input
                  type="text"
                  className="nav-edit-input nav-edit-tags-input"
                  value={(btn.tags ?? []).join(', ')}
                  onChange={(e) => handleChange(side, 'tags', e.target.value)}
                  placeholder="Search tags (comma-separated)"
                  title="Comma-separated search tags"
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    if (openLinksInNewTab) {
      return (
        <div className={className}>
          <a className="nav-button" href={btn.url} target="_blank" rel="noopener noreferrer">{btn.name}</a>
        </div>
      );
    }
    return (
      <div className={className}>
        <a className="nav-button" href={btn.url} rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.location.href = btn.url; }}>{btn.name}</a>
      </div>
    );
  };

  return (
    <div className="navbar">
      {renderButton('left', 'nav-button-left')}
      <SearchBar config={config} openLinksInNewTab={openLinksInNewTab} editing={editing} searchBookmarks={searchBookmarks} searchHistory={searchHistory} />
      {renderButton('right', 'nav-button-right')}
    </div>
  );
};

export default Navbar;
