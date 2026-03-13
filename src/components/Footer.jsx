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
  openLinksInNewTab,
  onToggleOpenLinksInNewTab,
  searchBookmarks,
  onToggleSearchBookmarks,
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
        <button
          type="button"
          className="footer-edit-btn"
          onClick={onToggleOpenLinksInNewTab}
          title={
            openLinksInNewTab
              ? 'Link behavior: column links, navbar, and dropdowns open in a new tab. Click to switch to opening in the current tab instead.'
              : 'Link behavior: column links, navbar, and dropdowns replace the current tab. Click to switch to opening in a new tab instead.'
          }
        >
          {openLinksInNewTab ? 'new tab' : 'current tab'}
        </button>
        <button
          type="button"
          className="footer-edit-btn"
          onClick={onToggleSearchBookmarks}
          title={
            searchBookmarks
              ? 'Chrome bookmarks are included in search results. Click to exclude them.'
              : 'Chrome bookmarks are excluded from search results. Click to include them.'
          }
        >
          {searchBookmarks ? 'bookmarks: on' : 'bookmarks: off'}
        </button>
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
