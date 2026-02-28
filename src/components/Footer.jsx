import React from 'react';

const Footer = ({
  editing,
  onToggleEdit,
  onSave,
  onCancel,
  onExport,
  onImport,
  onBackup,
  onRestore,
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
        <button className="footer-btn export-btn" onClick={onExport}>Export</button>
        <button className="footer-btn import-btn" onClick={onImport}>Import</button>
        <span className="footer-divider">|</span>
        <button className="footer-btn export-btn" onClick={onBackup}>GitHub Export</button>
        <button className="footer-btn import-btn" onClick={onRestore}>GitHub Import</button>
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
