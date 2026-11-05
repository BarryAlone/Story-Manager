import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { apiFetch, readJson } from '../../api';

function emptyState(scopeKey) {
  return {
    definitions: [],
    error: '',
    isLoading: Boolean(scopeKey),
    scopeKey,
  };
}

function sortDefinitions(definitions) {
  return [...definitions].sort((first, second) => (
    Number(first.sort_order) - Number(second.sort_order)
    || Number(first.id) - Number(second.id)
  ));
}

async function definitionApiError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;
  const error = new Error(validationMessage || payload?.message || fallback);

  error.errors = payload?.errors || {};
  error.status = response.status;
  error.valuesCount = Number(payload?.values_count || 0);

  return error;
}

export default function useAttributeDefinitions({ collectionEndpoint, scopeKey }) {
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
    if (!scopeKey || !collectionEndpoint) {
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
      const response = await apiFetch(collectionEndpoint, { signal: controller.signal });
      if (!response.ok) {
        throw await definitionApiError(response, 'Nie udało się pobrać definicji atrybutów.');
      }

      const definitions = await response.json();
      if (!isMountedRef.current || sequence !== sequenceRef.current) return;

      setState({
        definitions: sortDefinitions(definitions),
        error: '',
        isLoading: false,
        scopeKey: requestedScope,
      });
    } catch (error) {
      if (error?.name === 'AbortError' || !isMountedRef.current || sequence !== sequenceRef.current) return;

      setState((current) => ({
        definitions: preserve && current.scopeKey === requestedScope
          ? current.definitions
          : [],
        error: error.message || 'Nie udało się pobrać definicji atrybutów.',
        isLoading: false,
        scopeKey: requestedScope,
      }));
    }
  }, [collectionEndpoint, scopeKey]);

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
          definitions: sortDefinitions(updateDefinitions(current.definitions, result)),
          error: '',
        });
      }

      return result;
    } finally {
      mutationRef.current = false;
      if (isMountedRef.current) setIsMutating(false);
    }
  }, [scopeKey]);

  const createDefinition = useCallback((values) => runMutation(
    async () => {
      const response = await apiFetch(collectionEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw await definitionApiError(response, 'Nie udało się dodać atrybutu.');
      return response.json();
    },
    (definitions, created) => [...definitions, created],
  ), [collectionEndpoint, runMutation]);

  const updateDefinition = useCallback((definitionId, values) => runMutation(
    async () => {
      const response = await apiFetch(`/api/attribute-definitions/${definitionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw await definitionApiError(response, 'Nie udało się zapisać atrybutu.');
      return response.json();
    },
    (definitions, updated) => definitions.map((definition) => (
      Number(definition.id) === Number(updated.id) ? updated : definition
    )),
  ), [runMutation]);

  const deleteDefinition = useCallback((definitionId, force = false) => runMutation(
    async () => {
      const suffix = force ? '?force=true' : '';
      const response = await apiFetch(`/api/attribute-definitions/${definitionId}${suffix}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw await definitionApiError(response, 'Nie udało się usunąć atrybutu.');
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
    updateDefinition,
  };
}
