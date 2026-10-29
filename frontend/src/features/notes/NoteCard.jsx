import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { backendUrl } from '../../api';
import NoteFormFields from './NoteFormFields';
import useNoteCardExpansion from './useNoteCardExpansion';

function initialValues(note) {
  return {
    content: note.content || '',
    image: null,
    source: note.source || '',
    title: note.title || '',
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

function NoteSource({ expanded, source }) {
  const url = sourceUrl(source);
  const className = `note-card__source${expanded ? ' note-card__source--expanded' : ''}`;

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

export default function NoteCard({ mode, note, onDelete, onModeChange, onUpdate }) {
  const [values, setValues] = useState(() => initialValues(note));
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
  const imageUrl = note.image_path ? backendUrl(`/storage/${note.image_path}`) : null;
  const hasImage = Boolean(imageUrl && !removeImage && !values.image);
  const canSave = Boolean(
    values.title.trim()
    || values.content.trim()
    || values.image
    || (note.image_path && !removeImage)
  );
  const isDirty = useMemo(() => (
    values.title !== (note.title || '')
    || values.content !== (note.content || '')
    || values.source !== (note.source || '')
    || Boolean(values.image)
    || removeImage
  ), [note.content, note.source, note.title, removeImage, values]);
  const handleClosed = () => {
    savingRef.current = false;
    setIsSaving(false);
    setIsFinishing(false);
    onModeChange('collapsed');
  };
  const {
    closeToSlot,
    fitOverlay,
    isTransitioningRef,
    openFromSlot,
    overlayRef,
    slotRef,
  } = useNoteCardExpansion({
    isExpanded,
    layoutKey: mode,
    onClosed: handleClosed,
  });

  const prepareEdit = (target) => {
    if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current);
    returnTimerRef.current = null;
    savingRef.current = false;
    setIsSaving(false);
    setIsFinishing(false);
    setValues(initialValues(note));
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
    setValues(initialValues(note));
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
      const updated = await onUpdate(note.id, { ...values, removeImage });
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
    if (!window.confirm('Czy na pewno chcesz trwale usunąć tę notatkę?')) return;

    savingRef.current = true;
    setIsSaving(true);
    setError('');
    try {
      await onDelete(note.id);
      onModeChange('collapsed');
    } catch (deleteError) {
      setError(deleteError.message || 'Nie udało się usunąć notatki.');
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
    <div className="note-card__menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={`Menu notatki${note.title ? `: ${note.title}` : ''}`}
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
          className="note-card__menu-popover"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {mode !== 'edit' && <button type="button" role="menuitem" onClick={openEdit}>Edytuj</button>}
          <button type="button" role="menuitem" className="note-card__menu-delete" onClick={remove}>Usuń</button>
        </div>,
        document.body,
      )}
    </div>
  );

  const display = (
    <div className="note-card__preview">
      {imageUrl && (
        <div className="note-card__image-wrap">
          <img
            src={imageUrl}
            alt={note.title ? `Zdjęcie notatki: ${note.title}` : 'Zdjęcie notatki'}
            onLoad={() => isExpanded && fitOverlay(true)}
          />
          {note.source && <NoteSource source={note.source} expanded={isExpanded} />}
        </div>
      )}
      {(note.title || note.content) && (
        <div className="note-card__body">
          {note.title && <h2>{note.title}</h2>}
          {note.content && <p>{note.content}</p>}
        </div>
      )}
      {!imageUrl && note.source && (
        <div className="note-card__source-row">
          <NoteSource source={note.source} expanded={isExpanded} />
        </div>
      )}
      {error && <p className="note-form__error" role="alert">{error}</p>}
    </div>
  );

  const edit = (
    <div className="note-card__edit" onClick={(event) => event.stopPropagation()}>
      <NoteFormFields
        disabled={isInteractionLocked}
        existingImageUrl={imageUrl}
        idPrefix={`note-${note.id}`}
        values={values}
        removeImage={removeImage}
        onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        onImageChange={(image) => {
          setValues((current) => ({ ...current, image }));
          if (image) setRemoveImage(false);
        }}
        onRemoveImage={() => setRemoveImage(true)}
      />
      {error && <p className="note-form__error" role="alert">{error}</p>}
      <div className="note-card__edit-actions">
        <button type="button" onClick={cancelEdit} disabled={isInteractionLocked}>Anuluj</button>
        <button
          type="button"
          className="note-button--primary"
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
      className={`note-card note-card--${mode}${overlay ? ' note-card--overlay' : ''}${hasImage || values.image ? ' note-card--with-image' : ''}`}
      tabIndex={mode === 'edit' ? -1 : 0}
      role={mode === 'edit' ? undefined : 'group'}
      aria-label={mode === 'collapsed' ? 'Otwórz podgląd notatki' : 'Przejdź do edycji notatki'}
      onClick={activate}
      onKeyDown={keyboardActivate}
    >
      {menu}
      {mode === 'edit' ? edit : display}
    </article>
  );

  return (
    <>
      <div ref={slotRef} className={`note-card-slot${isExpanded ? ' note-card-slot--placeholder' : ''}`}>
        {!isExpanded && card()}
      </div>
      {isExpanded && (
        <>
          <div
            className="note-card__backdrop"
            onMouseDown={() => {
              if (mode === 'preview') closeToSlot();
              else if (mode === 'edit') saveEdit();
            }}
            aria-hidden="true"
          />
          {card(true)}
        </>
      )}
    </>
  );
}
