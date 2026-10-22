import { useEffect, useState } from 'react';

export default function ChapterStructureMoveModal({ move, onClose, onSubmit }) {
  const suggestedNumber = Number(move.chapter.chapter_number) > 0
    ? String(move.chapter.chapter_number)
    : '';
  const [chapterNumber, setChapterNumber] = useState(suggestedNumber);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubchapter = move.kind === 'parent';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(Number(chapterNumber));
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się przenieść rozdziału.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chapter-modal" role="presentation">
      <form className="chapter-modal__card chapter-modal__card--small" onSubmit={handleSubmit} aria-labelledby="chapter-move-title">
        <div className="chapter-modal__header">
          <h2 id="chapter-move-title">
            {isSubchapter ? 'Przenieś podrozdział' : 'Przenieś jako rozdział główny'}
          </h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Zamknij formularz">×</button>
        </div>

        <p className="chapter-modal__parent">
          <span>Przenoszony dokument</span>
          <strong>{move.chapter.name}</strong>
        </p>

        {isSubchapter && (
          <p className="chapter-modal__parent">
            <span>Nowy rozdział nadrzędny</span>
            <strong>{`${move.parent.chapter_number}. ${move.parent.name}`}</strong>
          </p>
        )}

        {error && <p className="chapter-modal__error" role="alert">{error}</p>}

        <label>
          {isSubchapter ? 'Numer lokalny podrozdziału' : 'Numer rozdziału'}
          <input
            type="number"
            min="1"
            step="1"
            required
            value={chapterNumber}
            onChange={(event) => setChapterNumber(event.target.value)}
            autoFocus
          />
        </label>

        <div className="chapter-modal__actions">
          <button type="button" className="chapter-button chapter-button--secondary" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </button>
          <button type="submit" className="chapter-button chapter-button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Przenoszenie…' : 'Zatwierdź przeniesienie'}
          </button>
        </div>
      </form>
    </div>
  );
}
