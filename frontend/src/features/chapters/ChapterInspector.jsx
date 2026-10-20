import { useEffect } from 'react';
import { backendUrl } from '../../api';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('pl-PL');
}

export default function ChapterInspector({
  chapter,
  draft,
  isOpen,
  onClose,
  onFieldChange,
  onToggle,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const createdAt = formatDate(chapter?.created_at);
  const updatedAt = formatDate(chapter?.updated_at);
  const imageUrl = chapter?.chapter_image ? backendUrl(`/storage/${chapter.chapter_image}`) : null;
  const toggleLabel = isOpen ? 'Ukryj panel informacji' : 'Pokaż panel informacji';

  return (
    <div className={`chapter-inspector__layer${isOpen ? ' chapter-inspector__layer--open' : ''}`}>
      <button
        type="button"
        className="chapter-inspector__toggle"
        onClick={onToggle}
        disabled={!chapter}
        aria-controls="chapter-inspector"
        aria-expanded={isOpen}
        aria-label={toggleLabel}
        data-tooltip={toggleLabel}
      >
        <span aria-hidden="true">{isOpen ? '›' : '‹'}</span>
      </button>

      <aside
        id="chapter-inspector"
        className="chapter-inspector"
        aria-label="Synopsis, notatki i metadane rozdziału"
        aria-hidden={!isOpen}
        inert={!isOpen ? '' : undefined}
      >
        <header className="chapter-inspector__header">
          <span>Informacje o dokumencie</span>
          <strong>{chapter?.name || 'Brak wyboru'}</strong>
        </header>

        <div className="chapter-inspector__content">
          {imageUrl && <img className="chapter-inspector__image" src={imageUrl} alt="Ilustracja rozdziału" />}

          <section>
            <label htmlFor="chapter-synopsis">Synopsis</label>
            <textarea
              id="chapter-synopsis"
              rows="7"
              value={draft.synopsis}
              onChange={(event) => onFieldChange('synopsis', event.target.value)}
              placeholder="Krótko opisz zawartość dokumentu"
            />
          </section>

          <section>
            <label htmlFor="chapter-notes">Notatki</label>
            <textarea
              id="chapter-notes"
              rows="10"
              value={draft.notes}
              onChange={(event) => onFieldChange('notes', event.target.value)}
              placeholder="Zapisz robocze notatki"
            />
          </section>

          <section>
            <h2>Metadane</h2>
            <dl>
              {chapter?.display_label && <><dt>Etykieta</dt><dd>{chapter.display_label}</dd></>}
              {(chapter?.timeline_point_start || chapter?.timeline_point_end) && (
                <><dt>Zakres</dt><dd>{chapter.timeline_point_start || '?'}–{chapter.timeline_point_end || '?'}</dd></>
              )}
              {createdAt && <><dt>Utworzono</dt><dd>{createdAt}</dd></>}
              {updatedAt && <><dt>Zmieniono</dt><dd>{updatedAt}</dd></>}
              {!chapter?.display_label && !chapter?.timeline_point_start && !chapter?.timeline_point_end && !createdAt && !updatedAt && (
                <><dt>Status</dt><dd>Brak dodatkowych metadanych.</dd></>
              )}
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}
