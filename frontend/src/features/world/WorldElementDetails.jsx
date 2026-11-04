import { useState } from 'react';

import { backendUrl } from '../../api';

export default function WorldElementDetails({ category, disabled, element, onDelete, onEdit }) {
  const imageUrl = element.image_path
    ? backendUrl(`/storage/${element.image_path.replace(/^\/+/, '')}`)
    : null;

  return (
    <div className="world-element-details">
      <DetailImage key={imageUrl || 'empty'} elementName={element.name} imageUrl={imageUrl} />

      <div className="world-element-details__heading">
        <p>{category.name}</p>
        <h3>{element.name}</h3>
      </div>

      <section className="world-element-details__description">
        <h4>Opis</h4>
        {element.description
          ? <p>{element.description}</p>
          : <p className="world-element-details__empty">Brak opisu.</p>}
      </section>

      <footer className="world-element-details__actions">
        <button type="button" className="world-button world-button--primary" onClick={onEdit} disabled={disabled}>
          Edytuj
        </button>
        <button type="button" className="world-button world-button--danger" onClick={onDelete} disabled={disabled}>
          {disabled ? 'Usuwanie…' : 'Usuń element'}
        </button>
      </footer>
    </div>
  );
}

function DetailImage({ elementName, imageUrl }) {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError) {
    return (
      <div className="world-element-details__image world-element-image-placeholder">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m4 17 5-5 4 4 2-2 5 5" />
        </svg>
        <span>{hasError ? 'Nie udało się wczytać obrazu' : 'Brak obrazu'}</span>
      </div>
    );
  }

  return (
    <img
      className="world-element-details__image"
      src={imageUrl}
      alt={`Obraz elementu: ${elementName}`}
      onError={() => setHasError(true)}
    />
  );
}
