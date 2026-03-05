import React from 'react';
import TabSetSelector from './TabSetSelector';

const Footer = ({
  editing,
  onToggleEdit,
  onSave,
  onCancel,
  onExport,
  onImport,
  onBackup,
  onRestore,
  hasGistToken,
  onSetGistToken,
  onClearGistToken,
  profileSwitcher,
  todoVisible,
  onStartTodo,
  tabSets,
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
        <span className="footer-divider">|</span>
        {hasGistToken ? (
          <>
            <span className="footer-gist-status">Auto-sync to Gist: on</span>
            <button className="footer-btn import-btn" onClick={onClearGistToken}>Clear GitHub Token</button>
          </>
        ) : (
          <button className="footer-btn export-btn" onClick={onSetGistToken}>Set GitHub Token (auto-sync on Save)</button>
        )}
      </div>
    );
  }

  const tabSetList = Array.isArray(tabSets) ? tabSets : [];
  const hasTabSets = tabSetList.length > 0;

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
      {hasTabSets && (
        <>
          <span className="footer-divider">|</span>
          <TabSetSelector tabSets={tabSetList} />
        </>
      )}
    </div>
  );
};

export default Footer;
