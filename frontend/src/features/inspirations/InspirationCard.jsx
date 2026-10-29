import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { backendUrl } from '../../api';
import InspirationFormFields from './InspirationFormFields';
import useInspirationCardExpansion from './useInspirationCardExpansion';

function initialValues(inspiration) {
  return {
    content: inspiration.content || '',
    image: null,
    source: inspiration.source || '',
    title: inspiration.title || '',
  };
}

function sourceUrl(source) {
  if (!source) return null;

  try {
    const url = new URL(source);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function InspirationSource({ expanded, source }) {
  const url = sourceUrl(source);
  const className = `inspiration-card__source${expanded ? ' inspiration-card__source--expanded' : ''}`;

  if (url) {
    return (
      <a
        className={className}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={source}
        onClick={(event) => event.stopPropagation()}
      >
        {source}
      </a>
    );
  }

  return <span className={className} title={source}>{source}</span>;
}

export default function InspirationCard({ isVisible, mode, inspiration, onDelete, onModeChange, onUpdate }) {
  const [values, setValues] = useState(() => initialValues(inspiration));
  const [removeImage, setRemoveImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [returnTarget, setReturnTarget] = useState('preview');
  const savingRef = useRef(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuPopoverRef = useRef(null);
  const returnTimerRef = useRef(null);
  const isExpanded = mode !== 'collapsed';
  const isInteractionLocked = isSaving || isFinishing;
  const imageUrl = inspiration.image_path ? backendUrl(`/storage/${inspiration.image_path}`) : null;
  const hasImage = Boolean(imageUrl && !removeImage && !values.image);
  const canSave = Boolean(
    values.title.trim()
    || values.content.trim()
    || values.image
    || (inspiration.image_path && !removeImage)
  );
  const isDirty = useMemo(() => (
    values.title !== (inspiration.title || '')
    || values.content !== (inspiration.content || '')
    || values.source !== (inspiration.source || '')
    || Boolean(values.image)
    || removeImage
  ), [inspiration.content, inspiration.source, inspiration.title, removeImage, values]);
  const handleClosed = () => {
    savingRef.current = false;
    setIsSaving(false);
    setIsFinishing(false);
    onModeChange('collapsed');
    window.requestAnimationFrame(() => {
      const card = isVisible ? slotRef.current?.querySelector('.inspiration-card') : null;
      const focusTarget = card || document.querySelector('.inspirations-toolbar__search input');
      focusTarget?.focus({ preventScroll: true });
    });
  };
  const {
    closeToSlot,
    fitOverlay,
    isTransitioningRef,
    openFromSlot,
    overlayRef,
    slotRef,
  } = useInspirationCardExpansion({
    isExpanded,
    layoutKey: mode,
    onClosed: handleClosed,
  });

  useLayoutEffect(() => {
    if (!isExpanded || !overlayRef.current) return;

    const focusTarget = mode === 'edit'
      ? overlayRef.current.querySelector('.inspiration-card__edit input, .inspiration-card__edit textarea, .inspiration-card__edit button')
      : overlayRef.current;
    focusTarget?.focus({ preventScroll: true });
  }, [isExpanded, mode, overlayRef]);

  useEffect(() => {
    if (!isExpanded) return undefined;

    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;

    const wasInert = appRoot.inert;
    appRoot.inert = true;
    return () => {
      appRoot.inert = wasInert;
    };
  }, [isExpanded]);

  const prepareEdit = (target) => {
    if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current);
    returnTimerRef.current = null;
    savingRef.current = false;
    setIsSaving(false);
    setIsFinishing(false);
    setValues(initialValues(inspiration));
    setRemoveImage(false);
    setError('');
    setIsMenuOpen(false);
    setReturnTarget(target);
  };

  const openPreview = () => {
    if (savingRef.current || isTransitioningRef.current) return;
    openFromSlot(() => onModeChange('preview'));
  };

  const openEdit = () => {
    if (savingRef.current || isTransitioningRef.current) return;
    const target = mode === 'collapsed' ? 'list' : 'preview';
    prepareEdit(target);

    if (mode === 'collapsed') openFromSlot(() => onModeChange('edit'));
    else onModeChange('edit');
  };

  const returnToList = () => {
    if (returnTimerRef.current) return;
    savingRef.current = true;
    setIsFinishing(true);

    const closeWhenReady = () => {
      returnTimerRef.current = null;
      if (isTransitioningRef.current) {
        returnTimerRef.current = window.setTimeout(closeWhenReady, 25);
        return;
      }
      closeToSlot();
    };

    closeWhenReady();
  };

  const finishEdit = () => {
    if (returnTarget === 'list') {
      returnToList();
    } else {
      savingRef.current = false;
      setIsSaving(false);
      onModeChange('preview');
    }
  };

  const cancelEdit = () => {
    if (savingRef.current) return;
    setValues(initialValues(inspiration));
    setRemoveImage(false);
    setError('');
    setIsMenuOpen(false);
    finishEdit();
  };

  const saveEdit = async () => {
    if (savingRef.current) return;
    if (!isDirty) {
      finishEdit();
      return;
    }
    if (!canSave) {
      setError('Uzupełnij tytuł, treść albo dodaj zdjęcie.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      const updated = await onUpdate(inspiration.id, { ...values, removeImage });
      setValues(initialValues(updated));
      setRemoveImage(false);
      finishEdit();
    } catch (saveError) {
      setError(saveError.message || 'Nie udało się zapisać zmian.');
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const remove = async () => {
    setIsMenuOpen(false);
    if (!window.confirm('Czy na pewno chcesz trwale usunąć tę inspirację?')) return;

    savingRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      await onDelete(inspiration.id);
      onModeChange('collapsed');
      window.requestAnimationFrame(() => {
        document.querySelector('.inspirations-toolbar__search input')?.focus({ preventScroll: true });
      });
    } catch (deleteError) {
      setError(deleteError.message || 'Nie udało się usunąć inspiracji.');
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const positionMenu = useCallback(() => {
    const button = menuButtonRef.current;
    const popover = menuPopoverRef.current;
    if (!button || !popover) return;

    const margin = 8;
    const gap = 5;
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const openAbove = spaceBelow < popoverRect.height + gap + margin
      && spaceAbove >= popoverRect.height + gap + margin;
    const preferredTop = openAbove
      ? buttonRect.top - popoverRect.height - gap
      : buttonRect.bottom + gap;
    const maxTop = Math.max(margin, window.innerHeight - popoverRect.height - margin);
    const preferredLeft = buttonRect.right - popoverRect.width;
    const maxLeft = Math.max(margin, window.innerWidth - popoverRect.width - margin);

    popover.style.top = `${Math.max(margin, Math.min(preferredTop, maxTop))}px`;
    popover.style.left = `${Math.max(margin, Math.min(preferredLeft, maxLeft))}px`;
    popover.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!isMenuOpen) return undefined;

    positionMenu();
    menuPopoverRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [isMenuOpen, positionMenu]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const closeMenuOutside = (event) => {
      if (menuRef.current?.contains(event.target) || menuPopoverRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenuOutside);
    return () => document.removeEventListener('pointerdown', closeMenuOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isExpanded && !isMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      if (isMenuOpen) {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus({ preventScroll: true });
      } else if (mode === 'edit') {
        cancelEdit();
      } else if (mode === 'preview') {
        closeToSlot();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  useEffect(() => () => {
    if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current);
  }, []);

  const activate = () => {
    if (mode === 'collapsed') openPreview();
    else if (mode === 'preview') openEdit();
  };

  const keyboardActivate = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  };

  const menu = (
    <div className="inspiration-card__menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Menu inspiracji${inspiration.title ? `: ${inspiration.title}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
        disabled={isInteractionLocked}
      >
        …
      </button>
      {isMenuOpen && createPortal(
        <div
          ref={menuPopoverRef}
          className="inspiration-card__menu-popover"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {mode !== 'edit' && <button type="button" role="menuitem" onClick={openEdit}>Edytuj</button>}
          <button type="button" role="menuitem" className="inspiration-card__menu-delete" onClick={remove}>Usuń</button>
        </div>,
        document.body,
      )}
    </div>
  );

  const display = (
    <div className="inspiration-card__preview">
      {imageUrl && (
        <div className="inspiration-card__image-wrap">
          <img
            src={imageUrl}
            alt={inspiration.title ? `Obraz inspiracji: ${inspiration.title}` : 'Obraz inspiracji'}
            onLoad={() => isExpanded && fitOverlay(true)}
          />
          {inspiration.source && <InspirationSource source={inspiration.source} expanded={isExpanded} />}
        </div>
      )}
      {(inspiration.title || inspiration.content) && (
        <div className="inspiration-card__body">
          {inspiration.title && <h2>{inspiration.title}</h2>}
          {inspiration.content && <p>{inspiration.content}</p>}
        </div>
      )}
      {!imageUrl && inspiration.source && (
        <div className="inspiration-card__source-row">
          <InspirationSource source={inspiration.source} expanded={isExpanded} />
        </div>
      )}
      {error && <p className="inspiration-form__error" role="alert">{error}</p>}
    </div>
  );

  const edit = (
    <div className="inspiration-card__edit" onClick={(event) => event.stopPropagation()}>
      <InspirationFormFields
        disabled={isInteractionLocked}
        existingImageUrl={imageUrl}
        idPrefix={`inspiration-${inspiration.id}`}
        values={values}
        removeImage={removeImage}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        onImageChange={(image) => {
          setValues((current) => ({ ...current, image }));
          if (image) setRemoveImage(false);
        }}
        onRemoveImage={() => setRemoveImage(true)}
      />
      {error && <p className="inspiration-form__error" role="alert">{error}</p>}
      <div className="inspiration-card__edit-actions">
        <button type="button" onClick={cancelEdit} disabled={isInteractionLocked}>Anuluj</button>
        <button
          type="button"
          className="inspiration-button--primary"
          onClick={saveEdit}
          disabled={!canSave || isInteractionLocked}
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </div>
  );

  const card = (overlay = false) => (
    <article
      ref={overlay ? overlayRef : undefined}
      className={`inspiration-card inspiration-card--${mode}${overlay ? ' inspiration-card--overlay' : ''}${hasImage || values.image ? ' inspiration-card--with-image' : ''}`}
      tabIndex={mode === 'edit' ? -1 : 0}
      role={overlay ? 'dialog' : mode === 'edit' ? undefined : 'group'}
      aria-modal={overlay ? true : undefined}
      aria-label={mode === 'collapsed' ? 'Otwórz podgląd inspiracji' : 'Przejdź do edycji inspiracji'}
      onClick={activate}
      onKeyDown={keyboardActivate}
    >
      {menu}
      {mode === 'edit' ? edit : display}
    </article>
  );

  return (
    <>
      <div ref={slotRef} className={`inspiration-card-slot${isExpanded ? ' inspiration-card-slot--placeholder' : ''}`}>
        {!isExpanded && card()}
      </div>
      {isExpanded && createPortal(
        <>
          <div
            className="inspiration-card__backdrop"
            onMouseDown={() => {
              if (mode === 'preview') closeToSlot();
              else if (mode === 'edit') saveEdit();
            }}
            aria-hidden="true"
          />
          {card(true)}
        </>,
        document.body,
      )}
    </>
  );
}
