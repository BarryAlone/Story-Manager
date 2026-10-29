import { useEffect, useRef, useState } from 'react';

import InspirationFormFields from './InspirationFormFields';

const EMPTY_VALUES = { content: '', image: null, source: '', title: '' };

export default function InspirationCreateDialog({ onClose, onCreate }) {
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
      setError(saveError.message || 'Nie udało się zapisać inspiracji.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="inspiration-dialog__backdrop" onMouseDown={() => !isSaving && onClose()}>
      <section
        className="inspiration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspiration-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="inspiration-dialog__header">
          <h2 id="inspiration-create-title">Dodaj inspirację</h2>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Zamknij formularz">×</button>
        </header>

        <form onSubmit={submit}>
          <InspirationFormFields
            disabled={isSaving}
            idPrefix="new-inspiration"
            values={values}
            onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            onImageChange={(image) => setValues((current) => ({ ...current, image }))}
          />

          {error && <p className="inspiration-form__error" role="alert">{error}</p>}

          <footer className="inspiration-dialog__actions">
            <button type="button" onClick={onClose} disabled={isSaving}>Anuluj</button>
            <button type="submit" className="inspiration-button--primary" disabled={!canSave || isSaving}>
              {isSaving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
