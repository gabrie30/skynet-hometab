import React, { useState, useRef, useEffect } from 'react';

const ProfileSwitcher = ({
  profiles,
  activeProfileId,
  editing,
  onSwitch,
  onAdd,
  onRename,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setAdding(false);
        setRenaming(false);
        setInputValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (profileId) => {
    onSwitch(profileId);
    setOpen(false);
  };

  const handleAdd = () => {
    const name = inputValue.trim();
    if (!name) return;
    onAdd(name);
    setInputValue('');
    setAdding(false);
    setOpen(false);
  };

  const handleRename = () => {
    const name = inputValue.trim();
    if (!name) return;
    onRename(activeProfileId, name);
    setInputValue('');
    setRenaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (adding) handleAdd();
      else if (renaming) handleRename();
    } else if (e.key === 'Escape') {
      setAdding(false);
      setRenaming(false);
      setInputValue('');
    }
  };

  const startAdding = () => {
    setRenaming(false);
    setInputValue('');
    setAdding(true);
  };

  const startRenaming = () => {
    setAdding(false);
    setInputValue(activeProfile?.name || '');
    setRenaming(true);
  };

  return (
    <div className="profile-footer-container" ref={containerRef}>
      {open && (
        <div className="profile-popover">
          <ul className="profile-list">
            {profiles.map((p) => (
              <li key={p.id} className="profile-list-item">
                <button
                  className={`profile-list-btn${p.id === activeProfileId ? ' profile-list-btn-active' : ''}`}
                  onClick={() => handleSelect(p.id)}
                >
                  {p.name}
                </button>
                {editing && (
                  <button
                    className="profile-list-delete"
                    onClick={() => onDelete(p.id)}
                    disabled={profiles.length <= 1}
                    title={profiles.length <= 1 ? 'Cannot delete the only profile' : 'Delete profile'}
                  >
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editing && (
            <div className="profile-popover-actions">
              {(adding || renaming) ? (
                <div className="profile-popover-input-row">
                  <input
                    type="text"
                    className="profile-popover-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={adding ? 'Profile name' : 'New name'}
                    autoFocus
                  />
                  <button className="profile-popover-confirm" onClick={adding ? handleAdd : handleRename}>
                    &#10003;
                  </button>
                  <button
                    className="profile-popover-cancel"
                    onClick={() => { setAdding(false); setRenaming(false); setInputValue(''); }}
                  >
                    &#10005;
                  </button>
                </div>
              ) : (
                <div className="profile-popover-btns">
                  <button className="profile-popover-action" onClick={startAdding}>+ New</button>
                  <button className="profile-popover-action" onClick={startRenaming}>Rename</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="profile-footer-inline">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`profile-pill${p.id === activeProfileId ? ' profile-pill-active' : ''}`}
            onClick={() => handleSelect(p.id)}
            title={`Switch to ${p.name}`}
          >
            {p.name}
          </button>
        ))}
        {editing && (
          <button
            type="button"
            className="footer-edit-btn profile-manage-btn"
            onClick={() => setOpen(!open)}
            title="Manage profiles"
            aria-label="Manage profiles"
          >
            manage
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileSwitcher;
