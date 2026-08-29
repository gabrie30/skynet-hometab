import React, { useState, useRef, useEffect } from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+)/;

function linkifyText(text) {
  const parts = text.split(URL_REGEX);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="todo-link"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

const TodoList = ({ todos, onAdd, onEdit, onRemove, onMinimize }) => {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    onAdd(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const commitEdit = () => {
    if (editingId) {
      const trimmed = editText.trim();
      if (trimmed && trimmed !== todos.find((t) => t.id === editingId)?.text) {
        onEdit(editingId, trimmed);
      }
      setEditingId(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="todo-list">
      <div className="todo-heading">
        todos
        {todos.length === 0 && (
          <button
            className="todo-minimize-btn"
            onClick={onMinimize}
            title="Minimize"
          >
            &minus;
          </button>
        )}
      </div>
      <div className="todo-input-row">
        <input
          type="text"
          className="todo-input"
          placeholder="add a task..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="todo-add-btn" onClick={handleAdd}>
          +
        </button>
      </div>
      <ul className="todo-items">
        {todos.map((item) => (
          <li key={item.id} className="todo-item">
            <button
              className="todo-check"
              onClick={() => onRemove(item.id)}
              title="Complete"
              aria-label={`Complete "${item.text}"`}
            >
              <span className="todo-check-icon" />
            </button>
            {editingId === item.id ? (
              <input
                ref={editInputRef}
                type="text"
                className="todo-edit-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={commitEdit}
              />
            ) : (
              <span
                className="todo-text"
                onDoubleClick={() => startEditing(item)}
                title="Double-click to edit"
              >
                {linkifyText(item.text)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
