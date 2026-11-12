import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { characterApiError } from './characterApi';

export default function useCharacters(projectId) {
  const [characters, setCharacters] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const collectionControllerRef = useRef(null);
  const characterControllerRef = useRef(null);
  const projectIdRef = useRef(projectId);

  const loadCharacters = useCallback(async () => {
    collectionControllerRef.current?.abort();
    characterControllerRef.current?.abort();
    const controller = new AbortController();
    collectionControllerRef.current = controller;
    setError('');
    setIsLoading(true);

    try {
      const response = await apiFetch(`/api/projects/${projectId}/characters`, { signal: controller.signal });
      if (!response.ok) {
        throw await characterApiError(response, 'Nie udało się pobrać postaci.');
      }
      const data = await response.json();

      if (!controller.signal.aborted && projectIdRef.current === projectId) {
        setCharacters(data.characters || data);
      }
    } catch (requestError) {
      if (requestError?.name !== 'AbortError' && projectIdRef.current === projectId) {
        setError(requestError.message || 'Nie udało się pobrać postaci.');
      }
    } finally {
      if (!controller.signal.aborted && projectIdRef.current === projectId) {
        setIsLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    projectIdRef.current = projectId;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      setCharacters([]);
      loadCharacters();
    });

    return () => {
      cancelled = true;
      collectionControllerRef.current?.abort();
    };
  }, [loadCharacters, projectId]);

  useEffect(() => () => characterControllerRef.current?.abort(), []);

  const cancelCharacterRequest = useCallback(() => {
    characterControllerRef.current?.abort();
  }, []);

  const loadCharacter = useCallback(async (characterId) => {
    const requestedProjectId = projectId;
    characterControllerRef.current?.abort();
    const controller = new AbortController();
    characterControllerRef.current = controller;

    try {
      const response = await apiFetch(`/api/characters/${characterId}`, { signal: controller.signal });
      if (!response.ok) throw await characterApiError(response, 'Nie udało się pobrać danych postaci.');
      const payload = await response.json();
      if (controller.signal.aborted || projectIdRef.current !== requestedProjectId) return null;
      return payload.character || payload;
    } catch (requestError) {
      if (requestError?.name === 'AbortError' || projectIdRef.current !== requestedProjectId) return null;
      throw requestError;
    }
  }, [projectId]);

  const saveCharacter = useCallback(async (formData, characterId = null) => {
    const requestedProjectId = projectId;
    const url = characterId ? `/api/characters/${characterId}` : '/api/characters';
    const response = await apiFetch(url, { method: 'POST', body: formData });
    if (!response.ok) throw await characterApiError(response, 'Nie udało się zapisać postaci.');
    const savedCharacter = await response.json();

    if (projectIdRef.current !== requestedProjectId) return null;
    setCharacters((current) => characterId
      ? current.map((character) => Number(character.id) === Number(characterId) ? savedCharacter : character)
      : [...current, savedCharacter]);

    return savedCharacter;
  }, [projectId]);

  const deleteCharacter = useCallback(async (characterId) => {
    const requestedProjectId = projectId;
    const response = await apiFetch(`/api/characters/${characterId}`, { method: 'DELETE' });
    if (!response.ok) throw await characterApiError(response, 'Nie udało się usunąć postaci.');
    if (projectIdRef.current !== requestedProjectId) return false;

    setCharacters((current) => current.filter((character) => Number(character.id) !== Number(characterId)));
    return true;
  }, [projectId]);

  return {
    cancelCharacterRequest,
    characters,
    deleteCharacter,
    error,
    isLoading,
    loadCharacter,
    reload: loadCharacters,
    saveCharacter,
    setError,
  };
}
