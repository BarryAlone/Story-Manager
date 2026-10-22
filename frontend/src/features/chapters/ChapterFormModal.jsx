import { useEffect, useMemo, useRef, useState } from 'react';
import { backendUrl } from '../../api';

function initialFields(chapter) {
  const isSubchapter = chapter?.parent_id !== null && chapter?.parent_id !== undefined;
  const isDraft = Boolean(chapter) && !chapter.is_in_manuscript;

  return {
    chapterNumber: chapter?.chapter_number || '',
    description: chapter?.description || '',
    displayLabel: chapter?.display_label || '',
    name: chapter?.name || '',
    parentId: isSubchapter ? String(chapter.parent_id) : '',
    placement: isDraft ? 'draft' : (isSubchapter ? 'subchapter' : 'root'),
    timelinePointEnd: chapter?.timeline_point_end || '',
    timelinePointStart: chapter?.timeline_point_start || '',
  };
}

export default function ChapterFormModal({ chapter, onClose, onDelete, onSubmit, parentOptions = [] }) {
  const isExistingDraft = Boolean(chapter) && !chapter.is_in_manuscript;
  const [fields, setFields] = useState(() => initialFields(chapter));
  const [image, setImage] = useState(null);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const imageInputRef = useRef(null);
  const isBusy = isDeleting || isSubmitting;
  const selectedImageUrl = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );
  const currentImageUrl = chapter?.chapter_image && !isImageRemoved
    ? backendUrl(`/storage/${chapter.chapter_image}`)
    : null;
  const imagePreviewUrl = selectedImageUrl || currentImageUrl;

  useEffect(() => () => {
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  }, [selectedImageUrl]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, onClose]);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setFields((current) => ({
      ...current,
      [field]: value,
      ...(field === 'placement' && value === 'root' ? { parentId: '' } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({ chapter, fields, image, removeImage: isImageRemoved });
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się zapisać rozdziału.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setIsDeleting(true);

    const result = await onDelete(chapter);
    if (result?.deleted) {
      onClose();
      return;
    }

    if (result?.error) setError(result.error);
    setIsDeleting(false);
  };

  const handleImageChange = (event) => {
    const nextImage = event.target.files?.[0] || null;
    setImage(nextImage);
    if (nextImage) setIsImageRemoved(false);
  };

  const removeImage = () => {
    setImage(null);
    setIsImageRemoved(true);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  return (
    <div className="chapter-modal" role="presentation">
      <form className="chapter-modal__card" onSubmit={handleSubmit} aria-labelledby="chapter-form-title">
        <div className="chapter-modal__header">
          <h2 id="chapter-form-title">
            {chapter ? 'Edytuj dane rozdziału' : 'Nowy rozdział'}
          </h2>
          <button type="button" onClick={onClose} disabled={isBusy} aria-label="Zamknij formularz">×</button>
        </div>

        {error && <p className="chapter-modal__error" role="alert">{error}</p>}

        {isExistingDraft && (
          <label>
            Umiejscowienie
            <select value={fields.placement} onChange={updateField('placement')}>
              <option value="draft">Szkic</option>
              <option value="root">Rozdział główny</option>
              <option value="subchapter">Podrozdział</option>
            </select>
          </label>
        )}

        {fields.placement === 'subchapter' && isExistingDraft && (
          <label>
            Rozdział nadrzędny
            <select required value={fields.parentId} onChange={updateField('parentId')}>
              <option value="">Wybierz rozdział</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.chapter_number}. {parent.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="chapter-modal__identity">
          {fields.placement === 'draft' && chapter ? (
            <div className="chapter-modal__draft-number">
              <span>Numer</span>
              <strong>Szkic</strong>
            </div>
          ) : (
            <label className="chapter-modal__number-field">
              {fields.placement === 'subchapter' ? 'Numer lokalny' : 'Numer'}
              <input
                type="number"
                min="1"
                step="1"
                required={Boolean(chapter)}
                value={fields.chapterNumber}
                onChange={updateField('chapterNumber')}
              />
            </label>
          )}
          <label className="chapter-modal__title-field">
            Tytuł
            <input type="text" required value={fields.name} onChange={updateField('name')} autoFocus />
          </label>
        </div>

        {!chapter && <p className="chapter-modal__hint">Puste pole numeru utworzy szkic.</p>}
        {fields.placement === 'subchapter' && (
          <p className="chapter-modal__hint">Numer jest unikalny tylko wśród dzieci wybranego rodzica.</p>
        )}

        <div className="chapter-modal__image-field">
          <span className="chapter-modal__field-label">Obraz rozdziału</span>
          <input
            ref={imageInputRef}
            className="chapter-modal__file-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            aria-label="Wybierz obraz rozdziału"
          />
          {imagePreviewUrl ? (
            <div className="chapter-modal__image-row">
              <img src={imagePreviewUrl} alt={`Podgląd obrazu dla ${fields.name || 'rozdziału'}`} />
              <div className="chapter-modal__image-actions">
                <button type="button" onClick={() => imageInputRef.current?.click()} disabled={isBusy}>
                  Zmień obraz
                </button>
                <button type="button" className="chapter-modal__image-remove" onClick={removeImage} disabled={isBusy}>
                  Usuń obraz
                </button>
              </div>
            </div>
          ) : (
            <div className="chapter-modal__image-empty">
              <span>Brak obrazu</span>
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={isBusy}>
                Dodaj obraz
              </button>
            </div>
          )}
        </div>

        <details className="chapter-modal__metadata">
          <summary>Metadane opcjonalne</summary>
          <div className="chapter-modal__metadata-content">
            <div className="chapter-modal__columns">
              <label>
                Początek osi czasu
                <input type="number" value={fields.timelinePointStart} onChange={updateField('timelinePointStart')} />
              </label>
              <label>
                Koniec osi czasu
                <input type="number" value={fields.timelinePointEnd} onChange={updateField('timelinePointEnd')} />
              </label>
            </div>
            <label>
              Etykieta osi
              <input type="text" value={fields.displayLabel} onChange={updateField('displayLabel')} />
            </label>
          </div>
        </details>

        <div className="chapter-modal__actions">
          {chapter && (
            <button
              type="button"
              className="chapter-button chapter-button--danger"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {isDeleting ? 'Usuwanie…' : 'Usuń'}
            </button>
          )}
          <button type="button" className="chapter-button chapter-button--secondary" onClick={onClose} disabled={isBusy}>
            Anuluj
          </button>
          <button type="submit" className="chapter-button chapter-button--primary" disabled={isBusy}>
            {isSubmitting ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  );
}
