import React, { useState, useRef } from 'react';

const Dropdowns = ({ dropdowns, editing, onUpdate }) => {
  const [newItems, setNewItems] = useState({});
  const [dragItemInfo, setDragItemInfo] = useState(null);
  const [dropTargetItem, setDropTargetItem] = useState(null);
  const [dragDropdownId, setDragDropdownId] = useState(null);
  const [dropTargetDropdownId, setDropTargetDropdownId] = useState(null);
  const listDragCounter = useRef({});

  const handleNavigate = (dropdown, value) => {
    if (value) window.location = value;
  };

  const buildUrl = (template, item) => template.replace('{item}', item);

  const handleRemoveItem = (dropdownIndex, itemIndex) => {
    const updated = dropdowns.map((dd, i) => {
      if (i !== dropdownIndex) return dd;
      return { ...dd, items: dd.items.filter((_, j) => j !== itemIndex) };
    });
    onUpdate(updated);
  };

  const handleAddItem = (dropdownIndex) => {
    const value = (newItems[dropdownIndex] || '').trim();
    if (!value) return;

    const updated = dropdowns.map((dd, i) => {
      if (i !== dropdownIndex) return dd;
      return { ...dd, items: [...dd.items, value] };
    });
    onUpdate(updated);
    setNewItems({ ...newItems, [dropdownIndex]: '' });
  };

  const handleHeadingChange = (dropdownIndex, value) => {
    const updated = dropdowns.map((dd, i) => {
      if (i !== dropdownIndex) return dd;
      return { ...dd, heading: value };
    });
    onUpdate(updated);
  };

  const handleTemplateChange = (dropdownIndex, value) => {
    const updated = dropdowns.map((dd, i) => {
      if (i !== dropdownIndex) return dd;
      return { ...dd, urlTemplate: value };
    });
    onUpdate(updated);
  };

  const handleRemoveDropdown = (dropdownIndex) => {
    onUpdate(dropdowns.filter((_, i) => i !== dropdownIndex));
  };

  const handleKeyDown = (e, dropdownIndex) => {
    if (e.key === 'Enter') handleAddItem(dropdownIndex);
  };

  // --- Item drag-and-drop (reorder within a dropdown) ---

  const handleItemDragStart = (e, dropdownIndex, itemIndex) => {
    e.stopPropagation();
    setDragItemInfo({ dropdownIndex, itemIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-dropdown-item', JSON.stringify({
      dropdownIndex,
      itemIndex,
    }));
  };

  const handleItemDragOver = (e, dropdownIndex, itemIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-dropdown-item')) {
      e.dataTransfer.dropEffect = 'move';
      setDropTargetItem({ dropdownIndex, itemIndex });
    }
  };

  const handleItemDrop = (e, dropdownIndex, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetItem(null);
    setDragItemInfo(null);

    const raw = e.dataTransfer.getData('application/x-dropdown-item');
    if (!raw) return;
    const source = JSON.parse(raw);

    if (source.dropdownIndex !== dropdownIndex) return;

    const updated = dropdowns.map((dd, i) => {
      if (i !== dropdownIndex) return dd;
      const items = [...dd.items];
      const [moved] = items.splice(source.itemIndex, 1);
      const insertAt = targetIndex > source.itemIndex ? targetIndex - 1 : targetIndex;
      items.splice(insertAt, 0, moved);
      return { ...dd, items };
    });
    onUpdate(updated);
  };

  const handleItemDragEnd = () => {
    setDragItemInfo(null);
    setDropTargetItem(null);
  };

  const handleListDragEnter = (e, dropdownIndex) => {
    if (e.dataTransfer.types.includes('application/x-dropdown-item')) {
      listDragCounter.current[dropdownIndex] = (listDragCounter.current[dropdownIndex] || 0) + 1;
    }
  };

  const handleListDragLeave = (dropdownIndex) => {
    listDragCounter.current[dropdownIndex] = (listDragCounter.current[dropdownIndex] || 0) - 1;
    if (listDragCounter.current[dropdownIndex] <= 0) {
      listDragCounter.current[dropdownIndex] = 0;
    }
  };

  const handleListDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-dropdown-item')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleListDrop = (e, dropdownIndex) => {
    e.preventDefault();
    listDragCounter.current[dropdownIndex] = 0;
    setDropTargetItem(null);

    const raw = e.dataTransfer.getData('application/x-dropdown-item');
    if (!raw) return;
    const source = JSON.parse(raw);

    if (source.dropdownIndex !== dropdownIndex) return;

    const updated = dropdowns.map((dd, i) => {
      if (i !== dropdownIndex) return dd;
      const items = [...dd.items];
      const [moved] = items.splice(source.itemIndex, 1);
      items.push(moved);
      return { ...dd, items };
    });
    onUpdate(updated);
  };

  // --- Dropdown group drag-and-drop (reorder dropdowns) ---

  const handleDropdownDragStart = (e, ddId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-dropdown-group', ddId);
    setDragDropdownId(ddId);
  };

  const handleDropdownDragOver = (e, ddId) => {
    if (e.dataTransfer.types.includes('application/x-dropdown-group')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTargetDropdownId(ddId);
    }
  };

  const handleDropdownDrop = (e, targetId) => {
    e.preventDefault();
    setDropTargetDropdownId(null);
    setDragDropdownId(null);

    const sourceId = e.dataTransfer.getData('application/x-dropdown-group');
    if (!sourceId || sourceId === targetId) return;

    const updated = [...dropdowns];
    const srcIdx = updated.findIndex((d) => d.id === sourceId);
    const tgtIdx = updated.findIndex((d) => d.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = updated.splice(srcIdx, 1);
    updated.splice(tgtIdx, 0, moved);
    onUpdate(updated);
  };

  const handleDropdownDragEnd = () => {
    setDragDropdownId(null);
    setDropTargetDropdownId(null);
  };

  if (!editing) {
    return (
      <center>
        <div className="custom-select">
          {dropdowns.map((dd) => (
            <select
              key={dd.id}
              className="dropdown-select"
              onChange={(e) => handleNavigate(dd, e.target.value)}
              defaultValue=""
            >
              <option value="">{dd.heading}</option>
              {dd.items.map((item, j) => (
                <option key={j} value={buildUrl(dd.urlTemplate, item)}>
                  {item}
                </option>
              ))}
            </select>
          ))}
        </div>
      </center>
    );
  }

  return (
    <div className="dropdowns-edit">
      {dropdowns.map((dd, i) => (
        <div
          key={dd.id}
          className={[
            'dropdown-edit-group',
            dragDropdownId === dd.id ? 'dropdown-group--dragging' : '',
            dropTargetDropdownId === dd.id && dragDropdownId !== dd.id ? 'column-drag-over' : '',
          ].filter(Boolean).join(' ')}
          onDragOver={(e) => handleDropdownDragOver(e, dd.id)}
          onDrop={(e) => handleDropdownDrop(e, dd.id)}
          onDragLeave={handleDropdownDragEnd}
        >
          <div
            className="dropdown-edit-header link_heading--draggable"
            draggable
            onDragStart={(e) => handleDropdownDragStart(e, dd.id)}
            onDragEnd={handleDropdownDragEnd}
          >
            <span className="drag-handle" title="Drag to reorder dropdown">⠿</span>
            <input
              type="text"
              className="edit-heading-input"
              value={dd.heading}
              onChange={(e) => handleHeadingChange(i, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="remove-column-btn"
              onClick={() => handleRemoveDropdown(i)}
              title="Remove dropdown"
            >
              &times;
            </button>
          </div>
          <div className="dropdown-template-row">
            <label className="template-label">URL template:</label>
            <input
              type="text"
              className="add-link-input template-input"
              value={dd.urlTemplate}
              onChange={(e) => handleTemplateChange(i, e.target.value)}
              placeholder="https://example.com/{item}"
            />
          </div>
          <ul
            className="dropdown-items-list"
            onDragEnter={(e) => handleListDragEnter(e, i)}
            onDragLeave={() => handleListDragLeave(i)}
            onDragOver={handleListDragOver}
            onDrop={(e) => handleListDrop(e, i)}
          >
            {dd.items.map((item, j) => (
              <li
                key={j}
                className={[
                  'link',
                  dragItemInfo?.dropdownIndex === i && dragItemInfo?.itemIndex === j ? 'link--dragging' : '',
                  dropTargetItem?.dropdownIndex === i && dropTargetItem?.itemIndex === j ? 'link--drop-target' : '',
                ].filter(Boolean).join(' ')}
                draggable
                onDragStart={(e) => handleItemDragStart(e, i, j)}
                onDragOver={(e) => handleItemDragOver(e, i, j)}
                onDrop={(e) => handleItemDrop(e, i, j)}
                onDragEnd={handleItemDragEnd}
              >
                <span className="edit-link-row">
                  <span className="drag-handle drag-handle--link" title="Drag to reorder">⠿</span>
                  <span>{item}</span>
                  <button
                    className="remove-link-btn"
                    onClick={() => handleRemoveItem(i, j)}
                    title="Remove item"
                  >
                    &times;
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="add-link-form">
            <input
              type="text"
              placeholder="New item"
              value={newItems[i] || ''}
              onChange={(e) => setNewItems({ ...newItems, [i]: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className="add-link-input"
            />
            <button className="add-link-btn" onClick={() => handleAddItem(i)}>
              + Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dropdowns;
