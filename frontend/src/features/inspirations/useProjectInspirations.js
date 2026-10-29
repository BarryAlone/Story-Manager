import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { apiFetch, readJson } from '../../api';

async function responseError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;

  return new Error(validationMessage || payload?.message || fallback);
}

async function requestInspirations(projectId, signal) {
  const response = await apiFetch(`/api/projects/${projectId}/inspirations`, { signal });
  if (!response.ok) throw await responseError(response, 'Nie udało się pobrać inspiracji.');
  return response.json();
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

function inspirationFormData(values, updating = false) {
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

export default function useProjectInspirations(projectId) {
  const [collection, setCollection] = useState(() => ({
    isLoading: true,
    loadError: '',
    inspirations: [],
    projectId,
  }));
  const currentProjectIdRef = useRef(projectId);
  const loadControllerRef = useRef(null);
  const loadSequenceRef = useRef(0);

  useLayoutEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  const loadInspirations = useCallback(async () => {
    const requestedProjectId = projectId;
    const requestSequence = loadSequenceRef.current + 1;
    const controller = new AbortController();

    loadSequenceRef.current = requestSequence;
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setCollection({
      isLoading: true,
      loadError: '',
      inspirations: [],
      projectId: requestedProjectId,
    });

    try {
      const inspirations = await requestInspirations(requestedProjectId, controller.signal);
      if (
        requestSequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setCollection({
        isLoading: false,
        loadError: '',
        inspirations,
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
        loadError: error.message || 'Nie udało się pobrać inspiracji.',
        inspirations: [],
        projectId: requestedProjectId,
      });
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) loadInspirations();
    });

    return () => {
      cancelled = true;
      loadControllerRef.current?.abort();
    };
  }, [loadInspirations]);

  const createInspiration = useCallback(async (values) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/projects/${requestedProjectId}/inspirations`, {
      method: 'POST',
      body: inspirationFormData(values),
    });

    if (!response.ok) throw await responseError(response, 'Nie udało się zapisać inspiracji.');

    const inspiration = await response.json();
    if (currentProjectIdRef.current === requestedProjectId) {
      setCollection((current) => current.projectId === requestedProjectId
        ? { ...current, inspirations: [inspiration, ...current.inspirations] }
        : current);
    }
    return inspiration;
  }, [projectId]);

  const updateInspiration = useCallback(async (id, values) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/project-inspirations/${id}`, {
      method: 'POST',
      body: inspirationFormData(values, true),
    });

    if (!response.ok) throw await responseError(response, 'Nie udało się zapisać zmian.');

    const updated = await response.json();
    if (currentProjectIdRef.current === requestedProjectId) {
      setCollection((current) => current.projectId === requestedProjectId
        ? {
            ...current,
            inspirations: current.inspirations.map((inspiration) => (inspiration.id === updated.id ? updated : inspiration)),
          }
        : current);
    }
    return updated;
  }, [projectId]);

  const deleteInspiration = useCallback(async (id) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/project-inspirations/${id}`, { method: 'DELETE' });
    if (!response.ok) throw await responseError(response, 'Nie udało się usunąć inspiracji.');

    if (currentProjectIdRef.current === requestedProjectId) {
      setCollection((current) => current.projectId === requestedProjectId
        ? { ...current, inspirations: current.inspirations.filter((inspiration) => inspiration.id !== id) }
        : current);
    }
  }, [projectId]);

  const currentCollection = collection.projectId === projectId
    ? collection
    : { isLoading: true, loadError: '', inspirations: [] };

  return {
    createInspiration,
    deleteInspiration,
    isLoading: currentCollection.isLoading,
    loadError: currentCollection.loadError,
    loadInspirations,
    inspirations: currentCollection.inspirations,
    updateInspiration,
  };
}
