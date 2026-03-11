import React from 'react';

const Navbar = ({ navbar, editing, onUpdate, openLinksInNewTab = true }) => {
  const handleChange = (side, field, value) => {
    onUpdate({
      ...navbar,
      [side]: { ...navbar[side], [field]: value },
    });
  };

  const renderButton = (side, className) => {
    const btn = navbar[side];
    if (editing) {
      const label = side === 'left' ? 'Nav Left' : 'Nav Right';
      return (
        <div className={className}>
          <div className="nav-edit-group edit-section edit-section--navbar">
            <span className="edit-section-badge edit-section-badge--navbar">{label}</span>
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
      {renderButton('right', 'nav-button-right')}
    </div>
  );
};

export default Navbar;
