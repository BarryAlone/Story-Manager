import { useEffect } from 'react';

export default function usePanelDismiss({
  disabled,
  onOutsideClick,
  panelRef,
}) {
  useEffect(() => {
    if (disabled) return undefined;

    const dismissOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-panel-portal], [data-world-panel-portal]')) return;
      if (target instanceof Element && target.closest('[data-panel-trigger], [data-world-panel-trigger]')) return;
      onOutsideClick();
    };

    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [disabled, onOutsideClick, panelRef]);
}
