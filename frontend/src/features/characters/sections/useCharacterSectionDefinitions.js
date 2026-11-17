import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { apiFetch } from '../../../api';
import { characterSectionApiError, sortCharacterSections } from './characterSectionApi';

function emptyState(scopeKey) {
  return {
    definitions: [],
    error: '',
    isLoading: Boolean(scopeKey),
    scopeKey,
  };
}

export default function useCharacterSectionDefinitions(projectId) {
  const scopeKey = projectId ? `project:${projectId}` : null;
  const endpoint = projectId ? `/api/projects/${projectId}/character-section-definitions` : null;
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
    if (!scopeKey || !endpoint) {
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
      const response = await apiFetch(endpoint, { signal: controller.signal });
      if (!response.ok) {
        throw await characterSectionApiError(response, 'Nie udało się pobrać definicji sekcji.');
      }
      const definitions = await response.json();
      if (!isMountedRef.current || sequence !== sequenceRef.current) return;
      setState({
        definitions: sortCharacterSections(definitions),
        error: '',
        isLoading: false,
        scopeKey: requestedScope,
      });
    } catch (error) {
      if (error?.name === 'AbortError' || !isMountedRef.current || sequence !== sequenceRef.current) return;
      setState((current) => ({
        definitions: preserve && current.scopeKey === requestedScope ? current.definitions : [],
        error: error.message || 'Nie udało się pobrać definicji sekcji.',
        isLoading: false,
        scopeKey: requestedScope,
      }));
    }
  }, [endpoint, scopeKey]);

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

  const runMutation = useCallback(async (request, updateDefinitions) => {
    if (mutationRef.current) throw new Error('Poczekaj na zakończenie bieżącej operacji.');

    const requestedScope = scopeKey;
    mutationRef.current = true;
    if (isMountedRef.current) setIsMutating(true);

    try {
      const result = await request();
      if (isMountedRef.current && stateRef.current.scopeKey === requestedScope) {
        setState((current) => current.scopeKey !== requestedScope ? current : {
          ...current,
          definitions: sortCharacterSections(updateDefinitions(current.definitions, result)),
          error: '',
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
  ), [runMutation]);

  const currentState = state.scopeKey === scopeKey ? state : emptyState(scopeKey);

  return {
    createDefinition,
    definitions: currentState.definitions,
    deleteDefinition,
    error: currentState.error,
    isLoading: currentState.isLoading,
    isMutating,
    loadDefinitions,
    refreshDefinitions: () => loadDefinitions({ preserve: true }),
    reorderDefinitions,
    updateDefinition,
  };
}
