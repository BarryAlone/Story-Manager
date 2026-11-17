import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function CharacterGalleryLightbox({ activeIndex, images, onClose, onSelect }) {
  const closeButtonRef = useRef(null);
  const previousButtonRef = useRef(null);
  const nextButtonRef = useRef(null);
  const image = images[activeIndex] || null;
  const controls = useMemo(
    () => [previousButtonRef, closeButtonRef, nextButtonRef],
    [],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousScrollbarGutter = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = 'stable';
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousScrollbarGutter;
    };
  }, []);

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && images.length > 1) {
        event.preventDefault();
        onSelect((activeIndex - 1 + images.length) % images.length);
        return;
      }
      if (event.key === 'ArrowRight' && images.length > 1) {
        event.preventDefault();
        onSelect((activeIndex + 1) % images.length);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = controls.map((ref) => ref.current).filter(Boolean);
      if (focusable.length === 0) return;
      const currentIndex = focusable.indexOf(document.activeElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex + 1) % focusable.length;
      event.preventDefault();
      focusable[nextIndex].focus({ preventScroll: true });
    };

    document.addEventListener('keydown', handleKeyboard, true);
    return () => document.removeEventListener('keydown', handleKeyboard, true);
  }, [activeIndex, controls, images, onClose, onSelect]);

  if (!image) return null;

  return createPortal(
    <div
      className="character-gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Obraz ${activeIndex + 1} z ${images.length} w galerii postaci`}
      data-panel-portal
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className="character-gallery-lightbox__close"
        aria-label="Zamknij galerię"
        onClick={onClose}
      >
        ×
      </button>

      {images.length > 1 && (
        <button
          ref={previousButtonRef}
          type="button"
          className="character-gallery-lightbox__navigation character-gallery-lightbox__navigation--previous"
          aria-label="Poprzedni obraz"
          onClick={() => onSelect((activeIndex - 1 + images.length) % images.length)}
        >
          ‹
        </button>
      )}

      <figure>
        <img src={image.image_url} alt={image.caption || `Obraz ${activeIndex + 1} galerii postaci`} />
        {image.caption && <figcaption>{image.caption}</figcaption>}
      </figure>

      {images.length > 1 && (
        <button
          ref={nextButtonRef}
          type="button"
          className="character-gallery-lightbox__navigation character-gallery-lightbox__navigation--next"
          aria-label="Następny obraz"
          onClick={() => onSelect((activeIndex + 1) % images.length)}
        >
          ›
        </button>
      )}
    </div>,
    document.body,
  );
}
