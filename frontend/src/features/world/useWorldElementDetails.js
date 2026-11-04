import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '../../api';
import { isAbortError, worldApiError } from './worldApi';

export default function useWorldElementDetails(elementId) {
  const [state, setState] = useState(() => ({
    element: null,
    elementId,
    error: '',
    isLoading: Boolean(elementId),
  }));
  const controllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const primedIdRef = useRef(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const loadDetails = useCallback(async () => {
    if (!elementId) {
      controllerRef.current?.abort();
      setState({ element: null, elementId: null, error: '', isLoading: false });
      return;
    }

    const requestedId = elementId;
    const sequence = sequenceRef.current + 1;
    const controller = new AbortController();

    sequenceRef.current = sequence;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setState({ element: null, elementId: requestedId, error: '', isLoading: true });

    try {
      const response = await apiFetch(`/api/world-elements/${requestedId}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw await worldApiError(response, 'Nie udało się pobrać szczegółów elementu.');
      }

      const element = await response.json();
      if (!isMountedRef.current || sequence !== sequenceRef.current) return;

      setState({ element, elementId: requestedId, error: '', isLoading: false });
    } catch (error) {
      if (isAbortError(error) || !isMountedRef.current || sequence !== sequenceRef.current) return;

      setState({
        element: null,
        elementId: requestedId,
        error: error.message || 'Nie udało się pobrać szczegółów elementu.',
        isLoading: false,
      });
    }
  }, [elementId]);

  useEffect(() => {
    if (primedIdRef.current !== null && Number(primedIdRef.current) === Number(elementId)) {
      primedIdRef.current = null;
      return undefined;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadDetails();
    });

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [elementId, loadDetails]);

  const primeDetails = useCallback((element) => {
    controllerRef.current?.abort();
    sequenceRef.current += 1;
    primedIdRef.current = element.id;
    setState({ element, elementId: element.id, error: '', isLoading: false });
  }, []);

  const replaceDetails = useCallback((element) => {
    setState({ element, elementId: element.id, error: '', isLoading: false });
  }, []);

  const currentState = Number(state.elementId) === Number(elementId)
    ? state
    : { element: null, error: '', isLoading: Boolean(elementId) };

  return {
    element: currentState.element,
    error: currentState.error,
    isLoading: currentState.isLoading,
    loadDetails,
    primeDetails,
    replaceDetails,
  };
}
