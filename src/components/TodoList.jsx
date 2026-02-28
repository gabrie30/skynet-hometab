import React, { useState } from 'react';

const TodoList = ({ todos, onAdd, onRemove, onMinimize }) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    onAdd(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
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
            <span className="todo-text">{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
