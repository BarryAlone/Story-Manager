import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { isAbortError, worldApiError } from './worldApi';

export default function useWorldElements(categoryId, searchQuery) {
  const [debouncedSearch, setDebouncedSearch] = useState(() => ({ categoryId, value: '' }));
  const [collection, setCollection] = useState(() => ({
    categoryId,
    elements: [],
    error: '',
    isLoading: Boolean(categoryId),
    search: '',
  }));
  const controllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const sequenceRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.abort();
    sequenceRef.current += 1;

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch({ categoryId, value: searchQuery.trim() });
    }, 275);

    return () => window.clearTimeout(timeoutId);
  }, [categoryId, searchQuery]);

  const effectiveSearch = debouncedSearch.categoryId === categoryId
    ? debouncedSearch.value
    : '';

  const loadElements = useCallback(async () => {
    if (!categoryId) {
      controllerRef.current?.abort();
      setCollection({ categoryId: null, elements: [], error: '', isLoading: false, search: '' });
      return;
    }

    const requestedCategoryId = categoryId;
    const requestedSearch = effectiveSearch;
    const sequence = sequenceRef.current + 1;
    const controller = new AbortController();
    const search = requestedSearch ? `?search=${encodeURIComponent(requestedSearch)}` : '';

    sequenceRef.current = sequence;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setCollection({
      categoryId: requestedCategoryId,
      elements: [],
      error: '',
      isLoading: true,
      search: requestedSearch,
    });

    try {
      const response = await apiFetch(
        `/api/world-element-categories/${requestedCategoryId}/world-elements${search}`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się pobrać elementów.');
      }

      const elements = await response.json();
      if (!isMountedRef.current || sequence !== sequenceRef.current) return;

      setCollection({
        categoryId: requestedCategoryId,
        elements,
        error: '',
        isLoading: false,
        search: requestedSearch,
      });
    } catch (error) {
      if (isAbortError(error) || !isMountedRef.current || sequence !== sequenceRef.current) return;

      setCollection({
        categoryId: requestedCategoryId,
        elements: [],
        error: error.message || 'Nie udało się pobrać elementów.',
        isLoading: false,
        search: requestedSearch,
      });
    }
  }, [categoryId, effectiveSearch]);

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

  const currentCollection = collection.categoryId === categoryId
    && collection.search === effectiveSearch
    ? collection
    : { elements: [], error: '', isLoading: Boolean(categoryId) };

  return {
    elements: currentCollection.elements,
    error: currentCollection.error,
    isLoading: currentCollection.isLoading,
    loadElements,
  };
}
