import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { characterApiError } from './characterApi';

export default function useCharacters(projectId) {
  const [characters, setCharacters] = useState([]);
  const [error, setError] = useState('');
  const collectionControllerRef = useRef(null);
  const characterControllerRef = useRef(null);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    projectIdRef.current = projectId;
    collectionControllerRef.current?.abort();
    characterControllerRef.current?.abort();
    const controller = new AbortController();
    collectionControllerRef.current = controller;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return null;
      setCharacters([]);
      setError('');
      return apiFetch(`/api/projects/${projectId}/characters`, { signal: controller.signal });
    })
      .then(async (response) => {
        if (!response) return null;
        if (!response.ok) throw await characterApiError(response, 'Nie udało się pobrać postaci.');
        return response.json();
      })
      .then((data) => {
        if (data && !controller.signal.aborted && projectIdRef.current === projectId) {
          setCharacters(data.characters || data);
        }
      })
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError' && projectIdRef.current === projectId) {
          setError(requestError.message || 'Nie udało się pobrać postaci.');
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [projectId]);

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
    loadCharacter,
    saveCharacter,
    setError,
  };
}
