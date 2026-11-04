import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { isAbortError, worldApiError } from './worldApi';

function sortCategories(categories) {
  return [...categories].sort((first, second) => (
    first.name.localeCompare(second.name, 'pl', { sensitivity: 'base' })
  ));
}

export default function useWorldElementCategories(projectId) {
  const [collection, setCollection] = useState(() => ({
    categories: [],
    error: '',
    isLoading: true,
    projectId,
  }));
  const [isMutating, setIsMutating] = useState(false);
  const currentProjectIdRef = useRef(projectId);
  const isMountedRef = useRef(false);
  const loadControllerRef = useRef(null);
  const loadSequenceRef = useRef(0);
  const mutationRef = useRef(false);

  useLayoutEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      loadControllerRef.current?.abort();
    };
  }, []);

  const loadCategories = useCallback(async () => {
    const requestedProjectId = projectId;
    const sequence = loadSequenceRef.current + 1;
    const controller = new AbortController();

    loadSequenceRef.current = sequence;
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setCollection({
      categories: [],
      error: '',
      isLoading: true,
      projectId: requestedProjectId,
    });

    try {
      const response = await apiFetch(
        `/api/projects/${requestedProjectId}/world-element-categories`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się pobrać kategorii.');
      }

      const categories = await response.json();
      if (
        !isMountedRef.current
        || sequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setCollection({
        categories,
        error: '',
        isLoading: false,
        projectId: requestedProjectId,
      });
    } catch (error) {
      if (
        isAbortError(error)
        || !isMountedRef.current
        || sequence !== loadSequenceRef.current
        || currentProjectIdRef.current !== requestedProjectId
      ) return;

      setCollection({
        categories: [],
        error: error.message || 'Nie udało się pobrać kategorii.',
        isLoading: false,
        projectId: requestedProjectId,
      });
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) loadCategories();
    });

    return () => {
      cancelled = true;
      loadControllerRef.current?.abort();
    };
  }, [loadCategories]);

  const runMutation = useCallback(async (request, applyResult) => {
    if (mutationRef.current) {
      throw new Error('Poczekaj na zakończenie bieżącej operacji.');
    }

    mutationRef.current = true;
    if (isMountedRef.current) setIsMutating(true);

    try {
      const requestedProjectId = projectId;
      const result = await request(requestedProjectId);

      if (isMountedRef.current && currentProjectIdRef.current === requestedProjectId) {
        setCollection((current) => (
          current.projectId === requestedProjectId
            ? { ...current, categories: sortCategories(applyResult(current.categories, result)) }
            : current
        ));
      }

      return result;
    } finally {
      mutationRef.current = false;
      if (isMountedRef.current) setIsMutating(false);
    }
  }, [projectId]);

  const createCategory = useCallback((name) => runMutation(
    async (requestedProjectId) => {
      const response = await apiFetch(
        `/api/projects/${requestedProjectId}/world-element-categories`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      );
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się utworzyć kategorii.');
      }
      return response.json();
    },
    (categories, category) => [...categories, category],
  ), [runMutation]);

  const updateCategory = useCallback((categoryId, name) => runMutation(
    async () => {
      const response = await apiFetch(`/api/world-element-categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się zmienić nazwy kategorii.');
      }
      return response.json();
    },
    (categories, updated) => categories.map((category) => (
      Number(category.id) === Number(updated.id) ? updated : category
    )),
  ), [runMutation]);

  const deleteCategory = useCallback((categoryId) => runMutation(
    async () => {
      const response = await apiFetch(`/api/world-element-categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się usunąć kategorii.');
      }
      return categoryId;
    },
    (categories, deletedId) => categories.filter((category) => (
      Number(category.id) !== Number(deletedId)
    )),
  ), [runMutation]);

  const adjustItemsCount = useCallback((categoryId, delta) => {
    setCollection((current) => {
      if (current.projectId !== currentProjectIdRef.current) return current;

      return {
        ...current,
        categories: current.categories.map((category) => (
          Number(category.id) === Number(categoryId)
            ? {
                ...category,
                items_count: Math.max(0, Number(category.items_count || 0) + delta),
              }
            : category
        )),
      };
    });
  }, []);

  const currentCollection = collection.projectId === projectId
    ? collection
    : { categories: [], error: '', isLoading: true };

  return {
    adjustItemsCount,
    categories: currentCollection.categories,
    createCategory,
    deleteCategory,
    error: currentCollection.error,
    isLoading: currentCollection.isLoading,
    isMutating,
    loadCategories,
    updateCategory,
  };
}
