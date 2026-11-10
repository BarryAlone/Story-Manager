import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { appendCharacterAttributeValues, characterApiError } from './characterApi';

export default function useCharacterDetails({ characterId, projectId }) {
  const [character, setCharacter] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const requestControllerRef = useRef(null);
  const savingRef = useRef(false);
  const routeKeyRef = useRef(`${projectId}:${characterId}`);

  useEffect(() => {
    const routeKey = `${projectId}:${characterId}`;
    routeKeyRef.current = routeKey;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return null;
      setCharacter(null);
      setLoadError('');
      setSaveError('');
      setFieldErrors({});
      setIsSaving(false);
      savingRef.current = false;
      return apiFetch(`/api/projects/${projectId}/characters/${characterId}`, { signal: controller.signal });
    })
      .then(async (response) => {
        if (!response) return null;
        if (!response.ok) throw await characterApiError(response, 'Nie udało się pobrać danych postaci.');
        return response.json();
      })
      .then((data) => {
        if (!data || controller.signal.aborted || routeKeyRef.current !== routeKey) return;
        setCharacter(data.character || data);
      })
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError' && routeKeyRef.current === routeKey) {
          setLoadError(requestError.message || 'Nie udało się pobrać danych postaci.');
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [characterId, projectId]);

  const saveCharacter = useCallback(async ({ attributeValues, form }) => {
    if (savingRef.current) return null;

    const requestedRouteKey = `${projectId}:${characterId}`;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    setFieldErrors({});

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('group_name', form.group_name || '');
    formData.append('description', form.description || '');
    formData.append('description_long', form.description_long || '');
    appendCharacterAttributeValues(formData, attributeValues);
    if (form.imageFile) formData.append('character_image', form.imageFile);
    formData.append('_method', 'PUT');

    try {
      const response = await apiFetch(`/api/characters/${characterId}`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw await characterApiError(response, 'Nie udało się zapisać zmian.');
      const updatedCharacter = await response.json();
      if (routeKeyRef.current !== requestedRouteKey) return null;

      setCharacter(updatedCharacter);
      return updatedCharacter;
    } catch (requestError) {
      if (routeKeyRef.current !== requestedRouteKey) return null;
      setFieldErrors(requestError.errors || {});
      setSaveError(requestError.message || 'Nie udało się zapisać zmian.');
      return null;
    } finally {
      savingRef.current = false;
      if (routeKeyRef.current === requestedRouteKey) setIsSaving(false);
    }
  }, [characterId, projectId]);

  const clearSaveState = useCallback(() => {
    setFieldErrors({});
    setSaveError('');
  }, []);

  const clearFieldError = useCallback((field) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  return {
    character,
    clearFieldError,
    clearSaveState,
    fieldErrors,
    isSaving,
    loadError,
    saveCharacter,
    saveError,
  };
}
