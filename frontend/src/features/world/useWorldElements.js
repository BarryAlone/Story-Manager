import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { isAbortError, worldApiError } from './worldApi';

function elementFormData(values, updating = false) {
  const formData = new FormData();
  formData.append('name', values.name);
  formData.append('description', values.description);

  if (values.image) formData.append('image', values.image);
  if (values.attributeValues !== undefined) {
    formData.append('attribute_values', JSON.stringify(values.attributeValues));
  }
  if (updating) {
    formData.append('_method', 'PATCH');
    if (values.removeImage && !values.image) formData.append('remove_image', '1');
  }

  return formData;
}

function sortElements(elements) {
  return [...elements].sort((first, second) => (
    first.name.localeCompare(second.name, 'pl', { sensitivity: 'base' })
  ));
}

function searchableText(element) {
  return [element.name, element.description]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pl-PL');
}

function filterElements(elements, searchQuery) {
  const query = searchQuery.trim().toLocaleLowerCase('pl-PL');
  if (!query) return elements;

  return elements.filter((element) => searchableText(element).includes(query));
}

function emptyCollection(categoryId) {
  return {
    categoryId,
    elements: [],
    error: '',
    isLoading: Boolean(categoryId),
  };
}

export default function useWorldElements(categoryId, searchQuery) {
  const [collection, setCollection] = useState(() => emptyCollection(categoryId));
  const [isMutating, setIsMutating] = useState(false);
  const collectionRef = useRef(collection);
  const controllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const mutationRef = useRef(false);
  const sequenceRef = useRef(0);

  useLayoutEffect(() => {
    collectionRef.current = collection;
  }, [collection]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const loadElements = useCallback(async () => {
    if (!categoryId) {
      controllerRef.current?.abort();
      setCollection(emptyCollection(null));
      return;
    }

    const requestedCategoryId = categoryId;
    const sequence = sequenceRef.current + 1;
    const controller = new AbortController();

    sequenceRef.current = sequence;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setCollection(emptyCollection(requestedCategoryId));

    try {
      const response = await apiFetch(
        `/api/world-element-categories/${requestedCategoryId}/world-elements`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się pobrać elementów.');
      }

      const elements = await response.json();
      if (!isMountedRef.current || sequence !== sequenceRef.current) return;

      setCollection({
        categoryId: requestedCategoryId,
        elements: sortElements(elements),
        error: '',
        isLoading: false,
      });
    } catch (error) {
      if (isAbortError(error) || !isMountedRef.current || sequence !== sequenceRef.current) return;

      setCollection({
        categoryId: requestedCategoryId,
        elements: [],
        error: error.message || 'Nie udało się pobrać elementów.',
        isLoading: false,
      });
    }
  }, [categoryId]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) loadElements();
    });

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [loadElements]);

  const runMutation = useCallback(async (request, updateCollection) => {
    if (mutationRef.current) {
      throw new Error('Poczekaj na zakończenie bieżącej operacji.');
    }

    mutationRef.current = true;
    if (isMountedRef.current) setIsMutating(true);

    try {
      const result = await request();
      const shouldReload = collectionRef.current.categoryId === categoryId
        && collectionRef.current.isLoading;

      controllerRef.current?.abort();
      sequenceRef.current += 1;

      if (isMountedRef.current) {
        setCollection((current) => {
          if (current.categoryId !== categoryId) return current;

          return {
            ...current,
            elements: sortElements(updateCollection(current.elements, result)),
            error: '',
            isLoading: false,
          };
        });

        if (shouldReload) Promise.resolve().then(loadElements);
      }

      return result;
    } finally {
      mutationRef.current = false;
      if (isMountedRef.current) setIsMutating(false);
    }
  }, [categoryId, loadElements]);

  const createElement = useCallback((values) => runMutation(
    async () => {
      const response = await apiFetch(
        `/api/world-element-categories/${categoryId}/world-elements`,
        { method: 'POST', body: elementFormData(values) },
      );
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się utworzyć elementu.');
      }
      return response.json();
    },
    (elements, created) => [...elements, created],
  ), [categoryId, runMutation]);

  const updateElement = useCallback((elementId, values) => runMutation(
    async () => {
      const response = await apiFetch(`/api/world-elements/${elementId}`, {
        method: 'POST',
        body: elementFormData(values, true),
      });
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się zapisać elementu.');
      }
      return response.json();
    },
    (elements, updated) => elements.map((element) => (
      Number(element.id) === Number(updated.id) ? updated : element
    )),
  ), [runMutation]);

  const deleteElement = useCallback((elementId) => runMutation(
    async () => {
      const response = await apiFetch(`/api/world-elements/${elementId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się usunąć elementu.');
      }
      return elementId;
    },
    (elements, deletedId) => elements.filter((element) => (
      Number(element.id) !== Number(deletedId)
    )),
  ), [runMutation]);

  const currentCollection = collection.categoryId === categoryId
    ? collection
    : emptyCollection(categoryId);
  const visibleElements = useMemo(
    () => filterElements(currentCollection.elements, searchQuery),
    [currentCollection.elements, searchQuery],
  );

  return {
    createElement,
    deleteElement,
    elements: visibleElements,
    error: currentCollection.error,
    isLoading: currentCollection.isLoading,
    isMutating,
    loadElements,
    updateElement,
  };
}
