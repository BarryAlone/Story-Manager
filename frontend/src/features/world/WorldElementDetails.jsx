import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { backendUrl } from '../../api';
import { formatAttributeValue } from '../attributes/attributeValues';

export default function WorldElementDetails({
  category,
  definitions,
  disabled,
  element,
  onDelete,
  onEdit,
}) {
  const imageUrl = element.image_path
    ? backendUrl(`/storage/${element.image_path.replace(/^\/+/, '')}`)
    : null;
  const populatedAttributes = definitions.filter((definition) => {
    const value = element.attribute_values?.[definition.id];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });

  return (
    <div className="world-element-details">
      <div className="world-element-details__content">
        <div className="world-element-details__heading">
          <h3 title={element.name}>{element.name}</h3>
          <span className="world-element-details__category" title={category.name}>
            {category.name}
          </span>
        </div>

        <section className="world-element-details__attributes">
          <h4>Atrybuty</h4>
          {populatedAttributes.length > 0 ? (
            <dl>
              {populatedAttributes.map((definition) => (
                <div key={definition.id}>
                  <dt title={definition.name}>{definition.name}</dt>
                  <dd>{formatAttributeValue(definition, element.attribute_values[definition.id])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="world-element-details__empty">Brak uzupełnionych atrybutów</p>
          )}
        </section>

        <section className="world-element-details__description">
          <h4>Opis</h4>
          {element.description
            ? <p>{element.description}</p>
            : <p className="world-element-details__empty">Brak opisu.</p>}
        </section>

        <DetailImage key={imageUrl || 'empty'} elementName={element.name} imageUrl={imageUrl} />
      </div>

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const wasPreviewOpenRef = useRef(false);

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    closeButtonRef.current?.focus({ preventScroll: true });

    const closeWithKeyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsPreviewOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', closeWithKeyboard, true);
    return () => document.removeEventListener('keydown', closeWithKeyboard, true);
  }, [isPreviewOpen]);

  useEffect(() => {
    if (isPreviewOpen) {
      wasPreviewOpenRef.current = true;
      return;
    }

    if (wasPreviewOpenRef.current) {
      wasPreviewOpenRef.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [isPreviewOpen]);

  if (!imageUrl) return null;

  if (hasError) {
    return (
      <section className="world-element-details__image-section">
        <h4>Obraz</h4>
        <div className="world-element-details__image world-element-image-placeholder">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m4 17 5-5 4 4 2-2 5 5" />
          </svg>
          <span>Nie udało się wczytać obrazu</span>
        </div>
      </section>
    );
  }

  return (
    <section className="world-element-details__image-section">
      <h4>Obraz</h4>
      <button
        ref={triggerRef}
        type="button"
        className="world-element-details__image-trigger"
        title={`Powiększ obraz elementu: ${elementName}`}
        aria-label={`Powiększ obraz elementu: ${elementName}`}
        onClick={() => setIsPreviewOpen(true)}
      >
        <img
          className="world-element-details__image"
          src={imageUrl}
          alt={`Obraz elementu: ${elementName}`}
          onError={() => setHasError(true)}
        />
      </button>

      {isPreviewOpen && createPortal(
        <div
          className="world-element-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Powiększony obraz elementu: ${elementName}`}
          data-world-panel-portal
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPreviewOpen(false);
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="world-element-image-lightbox__close"
            aria-label="Zamknij powiększony obraz"
            onClick={() => setIsPreviewOpen(false)}
          >
            ×
          </button>
          <img src={imageUrl} alt={`Powiększony obraz elementu: ${elementName}`} />
        </div>,
        document.body,
      )}
    </section>
  );
}
