import React, { useState, useRef } from 'react';

const TABSET_LINK_TYPE = 'application/x-tabset-link';
const TABSET_GROUP_TYPE = 'application/x-tabset-group';

const parseTags = (str) =>
  str.split(',').map((s) => s.trim()).filter(Boolean);

const TabSetsEdit = ({ tabSets, onUpdate }) => {
  const [newLinkName, setNewLinkName] = useState({});
  const [newLinkUrl, setNewLinkUrl] = useState({});
  const [newLinkTags, setNewLinkTags] = useState({});
  const [showNewTags, setShowNewTags] = useState({});
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [dragSetId, setDragSetId] = useState(null);
  const [dropTargetSetId, setDropTargetSetId] = useState(null);
  const [dragLinkInfo, setDragLinkInfo] = useState(null);
  const [dropTargetLink, setDropTargetLink] = useState(null);
  const listDragCounter = useRef({});

  const tagKey = (setIdx, linkIdx) => `${setIdx}-${linkIdx}`;

  const toggleTagsExpanded = (setIdx, linkIdx) => {
    const key = tagKey(setIdx, linkIdx);
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSetNameChange = (setIndex, value) => {
    const updated = tabSets.map((s, i) =>
      i !== setIndex ? s : { ...s, name: value },
    );
    onUpdate(updated);
  };

  const handleRemoveSet = (setIndex) => {
    onUpdate(tabSets.filter((_, i) => i !== setIndex));
  };

  const handleLinkEdit = (setIndex, linkIndex, field, value) => {
    const updated = tabSets.map((s, i) => {
      if (i !== setIndex) return s;
      const urls = s.urls.map((link, j) => {
        if (j !== linkIndex) return link;
        if (field === 'tags') {
          const tags = parseTags(value);
          return tags.length ? { ...link, tags } : { ...link, tags: undefined };
        }
        return { ...link, [field]: value };
      });
      return { ...s, urls };
    });
    onUpdate(updated);
  };

  const handleRemoveLink = (setIndex, linkIndex) => {
    const updated = tabSets.map((s, i) => {
      if (i !== setIndex) return s;
      return { ...s, urls: s.urls.filter((_, j) => j !== linkIndex) };
    });
    onUpdate(updated);
  };

  const handleAddLink = (setIndex) => {
    const name = (newLinkName[setIndex] || '').trim();
    const url = (newLinkUrl[setIndex] || '').trim();
    if (!name || !url) return;

    const tags = parseTags(newLinkTags[setIndex] || '');
    const link = { name, url };
    if (tags.length) link.tags = tags;

    const updated = tabSets.map((s, i) => {
      if (i !== setIndex) return s;
      return { ...s, urls: [...s.urls, link] };
    });
    onUpdate(updated);
    setNewLinkName((prev) => ({ ...prev, [setIndex]: '' }));
    setNewLinkUrl((prev) => ({ ...prev, [setIndex]: '' }));
    setNewLinkTags((prev) => ({ ...prev, [setIndex]: '' }));
    setShowNewTags((prev) => ({ ...prev, [setIndex]: false }));
  };

  const handleLinkKeyDown = (e, setIndex) => {
    if (e.key === 'Enter') handleAddLink(setIndex);
  };

  // --- Set reorder (drag group) ---

  const handleSetDragStart = (e, setId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(TABSET_GROUP_TYPE, setId);
    setDragSetId(setId);
  };

  const handleSetDragOver = (e, setId) => {
    if (e.dataTransfer.types.includes(TABSET_GROUP_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTargetSetId(setId);
    }
  };

  const handleSetDrop = (e, targetId) => {
    e.preventDefault();
    setDragSetId(null);
    setDropTargetSetId(null);
    const sourceId = e.dataTransfer.getData(TABSET_GROUP_TYPE);
    if (!sourceId || sourceId === targetId) return;

    const srcIdx = tabSets.findIndex((s) => s.id === sourceId);
    const tgtIdx = tabSets.findIndex((s) => s.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const updated = [...tabSets];
    const [moved] = updated.splice(srcIdx, 1);
    updated.splice(tgtIdx, 0, moved);
    onUpdate(updated);
  };

  const handleSetDragEnd = () => {
    setDragSetId(null);
    setDropTargetSetId(null);
  };

  // --- Link reorder within set ---

  const handleLinkDragStart = (e, setIndex, linkIndex) => {
    e.stopPropagation();
    setDragLinkInfo({ setIndex, linkIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(TABSET_LINK_TYPE, JSON.stringify({ setIndex, linkIndex }));
  };

  const handleLinkDragOver = (e, setIndex, linkIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes(TABSET_LINK_TYPE)) {
      e.dataTransfer.dropEffect = 'move';
      setDropTargetLink({ setIndex, linkIndex });
    }
  };

  const handleLinkDrop = (e, setIndex, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetLink(null);
    setDragLinkInfo(null);

    const raw = e.dataTransfer.getData(TABSET_LINK_TYPE);
    if (!raw) return;
    const source = JSON.parse(raw);
    if (source.setIndex !== setIndex) return;

    const set = tabSets[setIndex];
    const urls = [...set.urls];
    const [moved] = urls.splice(source.linkIndex, 1);
    const insertAt = targetIndex > source.linkIndex ? targetIndex - 1 : targetIndex;
    urls.splice(insertAt, 0, moved);

    const updated = tabSets.map((s, i) =>
      i !== setIndex ? s : { ...s, urls },
    );
    onUpdate(updated);
  };

  const handleLinkDragEnd = () => {
    setDragLinkInfo(null);
    setDropTargetLink(null);
  };

  const handleListDragEnter = (e, setIndex) => {
    if (e.dataTransfer.types.includes(TABSET_LINK_TYPE)) {
      listDragCounter.current[setIndex] = (listDragCounter.current[setIndex] || 0) + 1;
    }
  };

  const handleListDragLeave = (setIndex) => {
    listDragCounter.current[setIndex] = (listDragCounter.current[setIndex] || 0) - 1;
    if (listDragCounter.current[setIndex] <= 0) {
      listDragCounter.current[setIndex] = 0;
      setDropTargetLink((prev) => (prev?.setIndex === setIndex ? null : prev));
    }
  };

  const handleListDrop = (e, setIndex) => {
    e.preventDefault();
    listDragCounter.current[setIndex] = 0;
    setDropTargetLink(null);

    const raw = e.dataTransfer.getData(TABSET_LINK_TYPE);
    if (!raw) return;
    const source = JSON.parse(raw);
    if (source.setIndex !== setIndex) return;

    const set = tabSets[setIndex];
    const urls = [...set.urls];
    const [moved] = urls.splice(source.linkIndex, 1);
    urls.push(moved);

    const updated = tabSets.map((s, i) =>
      i !== setIndex ? s : { ...s, urls },
    );
    onUpdate(updated);
  };

  if (!tabSets || tabSets.length === 0) return null;

  return (
    <div className="tabset-edit">
      <div className="tabset-edit-heading">Tab sets</div>
      {tabSets.map((set, i) => (
        <div
          key={set.id}
          className={[
            'dropdown-edit-group',
            'edit-section',
            'edit-section--tabset',
            dragSetId === set.id ? 'dropdown-group--dragging' : '',
            dropTargetSetId === set.id && dragSetId !== set.id ? 'column-drag-over' : '',
          ].filter(Boolean).join(' ')}
          onDragOver={(e) => handleSetDragOver(e, set.id)}
          onDrop={(e) => handleSetDrop(e, set.id)}
          onDragLeave={handleSetDragEnd}
        >
          <span className="edit-section-badge edit-section-badge--tabset">Tab Set</span>
          <div
            className="dropdown-edit-header link_heading--draggable"
            draggable
            onDragStart={(e) => handleSetDragStart(e, set.id)}
            onDragEnd={handleSetDragEnd}
          >
            <span className="drag-handle" title="Drag to reorder tab set">⠿</span>
            <input
              type="text"
              className="edit-heading-input"
              value={set.name}
              onChange={(e) => handleSetNameChange(i, e.target.value)}
              placeholder="Set name"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="remove-column-btn"
              onClick={() => handleRemoveSet(i)}
              title="Remove tab set"
            >
              &times;
            </button>
          </div>
          <ul
            className="dropdown-items-list"
            onDragEnter={(e) => handleListDragEnter(e, i)}
            onDragLeave={() => handleListDragLeave(i)}
            onDragOver={(e) => e.dataTransfer.types.includes(TABSET_LINK_TYPE) && e.preventDefault()}
            onDrop={(e) => handleListDrop(e, i)}
          >
            {(set.urls || []).map((link, j) => (
              <li
                key={j}
                className={[
                  'link',
                  dragLinkInfo?.setIndex === i && dragLinkInfo?.linkIndex === j ? 'link--dragging' : '',
                  dropTargetLink?.setIndex === i && dropTargetLink?.linkIndex === j ? 'link--drop-target' : '',
                ].filter(Boolean).join(' ')}
                draggable
                onDragStart={(e) => handleLinkDragStart(e, i, j)}
                onDragOver={(e) => handleLinkDragOver(e, i, j)}
                onDrop={(e) => handleLinkDrop(e, i, j)}
                onDragEnd={handleLinkDragEnd}
              >
                <div className="edit-link-block">
                  <span className="edit-link-row">
                    <span className="drag-handle drag-handle--link" title="Drag to reorder">⠿</span>
                    <input
                      type="text"
                      className="add-link-input edit-link-name-input"
                      value={link.name}
                      onChange={(e) => handleLinkEdit(i, j, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      className="add-link-input edit-link-url-input"
                      value={link.url}
                      onChange={(e) => handleLinkEdit(i, j, 'url', e.target.value)}
                      placeholder="URL"
                    />
                    <button
                      className={`tags-toggle-btn ${(link.tags ?? []).length ? 'tags-toggle-btn--active' : ''}`}
                      onClick={() => toggleTagsExpanded(i, j)}
                      title="Edit search tags"
                      type="button"
                    >
                      #
                    </button>
                    <button
                      className="remove-link-btn"
                      onClick={() => handleRemoveLink(i, j)}
                      title="Remove link"
                    >
                      &times;
                    </button>
                  </span>
                  {(expandedTags.has(tagKey(i, j)) || (link.tags ?? []).length > 0) && (
                    <div className="edit-link-tags-row">
                      <input
                        type="text"
                        className="add-link-input edit-link-tags-input"
                        value={(link.tags ?? []).join(', ')}
                        onChange={(e) => handleLinkEdit(i, j, 'tags', e.target.value)}
                        placeholder="Search tags (comma-separated)"
                        title="Comma-separated search tags"
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="add-link-form">
            <div className="add-link-form-row">
              <input
                type="text"
                placeholder="Name"
                value={newLinkName[i] || ''}
                onChange={(e) => setNewLinkName((prev) => ({ ...prev, [i]: e.target.value }))}
                onKeyDown={(e) => handleLinkKeyDown(e, i)}
                className="add-link-input"
              />
              <input
                type="text"
                placeholder="URL"
                value={newLinkUrl[i] || ''}
                onChange={(e) => setNewLinkUrl((prev) => ({ ...prev, [i]: e.target.value }))}
                onKeyDown={(e) => handleLinkKeyDown(e, i)}
                className="add-link-input"
              />
              <button
                className={`tags-toggle-btn ${(newLinkTags[i] || '').trim() ? 'tags-toggle-btn--active' : ''}`}
                onClick={() => setShowNewTags((prev) => ({ ...prev, [i]: !prev[i] }))}
                title="Add search tags"
                type="button"
              >
                #
              </button>
              <button className="add-link-btn" onClick={() => handleAddLink(i)}>
                + Add
              </button>
            </div>
            {(showNewTags[i] || (newLinkTags[i] || '').trim()) && (
              <input
                type="text"
                placeholder="Search tags (comma-separated)"
                value={newLinkTags[i] || ''}
                onChange={(e) => setNewLinkTags((prev) => ({ ...prev, [i]: e.target.value }))}
                onKeyDown={(e) => handleLinkKeyDown(e, i)}
                className="add-link-input edit-link-tags-input"
                title="Comma-separated search tags"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TabSetsEdit;
