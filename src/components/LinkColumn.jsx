import React, { useState, useRef } from 'react';

/** Parse a comma-separated string into a trimmed, non-empty tag array. */
const parseTags = (str) =>
  str.split(',').map((s) => s.trim()).filter(Boolean);

const UNIVERSAL_MIME = 'application/x-universal-link';

const LinkColumn = ({
  column,
  editing,
  onUpdate,
  onRemove,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onLinkDropFromOther,
  onUniversalDrop,
  openLinksInNewTab = true,
}) => {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTags, setNewTags] = useState('');
  const [showNewTags, setShowNewTags] = useState(false);
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [linkDragIndex, setLinkDragIndex] = useState(null);
  const [linkDropIndex, setLinkDropIndex] = useState(null);
  const dragCounterRef = useRef(0);
  const [columnDragOver, setColumnDragOver] = useState(false);
  const columnDragCounter = useRef(0);

  const toggleTagsExpanded = (index) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleAddLink = () => {
    const trimmedName = newName.trim();
    const trimmedUrl = newUrl.trim();
    if (!trimmedName || !trimmedUrl) return;

    const tags = parseTags(newTags);
    const link = { name: trimmedName, url: trimmedUrl };
    if (tags.length) link.tags = tags;

    const updated = {
      ...column,
      links: [...column.links, link],
    };
    onUpdate(updated);
    setNewName('');
    setNewUrl('');
    setNewTags('');
    setShowNewTags(false);
  };

  const handleRemoveLink = (index) => {
    const updated = {
      ...column,
      links: column.links.filter((_, i) => i !== index),
    };
    onUpdate(updated);
  };

  const handleHeadingChange = (e) => {
    onUpdate({ ...column, heading: e.target.value });
  };

  const handleLinkEdit = (index, field, value) => {
    const links = column.links.map((link, i) => {
      if (i !== index) return link;
      if (field === 'tags') {
        const tags = parseTags(value);
        return tags.length ? { ...link, tags } : { ...link, tags: undefined };
      }
      return { ...link, [field]: value };
    });
    onUpdate({ ...column, links });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddLink();
  };

  // --- Link drag-and-drop (within column + across columns) ---

  const handleLinkDragStart = (e, index) => {
    setLinkDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const link = column.links[index];
    e.dataTransfer.setData('application/x-link-source', JSON.stringify({
      columnId: column.id,
      linkIndex: index,
      link,
    }));
    e.dataTransfer.setData(UNIVERSAL_MIME, JSON.stringify({
      sourceType: 'column',
      sourceId: column.id,
      sourceIndex: index,
      name: link.name,
      url: link.url,
      tags: link.tags,
    }));
    e.stopPropagation();
  };

  const handleLinkDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-link-source') ||
        e.dataTransfer.types.includes(UNIVERSAL_MIME)) {
      e.dataTransfer.dropEffect = 'move';
      setLinkDropIndex(index);
    }
  };

  const handleLinkDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkDropIndex(null);
    setLinkDragIndex(null);

    const raw = e.dataTransfer.getData('application/x-link-source');
    if (raw) {
      const source = JSON.parse(raw);
      if (source.columnId === column.id) {
        const links = [...column.links];
        const [moved] = links.splice(source.linkIndex, 1);
        const insertAt = targetIndex > source.linkIndex ? targetIndex - 1 : targetIndex;
        links.splice(insertAt, 0, moved);
        onUpdate({ ...column, links });
        return;
      }
      onLinkDropFromOther(source.columnId, source.linkIndex, column.id, targetIndex);
      return;
    }

    const universalRaw = e.dataTransfer.getData(UNIVERSAL_MIME);
    if (universalRaw) {
      const source = JSON.parse(universalRaw);
      if (source.sourceType !== 'column' || source.sourceId !== column.id) {
        onUniversalDrop?.(source, { targetType: 'column', targetId: column.id, targetIndex });
      }
    }
  };

  const handleLinkDragEnd = () => {
    setLinkDragIndex(null);
    setLinkDropIndex(null);
  };

  // Handle drops on the column body (for appending to end or cross-column)
  const hasLinkDrag = (e) =>
    e.dataTransfer.types.includes('application/x-link-source') ||
    e.dataTransfer.types.includes(UNIVERSAL_MIME);

  const handleColumnBodyDragEnter = (e) => {
    if (hasLinkDrag(e)) {
      dragCounterRef.current++;
      setColumnDragOver(true);
    }
  };

  const handleColumnBodyDragLeave = () => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setColumnDragOver(false);
    }
  };

  const handleColumnBodyDragOver = (e) => {
    if (hasLinkDrag(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleColumnBodyDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setColumnDragOver(false);
    setLinkDropIndex(null);

    const raw = e.dataTransfer.getData('application/x-link-source');
    if (raw) {
      const source = JSON.parse(raw);
      if (source.columnId === column.id) {
        const links = [...column.links];
        const [moved] = links.splice(source.linkIndex, 1);
        links.push(moved);
        onUpdate({ ...column, links });
      } else {
        onLinkDropFromOther(source.columnId, source.linkIndex, column.id, column.links.length);
      }
      return;
    }

    const universalRaw = e.dataTransfer.getData(UNIVERSAL_MIME);
    if (universalRaw) {
      const source = JSON.parse(universalRaw);
      if (source.sourceType !== 'column' || source.sourceId !== column.id) {
        onUniversalDrop?.(source, { targetType: 'column', targetId: column.id, targetIndex: column.links.length });
      }
    }
  };

  // --- Column-level drag (reorder columns via heading) ---

  const handleColDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-column-id', column.id);
    onColumnDragStart?.(column.id);
  };

  const handleColDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-column-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      columnDragCounter.current++;
      setColumnDragOver(true);
      onColumnDragOver?.(column.id);
    }
  };

  const handleColDrop = (e) => {
    e.preventDefault();
    columnDragCounter.current = 0;
    setColumnDragOver(false);
    const sourceId = e.dataTransfer.getData('application/x-column-id');
    if (sourceId && sourceId !== column.id) {
      onColumnDrop?.(sourceId, column.id);
    }
  };

  const handleColDragEnd = () => {
    columnDragCounter.current = 0;
    setColumnDragOver(false);
  };

  const columnClasses = [
    'monitoring_links',
    editing && columnDragOver ? 'column-drag-over' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={editing ? `${columnClasses} edit-section edit-section--column` : columnClasses}
      onDragOver={editing ? handleColDragOver : undefined}
      onDrop={editing ? handleColDrop : undefined}
      onDragLeave={editing ? handleColDragEnd : undefined}
    >
      {editing ? (
        <>
        <span className="edit-section-badge edit-section-badge--column">Column</span>
        <div
          className="link_heading link_heading--draggable"
          draggable
          onDragStart={handleColDragStart}
          onDragEnd={handleColDragEnd}
        >
          <span className="drag-handle" title="Drag to reorder column">⠿</span>
          <input
            type="text"
            className="edit-heading-input"
            value={column.heading}
            onChange={handleHeadingChange}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="remove-column-btn"
            onClick={onRemove}
            title="Remove column"
          >
            &times;
          </button>
        </div></>

      ) : (
        <div className="link_heading">{column.heading}</div>
      )}
      <ul
        onDragEnter={editing ? handleColumnBodyDragEnter : undefined}
        onDragLeave={editing ? handleColumnBodyDragLeave : undefined}
        onDragOver={editing ? handleColumnBodyDragOver : undefined}
        onDrop={editing ? handleColumnBodyDrop : undefined}
        className={editing && columnDragOver ? 'link-list-drag-over' : ''}
      >
        {column.links.map((link, index) => (
          <li
            className={[
              'link',
              editing && linkDragIndex === index ? 'link--dragging' : '',
              editing && linkDropIndex === index ? 'link--drop-target' : '',
            ].filter(Boolean).join(' ')}
            key={`${column.id}-${index}`}
            draggable={editing}
            onDragStart={editing ? (e) => handleLinkDragStart(e, index) : undefined}
            onDragOver={editing ? (e) => handleLinkDragOver(e, index) : undefined}
            onDrop={editing ? (e) => handleLinkDrop(e, index) : undefined}
            onDragEnd={editing ? handleLinkDragEnd : undefined}
          >
            {editing ? (
              <div className="edit-link-block">
                <span className="edit-link-row">
                  <span className="drag-handle drag-handle--link" title="Drag to reorder">⠿</span>
                  <input
                    type="text"
                    className="add-link-input edit-link-name-input"
                    value={link.name}
                    onChange={(e) => handleLinkEdit(index, 'name', e.target.value)}
                    title="Link name"
                  />
                  <input
                    type="text"
                    className="add-link-input edit-link-url-input"
                    value={link.url}
                    onChange={(e) => handleLinkEdit(index, 'url', e.target.value)}
                    title="Link URL"
                  />
                  <button
                    className={`tags-toggle-btn ${(link.tags ?? []).length ? 'tags-toggle-btn--active' : ''}`}
                    onClick={() => toggleTagsExpanded(index)}
                    title="Edit search tags"
                    type="button"
                  >
                    #
                  </button>
                  <button
                    className="remove-link-btn"
                    onClick={() => handleRemoveLink(index)}
                    title="Remove link"
                  >
                    &times;
                  </button>
                </span>
                {(expandedTags.has(index) || (link.tags ?? []).length > 0) && (
                  <div className="edit-link-tags-row">
                    <input
                      type="text"
                      className="add-link-input edit-link-tags-input"
                      value={(link.tags ?? []).join(', ')}
                      onChange={(e) => handleLinkEdit(index, 'tags', e.target.value)}
                      placeholder="Search tags (comma-separated)"
                      title="Comma-separated search tags"
                    />
                  </div>
                )}
              </div>
            ) : openLinksInNewTab ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
            ) : (
              <a href={link.url} rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.location.href = link.url; }}>{link.name}</a>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <div className="add-link-form">
          <div className="add-link-form-row">
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="add-link-input"
            />
            <input
              type="text"
              placeholder="URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="add-link-input"
            />
            <button
              className={`tags-toggle-btn ${newTags.trim() ? 'tags-toggle-btn--active' : ''}`}
              onClick={() => setShowNewTags((v) => !v)}
              title="Add search tags"
              type="button"
            >
              #
            </button>
            <button className="add-link-btn" onClick={handleAddLink}>
              + Add
            </button>
          </div>
          {(showNewTags || newTags.trim()) && (
            <input
              type="text"
              placeholder="Search tags (comma-separated)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              onKeyDown={handleKeyDown}
              className="add-link-input edit-link-tags-input"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default LinkColumn;
