import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildGraphLayoutStorageKey,
  readGraphLayout,
  removeGraphLayout,
  writeGraphLayout,
} from './graphLayoutStorage';

export default function useGraphLayoutPersistence({
  canvasRef,
  nodes,
  projectId,
  scenarioKey,
  userId,
}) {
  const storageKey = useMemo(() => buildGraphLayoutStorageKey({
    userId,
    projectId,
    scenarioKey,
  }), [userId, projectId, scenarioKey]);
  const [hasSavedLayout, setHasSavedLayout] = useState(() => (
    Boolean(readGraphLayout(storageKey))
  ));

  useEffect(() => {
    const storedPositions = readGraphLayout(storageKey);
    if (!storedPositions) return;

    let appliedPosition = false;
    nodes.forEach((node) => {
      const position = storedPositions[String(node.id)];
      if (!position) return;

      const [x, y] = position;
      node.x = x;
      node.y = y;
      node.fx = x;
      node.fy = y;
      appliedPosition = true;
    });

    if (appliedPosition) canvasRef.current?.restartSimulation();
  }, [canvasRef, nodes, storageKey]);

  const saveLayout = useCallback(() => {
    const positionedNodes = nodes.filter((node) => (
      Number.isFinite(node.x) && Number.isFinite(node.y)
    ));
    const positions = Object.fromEntries(
      positionedNodes.map((node) => [String(node.id), [node.x, node.y]]),
    );

    if (!writeGraphLayout(storageKey, positions)) return;

    positionedNodes.forEach((node) => {
      node.fx = node.x;
      node.fy = node.y;
    });
    setHasSavedLayout(true);
  }, [nodes, storageKey]);

  const resetLayout = useCallback(() => {
    removeGraphLayout(storageKey);
    nodes.forEach((node) => {
      node.fx = undefined;
      node.fy = undefined;
    });
    setHasSavedLayout(false);
    canvasRef.current?.restartSimulation();
  }, [canvasRef, nodes, storageKey]);

  return {
    hasSavedLayout,
    resetLayout,
    saveLayout,
  };
}
