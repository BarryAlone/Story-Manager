import { useEffect, useState } from 'react';

export default function ChapterSwapModal({ chapter, chapters, onClose, onSubmit }) {
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!targetId) return;
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit(chapter.id, { target_id: Number(targetId) });
      onClose();
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się zamienić rozdziałów.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chapter-modal" role="presentation">
      <form className="chapter-modal__card chapter-modal__card--small" onSubmit={handleSubmit} aria-labelledby="chapter-swap-title">
        <div className="chapter-modal__header">
          <h2 id="chapter-swap-title">Zamień kolejność</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Zamknij formularz">×</button>
        </div>
        <p>Zamień „{chapter.name}” z innym numerowanym rozdziałem.</p>
        {error && <p className="chapter-modal__error" role="alert">{error}</p>}
        <label>
          Rozdział docelowy
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)} required autoFocus>
            <option value="">Wybierz rozdział</option>
            {chapters
              .filter((item) => (
                item.id !== chapter.id
                && (item.parent_id === null || item.parent_id === undefined)
                && Number(item.chapter_number) > 0
              ))
              .map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="chapter-modal__actions">
          <button type="button" className="chapter-button chapter-button--secondary" onClick={onClose} disabled={isSubmitting}>Anuluj</button>
          <button type="submit" className="chapter-button chapter-button--primary" disabled={isSubmitting || !targetId}>
            {isSubmitting ? 'Zamienianie…' : 'Zamień'}
          </button>
        </div>
      </form>
    </div>
  );
}
