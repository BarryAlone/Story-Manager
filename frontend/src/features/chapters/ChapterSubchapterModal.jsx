import { useEffect, useState } from 'react';

export default function ChapterSubchapterModal({ onClose, onSubmit, parent }) {
  const [name, setName] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [description, setDescription] = useState('');
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
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        parent,
        fields: { chapterNumber, description, name },
      });
    } catch (submitError) {
      setError(submitError.message || 'Nie udało się utworzyć podrozdziału.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chapter-modal" role="presentation">
      <form className="chapter-modal__card chapter-modal__card--small" onSubmit={handleSubmit} aria-labelledby="subchapter-form-title">
        <div className="chapter-modal__header">
          <h2 id="subchapter-form-title">Nowy podrozdział</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Zamknij formularz">×</button>
        </div>

        <p className="chapter-modal__parent">
          <span>Rozdział nadrzędny</span>
          <strong>{parent.chapter_number}. {parent.name}</strong>
        </p>

        {error && <p className="chapter-modal__error" role="alert">{error}</p>}

        <label>
          Numer lokalny
          <input
            type="number"
            min="1"
            step="1"
            required
            value={chapterNumber}
            onChange={(event) => setChapterNumber(event.target.value)}
            autoFocus
          />
          <span>Przykład: numer 2 przy rodzicu 3 zostanie wyświetlony jako 3.2.</span>
        </label>
        <label>
          Tytuł
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Synopsis <span>(opcjonalnie)</span>
          <textarea rows="4" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <div className="chapter-modal__actions">
          <button type="button" className="chapter-button chapter-button--secondary" onClick={onClose} disabled={isSubmitting}>
            Anuluj
          </button>
          <button type="submit" className="chapter-button chapter-button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Tworzenie…' : 'Utwórz podrozdział'}
          </button>
        </div>
      </form>
    </div>
  );
}
