import { useState } from 'react';

import { backendUrl } from '../../api';

export default function WorldElementList({ elements, onSelect, selectedElementId }) {
  return (
    <div className="world-element-grid" aria-label="Elementy wybranej kategorii">
      {elements.map((element) => {
        const imageUrl = element.image_path
          ? backendUrl(`/storage/${element.image_path.replace(/^\/+/, '')}`)
          : null;

        return (
          <article
            key={element.id}
            className={Number(selectedElementId) === Number(element.id)
              ? 'world-element-card world-element-card--selected'
              : 'world-element-card'}
          >
            <button
              type="button"
              aria-label={`Otwórz szczegóły: ${element.name}`}
              onClick={(event) => onSelect(element, event)}
            >
              {imageUrl && (
                <CardImage key={imageUrl} imageUrl={imageUrl} name={element.name} />
              )}
              <div className="world-element-card__body">
                <h3 title={element.name}>{element.name}</h3>
                {element.description
                  ? <p>{element.description}</p>
                  : <p className="world-element-card__empty">Brak opisu</p>}
              </div>
            </button>
          </article>
        );
      })}
    </div>
  );
}

function CardImage({ imageUrl, name }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <div className="world-element-card__image-error">Nie udało się wczytać obrazu</div>;
  }

  return (
    <img
      src={imageUrl}
      alt={`Obraz elementu: ${name}`}
      onError={() => setHasError(true)}
    />
  );
}
