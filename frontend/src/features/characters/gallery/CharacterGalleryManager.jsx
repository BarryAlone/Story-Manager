import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import usePanelDismiss from '../../panels/usePanelDismiss';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const UNSAVED_GALLERY_MESSAGE = 'Masz niezapisane zmiany w galerii. Czy chcesz je odrzucić?';

const CharacterGalleryManager = forwardRef(function CharacterGalleryManager({
  isClosing,
  onClose,
  store,
}, ref) {
  const [captionDrafts, setCaptionDrafts] = useState({});
  const [newCaption, setNewCaption] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const panelRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrl = useMemo(
    () => (newFile ? URL.createObjectURL(newFile) : null),
    [newFile],
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    setCaptionDrafts((current) => Object.fromEntries(
      store.images.map((image) => [
        image.id,
        Object.prototype.hasOwnProperty.call(current, image.id)
          ? current[image.id]
          : image.caption || '',
      ]),
    ));
  }, [store.images]);

  const hasCaptionChanges = store.images.some((image) => (
    (captionDrafts[image.id] ?? image.caption ?? '').trim() !== (image.caption || '')
  ));
  const isDirty = Boolean(newFile || newCaption.trim() || hasCaptionChanges);

  const requestDiscard = useCallback(() => {
    if (store.isMutating) return false;
    if (isDirty && !window.confirm(UNSAVED_GALLERY_MESSAGE)) return false;
    return true;
  }, [isDirty, store.isMutating]);

  useImperativeHandle(ref, () => ({ requestDiscard }), [requestDiscard]);

  usePanelDismiss({
    disabled: store.isMutating || isClosing,
    onOutsideClick: onClose,
    panelRef,
  });

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || store.isMutating || isClosing) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', closeWithEscape, true);
    return () => document.removeEventListener('keydown', closeWithEscape, true);
  }, [isClosing, onClose, store.isMutating]);

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    setActionError('');
    setFieldErrors({});
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFieldErrors({ image: ['Wybierz obraz JPG, JPEG, PNG albo WebP.'] });
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setFieldErrors({ image: ['Obraz nie może być większy niż 5 MiB.'] });
      event.target.value = '';
      return;
    }
    setNewFile(file);
  };

  const addImage = async (event) => {
    event.preventDefault();
    if (!newFile || store.isMutating) return;
    setActionError('');
    setFieldErrors({});
    try {
      await store.addImage({ caption: newCaption, file: newFile });
      setNewFile(null);
      setNewCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setActionError(error.message || 'Nie udało się dodać obrazu.');
      setFieldErrors(error.errors || {});
    }
  };

  const saveCaption = async (image) => {
    if (store.isMutating) return;
    setActionError('');
    setFieldErrors({});
    try {
      await store.updateCaption(image.id, captionDrafts[image.id] ?? '');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setActionError(error.message || 'Nie udało się zapisać podpisu.');
    }
  };

  const moveImage = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= store.images.length || store.isMutating) return;
    const orderedIds = store.images.map((image) => image.id);
    [orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]];
    setActionError('');
    try {
      await store.reorderImages(orderedIds);
    } catch (error) {
      if (error?.name !== 'AbortError') setActionError(error.message || 'Nie udało się zmienić kolejności.');
    }
  };

  const deleteImage = async (image) => {
    if (store.isMutating || !window.confirm('Usunąć ten obraz z galerii? Tej operacji nie można cofnąć.')) return;
    setActionError('');
    try {
      await store.deleteImage(image.id);
    } catch (error) {
      if (error?.name !== 'AbortError') setActionError(error.message || 'Nie udało się usunąć obrazu.');
    }
  };

  return (
    <>
      <div className="character-panel-backdrop" aria-hidden="true" />
      <aside
        ref={panelRef}
        className={`world-element-panel character-gallery-manager${isClosing ? ' world-element-panel--closing' : ''}`}
        tabIndex="-1"
        aria-label="Zarządzaj galerią postaci"
      >
        <header className="world-element-panel__header">
          <h2>Zarządzaj galerią</h2>
          <button type="button" aria-label="Zamknij zarządzanie galerią" onClick={onClose} disabled={store.isMutating}>×</button>
        </header>

        <div className="world-element-panel__content character-gallery-manager__content">
          <form className="character-gallery-manager__upload" onSubmit={addImage}>
            <button
              type="button"
              className="character-gallery-manager__picker"
              onClick={() => fileInputRef.current?.click()}
              disabled={store.isMutating}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Podgląd nowego obrazu" />
              ) : (
                <span>Wybierz obraz</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              className="character-gallery-manager__file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseFile}
            />
            {fieldErrors.image?.[0] && <p className="character-gallery-manager__field-error" role="alert">{fieldErrors.image[0]}</p>}

            <label>
              Podpis <span>(opcjonalny)</span>
              <input
                type="text"
                maxLength="255"
                value={newCaption}
                disabled={store.isMutating}
                onChange={(event) => {
                  setNewCaption(event.target.value);
                  setFieldErrors((current) => ({ ...current, caption: undefined }));
                }}
              />
            </label>
            {fieldErrors.caption?.[0] && <p className="character-gallery-manager__field-error" role="alert">{fieldErrors.caption[0]}</p>}
            <button type="submit" className="character-gallery-manager__primary" disabled={!newFile || store.isMutating}>
              {store.isMutating ? 'Zapisywanie…' : 'Dodaj obraz'}
            </button>
          </form>

          {store.error && (
            <div className="character-gallery-manager__error" role="alert">
              <span>{store.error}</span>
              <button type="button" onClick={store.loadImages}>Spróbuj ponownie</button>
            </div>
          )}
          {actionError && <p className="character-gallery-manager__error" role="alert">{actionError}</p>}

          {store.isLoading ? (
            <p className="character-gallery-manager__state" role="status">Ładowanie obrazów…</p>
          ) : (
            <ol className="character-gallery-manager__list">
              {store.images.map((image, index) => {
                const draft = captionDrafts[image.id] ?? image.caption ?? '';
                const captionChanged = draft.trim() !== (image.caption || '');
                return (
                  <li key={image.id}>
                    <img src={image.image_url} alt={image.caption || `Obraz ${index + 1} galerii`} />
                    <div className="character-gallery-manager__item-content">
                      <label>
                        Podpis
                        <input
                          type="text"
                          maxLength="255"
                          value={draft}
                          disabled={store.isMutating}
                          onChange={(event) => setCaptionDrafts((current) => ({
                            ...current,
                            [image.id]: event.target.value,
                          }))}
                        />
                      </label>
                      <div className="character-gallery-manager__item-actions">
                        <button type="button" aria-label={`Przesuń obraz ${index + 1} w górę`} title="Przesuń w górę" disabled={index === 0 || store.isMutating} onClick={() => moveImage(index, -1)}>↑</button>
                        <button type="button" aria-label={`Przesuń obraz ${index + 1} w dół`} title="Przesuń w dół" disabled={index === store.images.length - 1 || store.isMutating} onClick={() => moveImage(index, 1)}>↓</button>
                        <button type="button" disabled={!captionChanged || store.isMutating} onClick={() => saveCaption(image)}>Zapisz podpis</button>
                        <button type="button" className="character-gallery-manager__delete" disabled={store.isMutating} onClick={() => deleteImage(image)}>Usuń</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>
    </>
  );
});

export default CharacterGalleryManager;
