import NoteActionsMenu from './NoteActionsMenu';

function formatUpdatedAt(value) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function NoteBoard({ disabled, notes, onDelete, onOpen, onTogglePin }) {
  if (notes.length === 0) {
    return <div className="project-notes-empty">Nie ma jeszcze notatek do wyświetlenia.</div>;
  }

  return (
    <div className="project-notes-board" aria-label="Board notatek">
      {notes.map((note) => (
        <article key={note.id} className="project-note-card">
          <button
            type="button"
            className="project-note-card__main"
            onClick={() => onOpen(note.id)}
          >
            <span className="project-note-card__title" title={note.title}>{note.title}</span>
            <span className="project-note-card__meta">
              {note.is_pinned && <span className="project-note-card__pin">● Przypięta</span>}
              <time dateTime={note.updated_at}>Zmieniono {formatUpdatedAt(note.updated_at)}</time>
            </span>
          </button>
          <NoteActionsMenu
            note={note}
            disabled={disabled}
            onTogglePin={() => onTogglePin(note)}
            onDelete={() => onDelete(note)}
          />
        </article>
      ))}
    </div>
  );
}
