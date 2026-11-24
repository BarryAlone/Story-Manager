import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import NoteBoard from './NoteBoard';
import NoteEditor from './NoteEditor';
import NoteList from './NoteList';
import ProjectChecklist from './ProjectChecklist';
import useProjectNotes from './useProjectNotes';
import './projectNotes.css';

export default function ProjectNotesPage() {
  const { projectId } = useParams();
  const [mode, setMode] = useState('notes');
  const [notesView, setNotesView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [openingNoteId, setOpeningNoteId] = useState(null);
  const [selectionError, setSelectionError] = useState('');
  const openControllerRef = useRef(null);
  const flushRef = useRef(async () => true);
  const {
    clearMutationError,
    createNote,
    deleteNote,
    getNote,
    isLoading,
    isMutating,
    loadError,
    loadNotes,
    mutationError,
    notes,
    updateNote,
  } = useProjectNotes(projectId);

  useEffect(() => {
    openControllerRef.current?.abort();
    Promise.resolve().then(() => {
      setActiveNote(null);
      setOpeningNoteId(null);
      setSelectionError('');
    });
    return () => openControllerRef.current?.abort();
  }, [projectId]);

  const registerFlush = useCallback((flush) => {
    flushRef.current = flush || (async () => true);
  }, []);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('pl-PL');
    if (!query) return notes;
    return notes.filter((note) => note.title.toLocaleLowerCase('pl-PL').includes(query));
  }, [notes, searchQuery]);

  const loadNoteSelection = useCallback(async (noteId) => {
    openControllerRef.current?.abort();
    const controller = new AbortController();
    openControllerRef.current = controller;
    setOpeningNoteId(noteId);
    setSelectionError('');

    try {
      const note = await getNote(noteId, controller.signal);
      setActiveNote(note);
      setNotesView('list');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setSelectionError(error.message || 'Nie udało się otworzyć notatki.');
      }
    } finally {
      if (openControllerRef.current === controller) setOpeningNoteId(null);
    }
  }, [getNote]);

  const openNote = useCallback(async (noteId) => {
    if (activeNote?.id === noteId) {
      setNotesView('list');
      return;
    }

    const canContinue = await flushRef.current();
    if (!canContinue) {
      setSelectionError('Najpierw zapisz lub popraw bieżącą notatkę.');
      return;
    }

    await loadNoteSelection(noteId);
  }, [activeNote?.id, loadNoteSelection]);

  const flushAndRefreshActiveNote = useCallback(async () => {
    if (!(await flushRef.current())) return false;
    if (!activeNote) return true;

    try {
      const refreshed = await getNote(activeNote.id);
      setActiveNote(refreshed);
      return true;
    } catch (error) {
      setSelectionError(error.message || 'Nie udało się odświeżyć zapisanej notatki.');
      return false;
    }
  }, [activeNote, getNote]);

  const createAndOpenNote = async () => {
    if (!(await flushRef.current())) return;
    try {
      const created = await createNote();
      setActiveNote(created);
      setNotesView('list');
      setMode('notes');
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  const togglePin = async (note) => {
    if (!(await flushRef.current())) return;
    try {
      const updated = await updateNote(note.id, { is_pinned: !note.is_pinned });
      if (activeNote?.id === note.id) setActiveNote(updated);
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  const removeNote = async (note) => {
    if (!window.confirm(`Usunąć notatkę „${note.title}”?`)) return;
    try {
      await deleteNote(note.id);
      if (activeNote?.id !== note.id) return;

      const nextSummary = notes.find((entry) => entry.id !== note.id);
      setActiveNote(null);
      if (nextSummary) await loadNoteSelection(nextSummary.id);
    } catch {
      // Komunikat jest prezentowany przez hook.
    }
  };

  const changeMode = async (nextMode) => {
    if (mode === nextMode) return;
    if (mode === 'notes' && !(await flushAndRefreshActiveNote())) return;
    setMode(nextMode);
  };

  const changeNotesView = async (nextView) => {
    if (notesView === nextView) return;
    if (!(await flushAndRefreshActiveNote())) return;
    setNotesView(nextView);
  };

  return (
    <div className="project-notes-page">
      <header className="project-notes-toolbar">
        <div className="project-notes-toolbar__title">
          <h1>Notatki</h1>
          <span>{notes.length} {notes.length === 1 ? 'notatka' : 'notatek'}</span>
        </div>

        <div className="project-notes-segmented" aria-label="Tryb modułu">
          <button
            type="button"
            className={mode === 'notes' ? 'is-active' : ''}
            aria-pressed={mode === 'notes'}
            onClick={() => changeMode('notes')}
          >
            Notatki
          </button>
          <button
            type="button"
            className={mode === 'checklist' ? 'is-active' : ''}
            aria-pressed={mode === 'checklist'}
            onClick={() => changeMode('checklist')}
          >
            Do zrobienia
          </button>
        </div>

        {mode === 'notes' && (
          <div className="project-notes-toolbar__actions">
            <div className="project-notes-segmented" aria-label="Widok notatek">
              <button
                type="button"
                className={notesView === 'list' ? 'is-active' : ''}
                aria-pressed={notesView === 'list'}
                onClick={() => changeNotesView('list')}
              >
                Lista
              </button>
              <button
                type="button"
                className={notesView === 'board' ? 'is-active' : ''}
                aria-pressed={notesView === 'board'}
                onClick={() => changeNotesView('board')}
              >
                Board
              </button>
            </div>
            <button type="button" className="project-notes-primary" onClick={createAndOpenNote} disabled={isMutating}>
              + Nowa notatka
            </button>
          </div>
        )}
      </header>

      {(mutationError || selectionError) && (
        <div className="project-notes-page__error" role="alert">
          <span>{selectionError || mutationError}</span>
          <button type="button" onClick={() => {
            setSelectionError('');
            clearMutationError();
          }} aria-label="Zamknij komunikat">×</button>
        </div>
      )}

      {mode === 'checklist' ? (
        <ProjectChecklist projectId={projectId} />
      ) : isLoading ? (
        <div className="project-notes-state">Ładowanie notatek…</div>
      ) : loadError ? (
        <div className="project-notes-state is-error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={loadNotes}>Spróbuj ponownie</button>
        </div>
      ) : notesView === 'board' ? (
        <NoteBoard
          notes={notes}
          disabled={isMutating}
          onOpen={openNote}
          onDelete={removeNote}
          onTogglePin={togglePin}
        />
      ) : (
        <div className="project-notes-workspace">
          <NoteList
            activeNoteId={activeNote?.id}
            disabled={isMutating}
            notes={filteredNotes}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpen={openNote}
            onDelete={removeNote}
            onTogglePin={togglePin}
          />

          <main className="project-notes-workspace__editor">
            {openingNoteId ? (
              <div className="project-notes-state">Otwieranie notatki…</div>
            ) : activeNote ? (
              <NoteEditor
                note={activeNote}
                disabled={isMutating}
                onUpdate={updateNote}
                onTogglePin={() => togglePin(activeNote)}
                onDelete={() => removeNote(activeNote)}
                registerFlush={registerFlush}
              />
            ) : (
              <div className="project-notes-empty project-notes-empty--editor">
                <h2>Wybierz notatkę</h2>
                <p>Otwórz istniejącą notatkę z listy albo utwórz nową.</p>
                <button type="button" onClick={createAndOpenNote}>Nowa notatka</button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
