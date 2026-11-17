import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../../api';
import { galleryApiError, sortGalleryImages } from './galleryApi';

export default function useCharacterGallery(characterId) {
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(characterId));
  const [isMutating, setIsMutating] = useState(false);
  const loadControllerRef = useRef(null);
  const mutationControllerRef = useRef(null);
  const mountedRef = useRef(false);
  const routeKeyRef = useRef(characterId);
  const sequenceRef = useRef(0);
  const mutationRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    routeKeyRef.current = characterId;
    return () => {
      loadControllerRef.current?.abort();
      mutationControllerRef.current?.abort();
    };
  }, [characterId]);

  const loadImages = useCallback(async ({ preserve = false } = {}) => {
    if (!characterId) {
      setImages([]);
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
      setImages([]);
      setIsLoading(true);
    }

    try {
      const response = await apiFetch(`/api/characters/${characterId}/gallery-images`, {
        signal: controller.signal,
      });
      if (!response.ok) throw await galleryApiError(response, 'Nie udało się pobrać galerii postaci.');
      const payload = await response.json();
      if (!mountedRef.current
        || controller.signal.aborted
        || sequence !== sequenceRef.current
        || Number(routeKeyRef.current) !== Number(requestedCharacterId)) return;
      setImages(sortGalleryImages(payload));
      setIsLoading(false);
    } catch (requestError) {
      if (!mountedRef.current
        || requestError?.name === 'AbortError'
        || sequence !== sequenceRef.current
        || Number(routeKeyRef.current) !== Number(requestedCharacterId)) return;
      setError(requestError.message || 'Nie udało się pobrać galerii postaci.');
      setIsLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadImages();
    });
    return () => {
      cancelled = true;
      loadControllerRef.current?.abort();
    };
  }, [loadImages]);

  const runMutation = useCallback(async (request, updateImages) => {
    if (mutationRef.current) throw new Error('Poczekaj na zakończenie poprzedniej operacji galerii.');

    const requestedCharacterId = characterId;
    const controller = new AbortController();
    mutationControllerRef.current?.abort();
    mutationControllerRef.current = controller;
    mutationRef.current = true;
    setIsMutating(true);

    try {
      const result = await request(controller.signal);
      if (mountedRef.current
        && !controller.signal.aborted
        && Number(routeKeyRef.current) === Number(requestedCharacterId)) {
        setImages((current) => sortGalleryImages(updateImages(current, result)));
      }
      return result;
    } finally {
      mutationRef.current = false;
      if (mountedRef.current && Number(routeKeyRef.current) === Number(requestedCharacterId)) {
        setIsMutating(false);
      }
    }
  }, [characterId]);

  const addImage = useCallback(({ caption, file }) => runMutation(
    async (signal) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', caption);
      const response = await apiFetch(`/api/characters/${characterId}/gallery-images`, {
        method: 'POST',
        body: formData,
        signal,
      });
      if (!response.ok) throw await galleryApiError(response, 'Nie udało się dodać obrazu.');
      return response.json();
    },
    (current, created) => [...current, created],
  ), [characterId, runMutation]);

  const updateCaption = useCallback((imageId, caption) => runMutation(
    async (signal) => {
      const response = await apiFetch(`/api/character-gallery-images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
        signal,
      });
      if (!response.ok) throw await galleryApiError(response, 'Nie udało się zapisać podpisu.');
      return response.json();
    },
    (current, updated) => current.map((image) => (
      Number(image.id) === Number(updated.id) ? updated : image
    )),
  ), [runMutation]);

  const reorderImages = useCallback((orderedIds) => runMutation(
    async (signal) => {
      const response = await apiFetch(`/api/characters/${characterId}/gallery-images/order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_ids: orderedIds }),
        signal,
      });
      if (!response.ok) throw await galleryApiError(response, 'Nie udało się zmienić kolejności galerii.');
      return response.json();
    },
    (_current, reordered) => reordered,
  ), [characterId, runMutation]);

  const deleteImage = useCallback((imageId) => runMutation(
    async (signal) => {
      const response = await apiFetch(`/api/character-gallery-images/${imageId}`, {
        method: 'DELETE',
        signal,
      });
      if (!response.ok) throw await galleryApiError(response, 'Nie udało się usunąć obrazu.');
      return Number(imageId);
    },
    (current, deletedId) => current.filter((image) => Number(image.id) !== deletedId),
  ), [runMutation]);

  return {
    addImage,
    deleteImage,
    error,
    images,
    isLoading,
    isMutating,
    loadImages,
    reorderImages,
    updateCaption,
  };
}
