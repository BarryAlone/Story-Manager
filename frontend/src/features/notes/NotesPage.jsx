import { useState } from 'react';
import { useParams } from 'react-router-dom';

import NoteCard from './NoteCard';
import NoteCreateDialog from './NoteCreateDialog';
import NotesFilters from './NotesFilters';
import useMasonryLayout from './useMasonryLayout';
import useNoteFilters from './useNoteFilters';
import useProjectNotes from './useProjectNotes';
import './notes.css';

export default function NotesPage() {
  const { projectId } = useParams();
  const { createNote, deleteNote, isLoading, loadError, loadNotes, notes, updateNote } = useProjectNotes(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [activeMode, setActiveMode] = useState('collapsed');
  const masonryRef = useMasonryLayout();
  const {
    activeFilterCount,
    applyFilters,
    clearAll,
    filters,
    searchQuery,
    setSearchQuery,
    visibleNotes,
  } = useNoteFilters(notes);
  const activeNote = activeNoteId === null
    ? null
    : notes.find((note) => note.id === activeNoteId) || null;
  const visibleNoteIds = new Set(visibleNotes.map((note) => note.id));
  const renderedNotes = activeNote && !visibleNoteIds.has(activeNote.id)
    ? [...visibleNotes, activeNote]
    : visibleNotes;

  const changeCardMode = (noteId, mode) => {
    if (mode === 'collapsed') {
      setActiveNoteId(null);
      setActiveMode('collapsed');
      return;
    }

    setActiveNoteId(noteId);
    setActiveMode(mode);
  };

  const changeSearchQuery = (nextSearchQuery) => {
    setSearchQuery(nextSearchQuery);
  };

  const changeFilters = (field, value) => {
    const nextFilters = { ...filters, [field]: value };
    if (nextFilters.dateFrom && nextFilters.dateTo && nextFilters.dateTo < nextFilters.dateFrom) return;

    applyFilters(nextFilters);
  };

  return (
    <section className="notes-page">
      <header className="notes-toolbar">
        <div className="notes-toolbar__search">
          <SearchIcon />
          <input
            type="search"
            value={searchQuery}
            placeholder="Szukaj notatek..."
            aria-label="Szukaj notatek"
            onChange={(event) => changeSearchQuery(event.target.value)}
          />
        </div>
        <NotesFilters
          activeFilterCount={activeFilterCount}
          filters={filters}
          onChange={changeFilters}
          onClear={clearAll}
        />
        <button type="button" className="notes-toolbar__add" onClick={() => setIsCreating(true)}>
          <span aria-hidden="true">+</span> Dodaj notatkę
        </button>
      </header>

      <div className="notes-page__content">
        {isLoading && <div className="notes-state" role="status">Ładowanie notatek…</div>}

        {!isLoading && loadError && (
          <div className="notes-state notes-state--error" role="alert">
            <strong>Nie udało się pobrać notatek.</strong>
            <span>{loadError}</span>
            <button type="button" onClick={loadNotes}>Spróbuj ponownie</button>
          </div>
        )}

        {!isLoading && !loadError && notes.length === 0 && (
          <div className="notes-state">
            <strong>Jeszcze nie ma żadnych notatek.</strong>
            <span>Zapisz tytuł, krótką myśl, obraz albo wszystkie te elementy razem.</span>
            <button type="button" onClick={() => setIsCreating(true)}>Dodaj pierwszą notatkę</button>
          </div>
        )}

        {!isLoading && !loadError && notes.length > 0 && visibleNotes.length === 0 && activeNote === null && (
          <div className="notes-state">
            <strong>Brak pasujących notatek.</strong>
            <span>Zmień wyszukiwanie lub wyczyść zastosowane filtry.</span>
            <button type="button" onClick={clearAll}>Wyczyść wyszukiwanie i filtry</button>
          </div>
        )}

        {!isLoading && !loadError && renderedNotes.length > 0 && (
          <div ref={masonryRef} className="notes-masonry" aria-label="Notatki projektu">
            {renderedNotes.map((note) => (
              <div key={note.id} className="notes-masonry__item" data-masonry-item data-note-id={note.id}>
                <NoteCard
                  note={note}
                  isVisible={visibleNoteIds.has(note.id)}
                  mode={activeNoteId === note.id ? activeMode : 'collapsed'}
                  onDelete={deleteNote}
                  onUpdate={updateNote}
                  onModeChange={(mode) => changeCardMode(note.id, mode)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreating && <NoteCreateDialog onClose={() => setIsCreating(false)} onCreate={createNote} />}
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
