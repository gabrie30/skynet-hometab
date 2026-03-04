import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Title from './components/Title';
import Dropdowns from './components/Dropdowns';
import ProfileSwitcher from './components/ProfileSwitcher';
import LinkColumn from './components/LinkColumn';
import TodoList from './components/TodoList';
import TabSetsEdit from './components/TabSetsEdit';
import Footer from './components/Footer';
import { loadOrSeedConfig, saveConfig, exportConfig, importConfig, nextProfileId, getEmptyConfig, saveGistId, loadGistId, ensurePerProfileTodos } from './storage';
import { backupToGist, restoreFromGist } from './gist';
import './styles.css';

let idCounter = Date.now();
const nextId = () => `col_${idCounter++}`;

const App = () => {
  const [appData, setAppData] = useState(null);
  const [editConfig, setEditConfig] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTodo, setShowTodo] = useState(false);

  useEffect(() => {
    loadOrSeedConfig().then((loaded) => {
      setAppData(loaded);
      setLoading(false);
    });
  }, []);

  const getActiveProfile = (data) => {
    if (!data) return null;
    return data.profiles.find((p) => p.id === data.activeProfileId) || data.profiles[0];
  };

  const activeProfile = getActiveProfile(appData);
  const activeConfig = editing ? editConfig : activeProfile?.config;

  const updateActiveProfileConfig = (newConfig) => {
    const profiles = appData.profiles.map((p) =>
      p.id === appData.activeProfileId ? { ...p, config: newConfig } : p,
    );
    const updated = { ...appData, profiles };
    setAppData(updated);
    return updated;
  };

  // --- Profile management ---

  const handleSwitchProfile = async (profileId) => {
    if (editing) return;
    const targetProfile = appData.profiles.find((p) => p.id === profileId);
    if (targetProfile && (!targetProfile.todos || targetProfile.todos.length === 0)) {
      setShowTodo(false);
    }
    const updated = { ...appData, activeProfileId: profileId };
    setAppData(updated);
    await saveConfig(updated);
  };

  const handleAddProfile = async (name) => {
    const id = nextProfileId();
    const newProfile = { id, name, config: getEmptyConfig(), todos: [] };
    const updated = {
      activeProfileId: id,
      profiles: [...appData.profiles, newProfile],
    };
    setAppData(updated);
    setEditConfig(newProfile.config);
    await saveConfig(updated);
  };

  const handleRenameProfile = async (profileId, newName) => {
    const profiles = appData.profiles.map((p) =>
      p.id === profileId ? { ...p, name: newName } : p,
    );
    const updated = { ...appData, profiles };
    setAppData(updated);
    await saveConfig(updated);
  };

  const handleDeleteProfile = async (profileId) => {
    if (appData.profiles.length <= 1) return;
    if (!window.confirm('Delete this profile? This cannot be undone.')) return;

    const profiles = appData.profiles.filter((p) => p.id !== profileId);
    const activeProfileId = profileId === appData.activeProfileId
      ? profiles[0].id
      : appData.activeProfileId;
    const updated = { activeProfileId, profiles };
    setAppData(updated);
    setEditConfig(null);
    setEditing(false);
    await saveConfig(updated);
  };

  // --- Edit mode ---

  const handleToggleEdit = () => {
    setEditConfig(JSON.parse(JSON.stringify(activeProfile.config)));
    setEditing(true);
  };

  const handleSave = async () => {
    const updated = updateActiveProfileConfig(editConfig);
    await saveConfig(updated);
    setEditConfig(null);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditConfig(null);
    setEditing(false);
  };

  // --- Todo list (per profile) ---

  const todos = Array.isArray(activeProfile?.todos) ? activeProfile.todos : [];

  const updateActiveProfileTodos = (newTodos) => {
    const profiles = appData.profiles.map((p) =>
      p.id === appData.activeProfileId ? { ...p, todos: newTodos } : p,
    );
    return { ...appData, profiles };
  };

  const handleAddTodo = async (text) => {
    const todo = { id: `todo_${Date.now()}`, text };
    const updated = updateActiveProfileTodos([...todos, todo]);
    setAppData(updated);
    await saveConfig(updated);
  };

  const handleRemoveTodo = async (id) => {
    const remaining = todos.filter((t) => t.id !== id);
    const updated = updateActiveProfileTodos(remaining);
    setAppData(updated);
    await saveConfig(updated);
    if (remaining.length === 0) setShowTodo(false);
  };

  const todoVisible = showTodo || todos.length > 0;

  const getCurrentAppData = () => {
    if (!editing || !editConfig) return appData;
    const profiles = appData.profiles.map((p) =>
      p.id === appData.activeProfileId ? { ...p, config: editConfig } : p,
    );
    return { ...appData, profiles };
  };

  const handleExport = () => {
    exportConfig(getCurrentAppData());
  };

  const handleImport = async () => {
    if (!window.confirm('Import will replace ALL profiles. Continue?')) return;
    try {
      const imported = await importConfig();
      const normalized = ensurePerProfileTodos(imported);
      setAppData(normalized);
      await saveConfig(normalized);
      setEditConfig(null);
      setEditing(false);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };

  const handleBackup = async () => {
    const token = window.prompt('Enter your GitHub Personal Access Token (needs "gist" scope):');
    if (!token) return;
    try {
      const dataToBackup = getCurrentAppData();
      const existingGistId = await loadGistId();
      const { id, url } = await backupToGist(token, dataToBackup, existingGistId);
      await saveGistId(id);
      alert(`Backup saved!\n${url}`);
    } catch (err) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  const handleRestore = async () => {
    const token = window.prompt('Enter your GitHub Personal Access Token (needs "gist" scope):');
    if (!token) return;
    try {
      const gistId = await loadGistId();
      if (!gistId) {
        alert('No backup found. Back up your config first.');
        return;
      }
      if (!window.confirm('Restore will replace ALL profiles with the backup. Continue?')) return;
      const restored = await restoreFromGist(token, gistId);
      setAppData(restored);
      await saveConfig(restored);
      setEditConfig(null);
      setEditing(false);
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  // --- Column / Navbar / Dropdown handlers ---

  const handleColumnUpdate = (index, updated) => {
    const columns = [...activeConfig.columns];
    columns[index] = updated;
    setEditConfig({ ...editConfig, columns });
  };

  const handleColumnRemove = (index) => {
    const columns = activeConfig.columns.filter((_, i) => i !== index);
    setEditConfig({ ...editConfig, columns });
  };

  const handleAddColumn = () => {
    const columns = [
      ...activeConfig.columns,
      { id: nextId(), heading: 'New Column', links: [] },
    ];
    setEditConfig({ ...editConfig, columns });
  };

  const handleColumnReorder = (sourceId, targetId) => {
    const columns = [...activeConfig.columns];
    const srcIdx = columns.findIndex((c) => c.id === sourceId);
    const tgtIdx = columns.findIndex((c) => c.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1 || srcIdx === tgtIdx) return;
    const [moved] = columns.splice(srcIdx, 1);
    columns.splice(tgtIdx, 0, moved);
    setEditConfig({ ...editConfig, columns });
  };

  const handleLinkMoveBetweenColumns = (srcColId, srcLinkIdx, tgtColId, tgtLinkIdx) => {
    const columns = activeConfig.columns.map((c) => ({ ...c, links: [...c.links] }));
    const srcCol = columns.find((c) => c.id === srcColId);
    const tgtCol = columns.find((c) => c.id === tgtColId);
    if (!srcCol || !tgtCol) return;
    const [link] = srcCol.links.splice(srcLinkIdx, 1);
    tgtCol.links.splice(tgtLinkIdx, 0, link);
    setEditConfig({ ...editConfig, columns });
  };

  const handleTitleImageUpdate = (titleImage) => {
    setEditConfig({ ...editConfig, titleImage });
  };

  const handleNavbarUpdate = (navbar) => {
    setEditConfig({ ...editConfig, navbar });
  };

  const handleDropdownsUpdate = (dropdowns) => {
    setEditConfig({ ...editConfig, dropdowns });
  };

  const handleAddDropdown = () => {
    const dropdowns = [
      ...activeConfig.dropdowns,
      { id: nextId(), heading: 'New Dropdown', urlTemplate: 'https://example.com/{item}', items: [] },
    ];
    setEditConfig({ ...editConfig, dropdowns });
  };

  const handleTabSetsUpdate = (tabSets) => {
    setEditConfig({ ...editConfig, tabSets });
  };

  const handleAddTabSet = () => {
    const tabSets = [
      ...(activeConfig.tabSets || []),
      { id: nextId(), name: 'New set', urls: [] },
    ];
    setEditConfig({ ...editConfig, tabSets });
  };

  if (loading || !activeConfig) return null;

  return (
    <div>
      <Navbar
        navbar={activeConfig.navbar}
        editing={editing}
        onUpdate={handleNavbarUpdate}
      />
      <Title
        imageUrl={activeConfig.titleImage}
        editing={editing}
        onUpdate={handleTitleImageUpdate}
      />
      <Dropdowns
        dropdowns={activeConfig.dropdowns}
        editing={editing}
        onUpdate={handleDropdownsUpdate}
      />
      {editing && (
        <div className="add-dropdown-row">
          <button className="add-column-btn" onClick={handleAddDropdown}>
            + Add Dropdown
          </button>
        </div>
      )}
      {editing && (activeConfig.tabSets || []).length > 0 && (
        <div className="tabset-edit-wrapper">
          <TabSetsEdit
            tabSets={activeConfig.tabSets}
            onUpdate={handleTabSetsUpdate}
          />
        </div>
      )}
      {editing && (
        <div className="add-dropdown-row">
          <button className="add-column-btn" onClick={handleAddTabSet}>
            + Add Tab Set
          </button>
        </div>
      )}
      <div className="link_group">
        {activeConfig.columns.map((col, index) => (
          <LinkColumn
            key={col.id}
            column={col}
            editing={editing}
            onUpdate={(updated) => handleColumnUpdate(index, updated)}
            onRemove={() => handleColumnRemove(index)}
            onColumnDrop={handleColumnReorder}
            onLinkDropFromOther={handleLinkMoveBetweenColumns}
          />
        ))}
        {editing && (
          <div className="monitoring_links add-column-placeholder">
            <button className="add-column-btn" onClick={handleAddColumn}>
              + Add Column
            </button>
          </div>
        )}
      </div>
      {todoVisible && (
        <TodoList
          todos={todos}
          onAdd={handleAddTodo}
          onRemove={handleRemoveTodo}
          onMinimize={() => setShowTodo(false)}
        />
      )}
      <Footer
        editing={editing}
        onToggleEdit={handleToggleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onExport={handleExport}
        onImport={handleImport}
        onBackup={handleBackup}
        onRestore={handleRestore}
        todoVisible={todoVisible}
        onStartTodo={() => setShowTodo(true)}
        tabSets={activeConfig.tabSets}
        profileSwitcher={
          <ProfileSwitcher
            profiles={appData.profiles}
            activeProfileId={appData.activeProfileId}
            editing={editing}
            onSwitch={handleSwitchProfile}
            onAdd={handleAddProfile}
            onRename={handleRenameProfile}
            onDelete={handleDeleteProfile}
          />
        }
      />
    </div>
  );
};

export default App;
