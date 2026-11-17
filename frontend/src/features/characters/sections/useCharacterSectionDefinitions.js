import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { apiFetch } from '../../../api';
import { characterSectionApiError, sortCharacterSections } from './characterSectionApi';

function emptyState(scopeKey) {
  return {
    definitions: [],
    error: '',
    galleryPosition: 0,
    isLoading: Boolean(scopeKey),
    scopeKey,
  };
}

export default function useCharacterSectionDefinitions(projectId) {
  const scopeKey = projectId ? `project:${projectId}` : null;
  const endpoint = projectId ? `/api/projects/${projectId}/character-section-definitions` : null;
  const layoutEndpoint = projectId ? `/api/projects/${projectId}/character-section-layout` : null;
  const [state, setState] = useState(() => emptyState(scopeKey));
  const [isMutating, setIsMutating] = useState(false);
  const controllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const mutationRef = useRef(false);
  const sequenceRef = useRef(0);
  const stateRef = useRef(state);

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const loadDefinitions = useCallback(async ({ preserve = false } = {}) => {
    if (!scopeKey || !layoutEndpoint) {
      controllerRef.current?.abort();
      setState(emptyState(null));
      return;
    }

    const requestedScope = scopeKey;
    const sequence = sequenceRef.current + 1;
    const controller = new AbortController();
    sequenceRef.current = sequence;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setState((current) => (
      preserve && current.scopeKey === requestedScope
        ? { ...current, error: '' }
        : emptyState(requestedScope)
    ));

    try {
      const response = await apiFetch(layoutEndpoint, { signal: controller.signal });
      if (!response.ok) {
        throw await characterSectionApiError(response, 'Nie udało się pobrać układu sekcji.');
      }
      const layout = await response.json();
      if (!isMountedRef.current || sequence !== sequenceRef.current) return;
      setState({
        definitions: sortCharacterSections(layout.definitions || []),
        error: '',
        galleryPosition: Number(layout.gallery_position || 0),
        isLoading: false,
        scopeKey: requestedScope,
      });
    } catch (error) {
      if (error?.name === 'AbortError' || !isMountedRef.current || sequence !== sequenceRef.current) return;
      setState((current) => ({
        definitions: preserve && current.scopeKey === requestedScope ? current.definitions : [],
        error: error.message || 'Nie udało się pobrać definicji sekcji.',
        galleryPosition: preserve && current.scopeKey === requestedScope ? current.galleryPosition : 0,
        isLoading: false,
        scopeKey: requestedScope,
      }));
    }
  }, [layoutEndpoint, scopeKey]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadDefinitions();
    });
    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [loadDefinitions]);

  const runMutation = useCallback(async (
    request,
    updateDefinitions,
    updateGalleryPosition = (current) => current.galleryPosition,
  ) => {
    if (mutationRef.current) throw new Error('Poczekaj na zakończenie bieżącej operacji.');

    const requestedScope = scopeKey;
    mutationRef.current = true;
    if (isMountedRef.current) setIsMutating(true);

    try {
      const result = await request();
      if (isMountedRef.current && stateRef.current.scopeKey === requestedScope) {
        setState((current) => {
          if (current.scopeKey !== requestedScope) return current;
          const definitions = sortCharacterSections(updateDefinitions(current.definitions, result));
          return {
            ...current,
            definitions,
            error: '',
            galleryPosition: Math.min(
              updateGalleryPosition(current, result, definitions),
              definitions.length,
            ),
          };
        });
      }
      return result;
    } finally {
      mutationRef.current = false;
      if (isMountedRef.current) setIsMutating(false);
    }
  }, [scopeKey]);

  const createDefinition = useCallback((title) => runMutation(
    async () => {
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się dodać sekcji.');
      return response.json();
    },
    (definitions, created) => [...definitions, created],
    (current) => current.galleryPosition === current.definitions.length
      ? current.galleryPosition + 1
      : current.galleryPosition,
  ), [endpoint, runMutation]);

  const updateDefinition = useCallback((definitionId, title) => runMutation(
    async () => {
      const response = await apiFetch(`/api/character-section-definitions/${definitionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się zmienić nazwy sekcji.');
      return response.json();
    },
    (definitions, updated) => definitions.map((definition) => (
      Number(definition.id) === Number(updated.id) ? updated : definition
    )),
  ), [runMutation]);

  const reorderDefinitions = useCallback((definitionIds) => runMutation(
    async () => {
      const response = await apiFetch(`${endpoint}/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition_ids: definitionIds }),
      });
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się zmienić kolejności sekcji.');
      return response.json();
    },
    (_definitions, reordered) => reordered,
  ), [endpoint, runMutation]);

  const reorderLayout = useCallback((definitionIds, galleryPosition) => runMutation(
    async () => {
      const response = await apiFetch(layoutEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition_ids: definitionIds,
          gallery_position: galleryPosition,
        }),
      });
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się zmienić układu sekcji.');
      return response.json();
    },
    (_definitions, layout) => layout.definitions,
    (_current, layout) => Number(layout.gallery_position),
  ), [layoutEndpoint, runMutation]);

  const deleteDefinition = useCallback((definitionId, force = false) => runMutation(
    async () => {
      const response = await apiFetch(
        `/api/character-section-definitions/${definitionId}${force ? '?force=true' : ''}`,
        { method: 'DELETE' },
      );
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się usunąć sekcji.');
      return definitionId;
    },
    (definitions, deletedId) => definitions.filter((definition) => (
      Number(definition.id) !== Number(deletedId)
    )),
    (current, deletedId) => {
      const deletedIndex = current.definitions.findIndex((definition) => (
        Number(definition.id) === Number(deletedId)
      ));
      return deletedIndex >= 0 && deletedIndex < current.galleryPosition
        ? current.galleryPosition - 1
        : current.galleryPosition;
    },
  ), [runMutation]);

  const currentState = state.scopeKey === scopeKey ? state : emptyState(scopeKey);

  return {
    createDefinition,
    definitions: currentState.definitions,
    deleteDefinition,
    error: currentState.error,
    galleryPosition: currentState.galleryPosition,
    isLoading: currentState.isLoading,
    isMutating,
    loadDefinitions,
    refreshDefinitions: () => loadDefinitions({ preserve: true }),
    reorderDefinitions,
    reorderLayout,
    updateDefinition,
  };
}
