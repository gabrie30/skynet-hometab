import React from 'react';

const Footer = ({
  editing,
  onToggleEdit,
  onSave,
  onCancel,
  onResetDefaults,
  onExport,
  onImport,
  profileSwitcher,
  todoVisible,
  onStartTodo,
}) => {
  if (editing) {
    return (
      <div className="footer footer-editing">
        {profileSwitcher}
        <span className="footer-divider">|</span>
        <button className="footer-btn save-btn" onClick={onSave}>Save</button>
        <button className="footer-btn cancel-btn" onClick={onCancel}>Cancel</button>
        <button className="footer-btn reset-btn" onClick={onResetDefaults}>
          Update to New Default
        </button>
        <button className="footer-btn export-btn" onClick={onExport}>Export</button>
        <button className="footer-btn import-btn" onClick={onImport}>Import</button>
      </div>
    );
  }

  return (
    <div className="footer">
      {profileSwitcher}
      <span className="footer-divider">|</span>
      <button className="footer-edit-btn" onClick={onToggleEdit}>
        update
      </button>
      {!todoVisible && (
        <>
          <span className="footer-divider">|</span>
          <button className="footer-edit-btn" onClick={onStartTodo}>
            todo
          </button>
        </>
      )}
    </div>
  );
};

export default Footer;
