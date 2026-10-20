import { useEffect, useState } from 'react';

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

export default function ChapterFormModal({ chapter, onClose, onSubmit, parentOptions = [] }) {
  const isSubchapter = chapter?.parent_id !== null && chapter?.parent_id !== undefined;
  const isExistingDraft = Boolean(chapter) && !chapter.is_in_manuscript;
  const [fields, setFields] = useState(() => initialFields(chapter));
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

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
      await onSubmit({ chapter, fields, image });
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się zapisać rozdziału.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chapter-modal" role="presentation">
      <form className="chapter-modal__card" onSubmit={handleSubmit} aria-labelledby="chapter-form-title">
        <div className="chapter-modal__header">
          <h2 id="chapter-form-title">
            {chapter ? (isSubchapter ? 'Edytuj podrozdział' : 'Edytuj rozdział') : 'Nowy rozdział'}
          </h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Zamknij formularz">×</button>
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

        {fields.placement === 'draft' && chapter ? (
          <p className="chapter-modal__hint">Szkic nie ma numeru.</p>
        ) : (
          <label>
            {fields.placement === 'subchapter' ? 'Numer lokalny' : 'Numer'}
            {!chapter && <span>(puste pole tworzy szkic)</span>}
            <input
              type="number"
              min="1"
              step="1"
              required={Boolean(chapter)}
              value={fields.chapterNumber}
              onChange={updateField('chapterNumber')}
            />
            {fields.placement === 'subchapter' && (
              <span>Numer jest unikalny tylko wśród dzieci wybranego rodzica.</span>
            )}
          </label>
        )}
        <label>
          Tytuł
          <input type="text" required value={fields.name} onChange={updateField('name')} autoFocus />
        </label>
        <label>
          Synopsis
          <textarea rows="4" value={fields.description} onChange={updateField('description')} />
        </label>
        <label>
          Obraz
          <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} />
        </label>
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

        <div className="chapter-modal__actions">
          <button type="button" className="chapter-button chapter-button--secondary" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </button>
          <button type="submit" className="chapter-button chapter-button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  );
}
