import { useEffect, useRef, useState } from 'react';

export default function WorldCategoryDialog({ category, onClose, onSubmit }) {
  const [name, setName] = useState(category?.name || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef(null);
  const isEditing = Boolean(category);

  useEffect(() => {
    const handleDialogKey = (event) => {
      if (event.key === 'Escape' && !isSaving) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled)',
      )];
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKey);
    return () => document.removeEventListener('keydown', handleDialogKey);
  }, [isSaving, onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || isSaving) return;

    setError('');
    setIsSaving(true);
    try {
      await onSubmit(name.trim());
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się zapisać kategorii.');
      setIsSaving(false);
    }
  };

  return (
    <div
      className="world-category-dialog__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="world-category-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-category-dialog-title"
      >
        <header>
          <h2 id="world-category-dialog-title">
            {isEditing ? 'Zmień nazwę kategorii' : 'Nowa kategoria'}
          </h2>
          <button type="button" aria-label="Zamknij formularz" onClick={onClose} disabled={isSaving}>×</button>
        </header>

        <form onSubmit={submit}>
          <label htmlFor="world-category-name">Nazwa kategorii</label>
          <input
            id="world-category-name"
            type="text"
            value={name}
            maxLength={128}
            autoFocus
            disabled={isSaving}
            onChange={(event) => setName(event.target.value)}
          />
          {error && <p className="world-category-dialog__error" role="alert">{error}</p>}
          <footer>
            <button type="button" className="world-button world-button--secondary" onClick={onClose} disabled={isSaving}>
              Anuluj
            </button>
            <button type="submit" className="world-button world-button--primary" disabled={!name.trim() || isSaving}>
              {isSaving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
