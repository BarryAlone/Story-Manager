import { useEffect, useRef, useState } from 'react';

import NoteFormFields from './NoteFormFields';

const EMPTY_VALUES = { content: '', image: null, source: '', title: '' };

export default function NoteCreateDialog({ onClose, onCreate }) {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const canSave = Boolean(values.title.trim() || values.content.trim() || values.image);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      await onCreate(values);
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Nie udało się zapisać notatki.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="note-dialog__backdrop" onMouseDown={() => !isSaving && onClose()}>
      <section
        className="note-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="note-dialog__header">
          <h2 id="note-create-title">Dodaj notatkę</h2>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Zamknij formularz">×</button>
        </header>

        <form onSubmit={submit}>
          <NoteFormFields
            disabled={isSaving}
            idPrefix="new-note"
            values={values}
            onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            onImageChange={(image) => setValues((current) => ({ ...current, image }))}
          />

          {error && <p className="note-form__error" role="alert">{error}</p>}

          <footer className="note-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSaving}>Anuluj</button>
            <button type="submit" className="note-button--primary" disabled={!canSave || isSaving}>
              {isSaving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
