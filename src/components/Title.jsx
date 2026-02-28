import React from 'react';

const Title = ({ imageUrl, editing, onUpdate }) => {
  if (editing) {
    return (
      <div className="title">
        <br />
        {imageUrl && (
          <img style={{ height: '120px' }} src={imageUrl} alt="Logo" />
        )}
        <div className="title-edit-row">
          <input
            type="text"
            className="title-edit-input"
            value={imageUrl}
            onChange={(e) => onUpdate(e.target.value)}
            placeholder="Image URL"
          />
        </div>
      </div>
    );
  }

  if (!imageUrl) return null;

  return (
    <div className="title">
      <br />
      <img style={{ height: '120px' }} src={imageUrl} alt="Logo" />
    </div>
  );
};

export default Title;
