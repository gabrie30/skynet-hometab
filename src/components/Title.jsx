import React from 'react';

const FALLBACK_IMAGE = '../images/skynet-home.png';

const handleImgError = (e) => {
  if (e.target.src !== FALLBACK_IMAGE) {
    e.target.src = FALLBACK_IMAGE;
  }
};

const Title = ({ imageUrl, editing, onUpdate }) => {
  if (editing) {
    return (
      <div className="title edit-section edit-section--title">
        <span className="edit-section-badge edit-section-badge--title">Title Image</span>
        <br />
        {imageUrl && (
          <img style={{ height: '120px' }} src={imageUrl} alt="Logo" onError={handleImgError} />
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
      <img style={{ height: '120px' }} src={imageUrl} alt="Logo" onError={handleImgError} />
    </div>
  );
};

export default Title;
