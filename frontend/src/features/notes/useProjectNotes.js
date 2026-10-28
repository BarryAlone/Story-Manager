import { useCallback, useEffect, useState } from 'react';

import { apiFetch, readJson } from '../../api';

async function responseError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;

  return new Error(validationMessage || payload?.message || fallback);
}

async function requestNotes(projectId) {
  const response = await apiFetch(`/api/projects/${projectId}/notes`);
  if (!response.ok) throw await responseError(response, 'Nie udało się pobrać notatek.');
  return response.json();
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
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await apiFetch(`/api/projects/${projectId}/notes`);
      if (!response.ok) throw await responseError(response, 'Nie udało się pobrać notatek.');
      setNotes(await response.json());
    } catch (error) {
      setLoadError(error.message || 'Nie udało się pobrać notatek.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialNotes = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const data = await requestNotes(projectId);
        if (!cancelled) setNotes(data);
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'Nie udało się pobrać notatek.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadInitialNotes();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const createNote = useCallback(async (values) => {
    const response = await apiFetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      body: noteFormData(values),
    });

    if (!response.ok) throw await responseError(response, 'Nie udało się zapisać notatki.');

    const note = await response.json();
    setNotes((current) => [note, ...current]);
    return note;
  }, [projectId]);

  const updateNote = useCallback(async (id, values) => {
    const response = await apiFetch(`/api/project-notes/${id}`, {
      method: 'POST',
      body: noteFormData(values, true),
    });

    if (!response.ok) throw await responseError(response, 'Nie udało się zapisać zmian.');

    const updated = await response.json();
    setNotes((current) => current.map((note) => (note.id === updated.id ? updated : note)));
    return updated;
  }, []);

  const deleteNote = useCallback(async (id) => {
    const response = await apiFetch(`/api/project-notes/${id}`, { method: 'DELETE' });
    if (!response.ok) throw await responseError(response, 'Nie udało się usunąć notatki.');
    setNotes((current) => current.filter((note) => note.id !== id));
  }, []);

  return {
    createNote,
    deleteNote,
    isLoading,
    loadError,
    loadNotes,
    notes,
    updateNote,
  };
}
