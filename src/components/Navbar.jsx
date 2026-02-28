import React from 'react';

const Navbar = ({ navbar, editing, onUpdate }) => {
  const handleChange = (side, field, value) => {
    onUpdate({
      ...navbar,
      [side]: { ...navbar[side], [field]: value },
    });
  };

  const renderButton = (side, className) => {
    const btn = navbar[side];
    if (editing) {
      return (
        <div className={className}>
          <div className="nav-edit-group">
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

    return (
      <div className={className}>
        <a className="nav-button" href={btn.url} target="_blank" rel="noopener noreferrer">{btn.name}</a>
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
