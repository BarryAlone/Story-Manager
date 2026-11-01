import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { backendUrl } from '../../api';
import InspirationCardEditor from './InspirationCardEditor';
import InspirationCardMenu from './InspirationCardMenu';
import InspirationCardPreview from './InspirationCardPreview';
import useInspirationCardExpansion from './useInspirationCardExpansion';
import useInspirationEditForm from './useInspirationEditForm';

export default function InspirationCard({ isVisible, mode, inspiration, onDelete, onModeChange, onUpdate }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [returnTarget, setReturnTarget] = useState('preview');
  const deletingRef = useRef(false);
  const finishingRef = useRef(false);
  const returnTimerRef = useRef(null);
  const isExpanded = mode !== 'collapsed';
  const imageUrl = inspiration.image_path ? backendUrl(`/storage/${inspiration.image_path}`) : null;
  const editForm = useInspirationEditForm({ inspiration, onUpdate });
  const isInteractionLocked = editForm.isSaving || isDeleting || isFinishing;
  const hasImage = Boolean(imageUrl && !editForm.removeImage && !editForm.values.image);

  const handleClosed = () => {
    deletingRef.current = false;
    finishingRef.current = false;
    setIsDeleting(false);
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
    deletingRef.current = false;
    finishingRef.current = false;
    setIsDeleting(false);
    setIsFinishing(false);
    editForm.reset();
    setReturnTarget(target);
  };

  const openPreview = () => {
    if (editForm.savingRef.current || deletingRef.current || finishingRef.current || isTransitioningRef.current) return;
    openFromSlot(() => onModeChange('preview'));
  };

  const openEdit = () => {
    if (editForm.savingRef.current || deletingRef.current || finishingRef.current || isTransitioningRef.current) return;
    const target = mode === 'collapsed' ? 'list' : 'preview';
    prepareEdit(target);

    if (mode === 'collapsed') openFromSlot(() => onModeChange('edit'));
    else onModeChange('edit');
  };

  const returnToList = () => {
    if (returnTimerRef.current) return;
    finishingRef.current = true;
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
    if (returnTarget === 'list') returnToList();
    else {
      finishingRef.current = false;
      onModeChange('preview');
    }
  };

  const cancelEdit = () => {
    if (editForm.savingRef.current || finishingRef.current) return;
    finishingRef.current = true;
    editForm.reset();
    finishEdit();
  };

  const saveEdit = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const result = await editForm.save();
    if (result.status === 'saved' || result.status === 'unchanged') {
      finishEdit();
    } else {
      finishingRef.current = false;
    }
  };

  const remove = async () => {
    if (deletingRef.current || editForm.savingRef.current || finishingRef.current) return;
    if (!window.confirm('Czy na pewno chcesz trwale usunąć tę inspirację?')) return;

    deletingRef.current = true;
    setIsDeleting(true);
    editForm.setError('');
    try {
      await onDelete(inspiration.id);
      onModeChange('collapsed');
      window.requestAnimationFrame(() => {
        document.querySelector('.inspirations-toolbar__search input')?.focus({ preventScroll: true });
      });
    } catch (deleteError) {
      editForm.setError(deleteError.message || 'Nie udało się usunąć inspiracji.');
      deletingRef.current = false;
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isExpanded) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      if (mode === 'edit') cancelEdit();
      else if (mode === 'preview') closeToSlot();
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

  const card = (overlay = false) => (
    <article
      ref={overlay ? overlayRef : undefined}
      className={`inspiration-card inspiration-card--${mode}${overlay ? ' inspiration-card--overlay' : ''}${hasImage || editForm.values.image ? ' inspiration-card--with-image' : ''}`}
      tabIndex={mode === 'edit' ? -1 : 0}
      role={overlay ? 'dialog' : mode === 'edit' ? undefined : 'group'}
      aria-modal={overlay ? true : undefined}
      aria-label={mode === 'collapsed' ? 'Otwórz podgląd inspiracji' : 'Przejdź do edycji inspiracji'}
      onClick={activate}
      onKeyDown={keyboardActivate}
    >
      <InspirationCardMenu
        disabled={isInteractionLocked}
        inspirationTitle={inspiration.title}
        mode={mode}
        onDelete={remove}
        onEdit={openEdit}
      />
      {mode === 'edit' ? (
        <InspirationCardEditor
          canSave={editForm.canSave}
          disabled={isInteractionLocked}
          error={editForm.error}
          existingImageUrl={imageUrl}
          inspirationId={inspiration.id}
          isSaving={editForm.isSaving}
          onCancel={cancelEdit}
          onChange={editForm.changeField}
          onImageChange={editForm.changeImage}
          onRemoveImage={editForm.removeCurrentImage}
          onSave={saveEdit}
          removeImage={editForm.removeImage}
          values={editForm.values}
        />
      ) : (
        <InspirationCardPreview
          error={editForm.error}
          expanded={isExpanded}
          imageUrl={imageUrl}
          inspiration={inspiration}
          onImageLoad={() => isExpanded && fitOverlay(true)}
        />
      )}
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
