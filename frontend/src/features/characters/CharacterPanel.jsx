import { useEffect, useRef } from 'react';

import usePanelDismiss from '../panels/usePanelDismiss';
import CharacterForm from './CharacterForm';

export default function CharacterPanel({
  character,
  definitionStore,
  formVersion,
  isBusy,
  isClosing,
  isLoading,
  loadError,
  mode,
  onBusyChange,
  onClose,
  onDelete,
  onDeleted,
  onDirtyChange,
  onManageAttributes,
  onSave,
  onSaved,
  projectId,
}) {
  const panelRef = useRef(null);
  const title = mode === 'edit' ? 'Edytuj postać' : 'Dodaj postać';

  usePanelDismiss({
    disabled: isBusy || isClosing,
    onOutsideClick: onClose,
    panelRef,
  });

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [mode]);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || isBusy || isClosing) return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [isBusy, isClosing, onClose]);

  return (
    <>
      <div className="character-panel-backdrop" aria-hidden="true" />
      <aside
        ref={panelRef}
        className={`world-element-panel character-panel${isClosing ? ' world-element-panel--closing' : ''}`}
        tabIndex="-1"
        aria-label={title}
      >
        <header className="world-element-panel__header">
          <h2>{title}</h2>
          <button type="button" aria-label="Zamknij panel postaci" onClick={onClose} disabled={isBusy}>×</button>
        </header>

        <div className="world-element-panel__content">
          <CharacterForm
            key={formVersion}
            character={character}
            definitionStore={definitionStore}
            isLoading={isLoading}
            loadError={loadError}
            onBusyChange={onBusyChange}
            onDelete={onDelete}
            onDeleted={onDeleted}
            onDirtyChange={onDirtyChange}
            onManageAttributes={onManageAttributes}
            onSave={onSave}
            onSaved={onSaved}
            projectId={projectId}
          />
        </div>
      </aside>
    </>
  );
}
