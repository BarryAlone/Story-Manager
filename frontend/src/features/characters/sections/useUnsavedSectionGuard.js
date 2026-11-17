import { useEffect } from 'react';

export const UNSAVED_SECTION_MESSAGE = 'Masz niezapisane zmiany w sekcji. Czy chcesz je odrzucić?';

export default function useUnsavedSectionGuard(isDirty) {
  useEffect(() => {
    if (!isDirty) return undefined;

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinkNavigation = (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm(UNSAVED_SECTION_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    document.addEventListener('click', guardLinkNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      document.removeEventListener('click', guardLinkNavigation, true);
    };
  }, [isDirty]);
}
