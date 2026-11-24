import NoteActionsMenu from './NoteActionsMenu';

export default function NoteList({
  activeNoteId,
  disabled,
  notes,
  onDelete,
  onOpen,
  onTogglePin,
  searchQuery,
  onSearchChange,
}) {
  return (
    <aside className="project-notes-list" aria-label="Lista notatek">
      <label className="project-notes-search">
        <span className="sr-only">Szukaj notatek po tytule</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </svg>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Szukaj notatki"
        />
      </label>

      {notes.length === 0 ? (
        <div className="project-notes-list__empty">
          {searchQuery ? 'Brak notatek pasujących do wyszukiwania.' : 'Nie ma jeszcze notatek.'}
        </div>
      ) : (
        <div className="project-notes-list__items">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`project-notes-list-item${activeNoteId === note.id ? ' is-active' : ''}`}
            >
              <button
                type="button"
                className="project-notes-list-item__main"
                onClick={() => onOpen(note.id)}
                aria-current={activeNoteId === note.id ? 'true' : undefined}
              >
                <span
                  className={`project-notes-list-item__pin${note.is_pinned ? ' is-visible' : ''}`}
                  aria-label={note.is_pinned ? 'Przypięta' : undefined}
                  aria-hidden={note.is_pinned ? undefined : 'true'}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m9 4 6 6M8 9l7 7M14.5 3.5l6 6-3 1-4.5 4.5-2 5-1.5-1.5L8 17l5-2 4.5-4.5zM8 17l-4 4" />
                  </svg>
                </span>
                <span className="project-notes-list-item__title" title={note.title}>{note.title}</span>
              </button>
              <NoteActionsMenu
                note={note}
                disabled={disabled}
                onTogglePin={() => onTogglePin(note)}
                onDelete={() => onDelete(note)}
              />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
