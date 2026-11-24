import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { isAbortError, projectNotesApi } from './notesApi';

function sortNotes(notes) {
  return [...notes].sort((first, second) => {
    if (first.is_pinned !== second.is_pinned) return first.is_pinned ? -1 : 1;

    const dateDifference = new Date(second.updated_at) - new Date(first.updated_at);
    return dateDifference || second.id - first.id;
  });
}

function emptyState(projectId) {
  return {
    projectId,
    notes: [],
    isLoading: true,
    loadError: '',
  };
}

export default function useProjectNotes(projectId) {
  const [state, setState] = useState(() => emptyState(projectId));
  const [mutationError, setMutationError] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const currentProjectIdRef = useRef(projectId);
  const loadControllerRef = useRef(null);
  const loadSequenceRef = useRef(0);
  const mutationCountRef = useRef(0);

  useLayoutEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  const loadNotes = useCallback(async () => {
    const requestedProjectId = projectId;
    const sequence = loadSequenceRef.current + 1;
    const controller = new AbortController();

    loadSequenceRef.current = sequence;
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setState(emptyState(requestedProjectId));

    try {
      const notes = await projectNotesApi.list(requestedProjectId, controller.signal);
      if (
        sequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setState({
        projectId: requestedProjectId,
        notes: sortNotes(notes),
        isLoading: false,
        loadError: '',
      });
    } catch (error) {
      if (
        isAbortError(error)
        || sequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setState({
        projectId: requestedProjectId,
        notes: [],
        isLoading: false,
        loadError: error.message || 'Nie udało się pobrać notatek.',
      });
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadNotes();
    });

    return () => {
      cancelled = true;
      loadControllerRef.current?.abort();
    };
  }, [loadNotes]);

  const runMutation = useCallback(async (operation) => {
    mutationCountRef.current += 1;
    setIsMutating(true);
    setMutationError('');

    try {
      return await operation();
    } catch (error) {
      if (!isAbortError(error)) setMutationError(error.message || 'Operacja nie powiodła się.');
      throw error;
    } finally {
      mutationCountRef.current -= 1;
      if (mutationCountRef.current === 0) setIsMutating(false);
    }
  }, []);

  const updateCollection = useCallback((requestedProjectId, updated) => {
    if (currentProjectIdRef.current !== requestedProjectId) return;

    setState((current) => {
      if (current.projectId !== requestedProjectId) return current;

      const exists = current.notes.some((note) => note.id === updated.id);
      const notes = exists
        ? current.notes.map((note) => (note.id === updated.id ? { ...note, ...updated } : note))
        : [updated, ...current.notes];

      return { ...current, notes: sortNotes(notes) };
    });
  }, []);

  const getNote = useCallback(async (noteId, signal) => {
    const requestedProjectId = projectId;
    const note = await projectNotesApi.show(noteId, signal);
    if (currentProjectIdRef.current !== requestedProjectId) {
      throw new DOMException('Żądanie anulowane.', 'AbortError');
    }
    return note;
  }, [projectId]);

  const createNote = useCallback(() => runMutation(async () => {
    const requestedProjectId = projectId;
    const note = await projectNotesApi.create(requestedProjectId, {
      title: 'Nowa notatka',
      content: '',
    });
    updateCollection(requestedProjectId, note);
    return note;
  }), [projectId, runMutation, updateCollection]);

  const updateNote = useCallback((noteId, values, signal) => runMutation(async () => {
    const requestedProjectId = projectId;
    const note = await projectNotesApi.update(noteId, values, signal);
    updateCollection(requestedProjectId, note);
    return note;
  }), [projectId, runMutation, updateCollection]);

  const deleteNote = useCallback((noteId) => runMutation(async () => {
    const requestedProjectId = projectId;
    await projectNotesApi.remove(noteId);
    if (currentProjectIdRef.current !== requestedProjectId) return;

    setState((current) => current.projectId === requestedProjectId
      ? { ...current, notes: current.notes.filter((note) => note.id !== noteId) }
      : current);
  }), [projectId, runMutation]);

  const currentState = state.projectId === projectId ? state : emptyState(projectId);

  return {
    notes: currentState.notes,
    isLoading: currentState.isLoading,
    loadError: currentState.loadError,
    isMutating,
    mutationError,
    clearMutationError: () => setMutationError(''),
    loadNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
  };
}
