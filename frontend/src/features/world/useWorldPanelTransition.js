import { useCallback, useEffect, useRef, useState } from 'react';

export const WORLD_PANEL_TRANSITION_MS = 180;

export default function useWorldPanelTransition() {
  const [closingPanel, setClosingPanel] = useState(null);
  const closeTimerRef = useRef(null);

  const cancelPanelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosingPanel(null);
  }, []);

  const startPanelClose = useCallback((panelName, onClosed) => {
    if (closeTimerRef.current !== null) return false;

    setClosingPanel(panelName);
    const transitionDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 1
      : WORLD_PANEL_TRANSITION_MS;
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setClosingPanel(null);
      onClosed();
    }, transitionDuration);
    return true;
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  return { cancelPanelClose, closingPanel, startPanelClose };
}
