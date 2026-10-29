import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { apiFetch, readJson } from '../../api';

async function responseError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;

  return new Error(validationMessage || payload?.message || fallback);
}

async function requestNotes(projectId, signal) {
  const response = await apiFetch(`/api/projects/${projectId}/notes`, { signal });
  if (!response.ok) throw await responseError(response, 'Nie udało się pobrać notatek.');
  return response.json();
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

function noteFormData(values, updating = false) {
  const formData = new FormData();
  formData.append('title', values.title);
  formData.append('content', values.content);
  formData.append('source', values.source);

  if (values.image) formData.append('image', values.image);
  if (updating) {
    formData.append('_method', 'PATCH');
    formData.append('remove_image', values.removeImage ? '1' : '0');
  }

  return formData;
}

export default function useProjectNotes(projectId) {
  const [collection, setCollection] = useState(() => ({
    isLoading: true,
    loadError: '',
    notes: [],
    projectId,
  }));
  const currentProjectIdRef = useRef(projectId);
  const loadControllerRef = useRef(null);
  const loadSequenceRef = useRef(0);

  useLayoutEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  const loadNotes = useCallback(async () => {
    const requestedProjectId = projectId;
    const requestSequence = loadSequenceRef.current + 1;
    const controller = new AbortController();

    loadSequenceRef.current = requestSequence;
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setCollection({
      isLoading: true,
      loadError: '',
      notes: [],
      projectId: requestedProjectId,
    });

    try {
      const notes = await requestNotes(requestedProjectId, controller.signal);
      if (
        requestSequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setCollection({
        isLoading: false,
        loadError: '',
        notes,
        projectId: requestedProjectId,
      });
    } catch (error) {
      if (
        isAbortError(error)
        || requestSequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setCollection({
        isLoading: false,
        loadError: error.message || 'Nie udało się pobrać notatek.',
        notes: [],
        projectId: requestedProjectId,
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

  const createNote = useCallback(async (values) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/projects/${requestedProjectId}/notes`, {
      method: 'POST',
      body: noteFormData(values),
    });

    if (!response.ok) throw await responseError(response, 'Nie udało się zapisać notatki.');

    const note = await response.json();
    if (currentProjectIdRef.current === requestedProjectId) {
      setCollection((current) => current.projectId === requestedProjectId
        ? { ...current, notes: [note, ...current.notes] }
        : current);
    }
    return note;
  }, [projectId]);

  const updateNote = useCallback(async (id, values) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/project-notes/${id}`, {
      method: 'POST',
      body: noteFormData(values, true),
    });

    if (!response.ok) throw await responseError(response, 'Nie udało się zapisać zmian.');

    const updated = await response.json();
    if (currentProjectIdRef.current === requestedProjectId) {
      setCollection((current) => current.projectId === requestedProjectId
        ? {
            ...current,
            notes: current.notes.map((note) => (note.id === updated.id ? updated : note)),
          }
        : current);
    }
    return updated;
  }, [projectId]);

  const deleteNote = useCallback(async (id) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/project-notes/${id}`, { method: 'DELETE' });
    if (!response.ok) throw await responseError(response, 'Nie udało się usunąć notatki.');

    if (currentProjectIdRef.current === requestedProjectId) {
      setCollection((current) => current.projectId === requestedProjectId
        ? { ...current, notes: current.notes.filter((note) => note.id !== id) }
        : current);
    }
  }, [projectId]);

  const currentCollection = collection.projectId === projectId
    ? collection
    : { isLoading: true, loadError: '', notes: [] };

  return {
    createNote,
    deleteNote,
    isLoading: currentCollection.isLoading,
    loadError: currentCollection.loadError,
    loadNotes,
    notes: currentCollection.notes,
    updateNote,
  };
}
