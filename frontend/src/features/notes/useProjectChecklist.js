import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { isAbortError, projectChecklistApi } from './notesApi';

function sortItems(items) {
  return [...items].sort((first, second) => {
    if (first.is_completed !== second.is_completed) return first.is_completed ? 1 : -1;
    return first.sort_order - second.sort_order || first.id - second.id;
  });
}

export default function useProjectChecklist(projectId) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const currentProjectIdRef = useRef(projectId);
  const loadControllerRef = useRef(null);
  const sequenceRef = useRef(0);

  useLayoutEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  const loadItems = useCallback(async () => {
    const requestedProjectId = projectId;
    const sequence = sequenceRef.current + 1;
    const controller = new AbortController();
    sequenceRef.current = sequence;
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setIsLoading(true);
    setLoadError('');
    setItems([]);

    try {
      const loadedItems = await projectChecklistApi.list(requestedProjectId, controller.signal);
      if (sequence !== sequenceRef.current || currentProjectIdRef.current !== requestedProjectId) return;
      setItems(sortItems(loadedItems));
    } catch (error) {
      if (isAbortError(error) || sequence !== sequenceRef.current) return;
      setLoadError(error.message || 'Nie udało się pobrać checklisty.');
    } finally {
      if (sequence === sequenceRef.current) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadItems();
    });
    return () => {
      cancelled = true;
      loadControllerRef.current?.abort();
    };
  }, [loadItems]);

  const runOperation = useCallback(async (key, operation) => {
    setPendingIds((current) => new Set(current).add(key));
    setOperationError('');
    try {
      return await operation();
    } catch (error) {
      if (!isAbortError(error)) setOperationError(error.message || 'Operacja nie powiodła się.');
      throw error;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const createItem = useCallback((content) => runOperation('create', async () => {
    const requestedProjectId = projectId;
    const created = await projectChecklistApi.create(requestedProjectId, { content });
    if (currentProjectIdRef.current === requestedProjectId) {
      setItems((current) => sortItems([...current, created]));
    }
    return created;
  }), [projectId, runOperation]);

  const updateItem = useCallback((itemId, values) => runOperation(itemId, async () => {
    const requestedProjectId = projectId;
    const updated = await projectChecklistApi.update(itemId, values);
    if (currentProjectIdRef.current === requestedProjectId) {
      setItems((current) => sortItems(current.map((item) => item.id === itemId ? updated : item)));
    }
    return updated;
  }), [projectId, runOperation]);

  const toggleItem = useCallback((item) => runOperation(item.id, async () => {
    const requestedProjectId = projectId;
    const updated = await projectChecklistApi.setCompletion(item.id, !item.is_completed);
    if (currentProjectIdRef.current === requestedProjectId) {
      setItems((current) => sortItems(current.map((entry) => entry.id === item.id ? updated : entry)));
    }
    return updated;
  }), [projectId, runOperation]);

  const deleteItem = useCallback((itemId) => runOperation(itemId, async () => {
    const requestedProjectId = projectId;
    await projectChecklistApi.remove(itemId);
    if (currentProjectIdRef.current === requestedProjectId) {
      setItems((current) => current.filter((item) => item.id !== itemId));
    }
  }), [projectId, runOperation]);

  const moveItem = useCallback((item, direction) => runOperation(`order-${item.id}`, async () => {
    const requestedProjectId = projectId;
    const status = item.is_completed ? 'completed' : 'active';
    const group = items.filter((entry) => entry.is_completed === item.is_completed);
    const currentIndex = group.findIndex((entry) => entry.id === item.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= group.length) return;

    const reordered = [...group];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    const updatedGroup = await projectChecklistApi.reorder(
      requestedProjectId,
      status,
      reordered.map((entry) => entry.id),
    );

    if (currentProjectIdRef.current === requestedProjectId) {
      setItems((current) => sortItems([
        ...current.filter((entry) => entry.is_completed !== item.is_completed),
        ...updatedGroup,
      ]));
    }
  }), [items, projectId, runOperation]);

  const groups = useMemo(() => ({
    active: items.filter((item) => !item.is_completed),
    completed: items.filter((item) => item.is_completed),
  }), [items]);

  return {
    items,
    groups,
    isLoading,
    loadError,
    operationError,
    pendingIds,
    loadItems,
    createItem,
    updateItem,
    toggleItem,
    deleteItem,
    moveItem,
    clearOperationError: () => setOperationError(''),
  };
}
