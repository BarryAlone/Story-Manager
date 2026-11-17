import { useRef, useState } from 'react';

import CharacterGalleryLightbox from './CharacterGalleryLightbox';

export default function CharacterGallerySection({
  error,
  images,
  isLoading,
  manageButtonRef,
  onManage,
  onRetry,
  sectionNumber,
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const lastTriggerRef = useRef(null);

  const closeLightbox = () => {
    setActiveIndex(null);
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus({ preventScroll: true }));
  };

  if (isLoading) {
    return <p className="character-gallery-state" role="status">Ładowanie galerii…</p>;
  }

  if (error) {
    return (
      <div className="character-gallery-state character-gallery-state--error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onRetry}>Spróbuj ponownie</button>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="character-gallery-empty">
        <button ref={manageButtonRef} type="button" data-panel-trigger onClick={onManage}>
          Dodaj pierwszy obraz
        </button>
      </div>
    );
  }

  return (
    <section id="character-gallery" className="character-gallery" aria-labelledby="character-gallery-title">
      <div className="character-gallery__heading">
        <h2 id="character-gallery-title">
          <span className="character-section__number">{sectionNumber}.</span>
          Galeria
        </h2>
        <button ref={manageButtonRef} type="button" data-panel-trigger onClick={onManage}>
          Zarządzaj galerią
        </button>
      </div>

      <div className="character-gallery__grid">
        {images.map((image, index) => (
          <figure key={image.id} className="character-gallery__item">
            <button
              type="button"
              aria-label={`Powiększ obraz ${index + 1}${image.caption ? `: ${image.caption}` : ''}`}
              onClick={(event) => {
                lastTriggerRef.current = event.currentTarget;
                setActiveIndex(index);
              }}
            >
              <img src={image.image_url} alt={image.caption || `Obraz ${index + 1} galerii postaci`} />
            </button>
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {activeIndex !== null && (
        <CharacterGalleryLightbox
          activeIndex={activeIndex}
          images={images}
          onClose={closeLightbox}
          onSelect={setActiveIndex}
        />
      )}
    </section>
  );
}
