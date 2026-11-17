import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../../api';
import { characterSectionApiError, sortCharacterSections } from './characterSectionApi';

export default function useCharacterSectionContents(characterId) {
  const [sections, setSections] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(characterId));
  const [isMutating, setIsMutating] = useState(false);
  const loadControllerRef = useRef(null);
  const mutationControllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const routeKeyRef = useRef(characterId);
  const sequenceRef = useRef(0);
  const mutationRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    routeKeyRef.current = characterId;
    return () => {
      loadControllerRef.current?.abort();
      mutationControllerRef.current?.abort();
    };
  }, [characterId]);

  const loadSections = useCallback(async ({ preserve = false } = {}) => {
    if (!characterId) {
      setSections([]);
      setError('');
      setIsLoading(false);
      return;
    }

    const requestedCharacterId = characterId;
    const sequence = sequenceRef.current + 1;
    const controller = new AbortController();
    sequenceRef.current = sequence;
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setError('');
    if (!preserve) {
      setSections([]);
      setIsLoading(true);
    }

    try {
      const response = await apiFetch(`/api/characters/${characterId}/section-contents`, {
        signal: controller.signal,
      });
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się pobrać sekcji postaci.');
      const payload = await response.json();
      if (!isMountedRef.current
        || controller.signal.aborted
        || sequence !== sequenceRef.current
        || Number(routeKeyRef.current) !== Number(requestedCharacterId)) return;
      setSections(sortCharacterSections(payload));
      setIsLoading(false);
    } catch (requestError) {
      if (!isMountedRef.current
        || requestError?.name === 'AbortError'
        || sequence !== sequenceRef.current
        || Number(routeKeyRef.current) !== Number(requestedCharacterId)) return;
      setError(requestError.message || 'Nie udało się pobrać sekcji postaci.');
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadSections();
    });
    return () => {
      cancelled = true;
      loadControllerRef.current?.abort();
    };
  }, [loadSections]);

  const runMutation = useCallback(async (request, updateSections) => {
    if (mutationRef.current) throw new Error('Poczekaj na zakończenie zapisu sekcji.');

    const requestedCharacterId = characterId;
    const controller = new AbortController();
    mutationControllerRef.current?.abort();
    mutationControllerRef.current = controller;
    mutationRef.current = true;
    setIsMutating(true);

    try {
      const result = await request(controller.signal);
      if (isMountedRef.current
        && !controller.signal.aborted
        && Number(routeKeyRef.current) === Number(requestedCharacterId)) {
        setSections((current) => sortCharacterSections(updateSections(current, result)));
      }
      return result;
    } finally {
      mutationRef.current = false;
      if (isMountedRef.current && Number(routeKeyRef.current) === Number(requestedCharacterId)) setIsMutating(false);
    }
  }, [characterId]);

  const saveContent = useCallback((definitionId, content) => runMutation(
    async (signal) => {
      const response = await apiFetch(
        `/api/characters/${characterId}/section-contents/${definitionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          signal,
        },
      );
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się zapisać treści sekcji.');
      return response.json();
    },
    (current, saved) => current.map((section) => (
      Number(section.id) === Number(definitionId)
        ? { ...section, content_id: saved.id, content: saved.content }
        : section
    )),
  ), [characterId, runMutation]);

  const clearContent = useCallback((definitionId) => runMutation(
    async (signal) => {
      const response = await apiFetch(
        `/api/characters/${characterId}/section-contents/${definitionId}`,
        { method: 'DELETE', signal },
      );
      if (!response.ok) throw await characterSectionApiError(response, 'Nie udało się wyczyścić treści sekcji.');
      return definitionId;
    },
    (current, clearedId) => current.map((section) => (
      Number(section.id) === Number(clearedId)
        ? { ...section, content_id: null, content: null }
        : section
    )),
  ), [characterId, runMutation]);

  const syncDefinitions = useCallback((definitions) => {
    setSections((current) => {
      const byId = new Map(current.map((section) => [Number(section.id), section]));
      return sortCharacterSections(definitions.map((definition) => ({
        ...byId.get(Number(definition.id)),
        id: definition.id,
        title: definition.title,
        sort_order: definition.sort_order,
        content_id: byId.get(Number(definition.id))?.content_id ?? null,
        content: byId.get(Number(definition.id))?.content ?? null,
      })));
    });
  }, []);

  return {
    clearContent,
    error,
    isLoading,
    isMutating,
    loadSections,
    refreshSections: () => loadSections({ preserve: true }),
    saveContent,
    sections,
    syncDefinitions,
  };
}
