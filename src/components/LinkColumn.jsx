import React, { useState, useRef } from 'react';

const LinkColumn = ({
  column,
  editing,
  onUpdate,
  onRemove,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onLinkDropFromOther,
}) => {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [linkDragIndex, setLinkDragIndex] = useState(null);
  const [linkDropIndex, setLinkDropIndex] = useState(null);
  const dragCounterRef = useRef(0);
  const [columnDragOver, setColumnDragOver] = useState(false);
  const columnDragCounter = useRef(0);

  const handleAddLink = () => {
    const trimmedName = newName.trim();
    const trimmedUrl = newUrl.trim();
    if (!trimmedName || !trimmedUrl) return;

    const updated = {
      ...column,
      links: [...column.links, { name: trimmedName, url: trimmedUrl }],
    };
    onUpdate(updated);
    setNewName('');
    setNewUrl('');
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
    const links = column.links.map((link, i) =>
      i === index ? { ...link, [field]: value } : link,
    );
    onUpdate({ ...column, links });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddLink();
  };

  // --- Link drag-and-drop (within column + across columns) ---

  const handleLinkDragStart = (e, index) => {
    setLinkDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-link-source', JSON.stringify({
      columnId: column.id,
      linkIndex: index,
      link: column.links[index],
    }));
    e.stopPropagation();
  };

  const handleLinkDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceData = e.dataTransfer.types.includes('application/x-link-source');
    if (sourceData) {
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
    if (!raw) return;
    const source = JSON.parse(raw);

    if (source.columnId === column.id) {
      const links = [...column.links];
      const [moved] = links.splice(source.linkIndex, 1);
      const insertAt = targetIndex > source.linkIndex ? targetIndex - 1 : targetIndex;
      links.splice(insertAt, 0, moved);
      onUpdate({ ...column, links });
    } else {
      onLinkDropFromOther(source.columnId, source.linkIndex, column.id, targetIndex);
    }
  };

  const handleLinkDragEnd = () => {
    setLinkDragIndex(null);
    setLinkDropIndex(null);
  };

  // Handle drops on the column body (for appending to end or cross-column)
  const handleColumnBodyDragEnter = (e) => {
    if (e.dataTransfer.types.includes('application/x-link-source')) {
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
    if (e.dataTransfer.types.includes('application/x-link-source')) {
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
    if (!raw) return;
    const source = JSON.parse(raw);

    if (source.columnId === column.id) {
      const links = [...column.links];
      const [moved] = links.splice(source.linkIndex, 1);
      links.push(moved);
      onUpdate({ ...column, links });
    } else {
      onLinkDropFromOther(source.columnId, source.linkIndex, column.id, column.links.length);
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
      className={columnClasses}
      onDragOver={editing ? handleColDragOver : undefined}
      onDrop={editing ? handleColDrop : undefined}
      onDragLeave={editing ? handleColDragEnd : undefined}
    >
      {editing ? (
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
        </div>
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
                  className="remove-link-btn"
                  onClick={() => handleRemoveLink(index)}
                  title="Remove link"
                >
                  &times;
                </button>
              </span>
            ) : (
              <a href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <div className="add-link-form">
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
          <button className="add-link-btn" onClick={handleAddLink}>
            + Add
          </button>
        </div>
      )}
    </div>
  );
};

export default LinkColumn;
