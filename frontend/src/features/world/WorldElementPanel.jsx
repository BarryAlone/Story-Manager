import { useEffect, useRef } from 'react';

import WorldElementDetails from './WorldElementDetails';
import WorldElementForm from './WorldElementForm';
import usePanelDismiss from '../panels/usePanelDismiss';

export default function WorldElementPanel({
  category,
  definitions,
  definitionsError,
  definitionsReady,
  details,
  error,
  isBusy,
  isClosing,
  isLoading,
  mode,
  onBusyChange,
  onCancelEdit,
  onClose,
  onDelete,
  onDirtyChange,
  onEdit,
  onManageAttributes,
  onRetry,
  onRetryDefinitions,
  onSubmit,
}) {
  const panelRef = useRef(null);

  usePanelDismiss({
    disabled: isBusy || isClosing,
    onOutsideClick: onClose,
    panelRef,
  });

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [details?.id, mode]);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || isBusy || isClosing) return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [isBusy, isClosing, onClose]);

  const title = mode === 'create'
    ? 'Dodaj element'
    : mode === 'edit'
      ? 'Edytuj element'
      : 'Szczegóły elementu';

  return (
    <aside
      ref={panelRef}
      className={`world-element-panel${isClosing ? ' world-element-panel--closing' : ''}`}
      tabIndex="-1"
      aria-label={title}
    >
      <header className="world-element-panel__header">
        <h2>{title}</h2>
        <button type="button" aria-label="Zamknij panel elementu" onClick={onClose} disabled={isBusy}>×</button>
      </header>

      <div className="world-element-panel__content">
        {mode === 'create' && (
          <WorldElementForm
            category={category}
            definitions={definitions}
            definitionsError={definitionsError}
            definitionsReady={definitionsReady}
            onManageAttributes={onManageAttributes}
            onRetryDefinitions={onRetryDefinitions}
            onBusyChange={onBusyChange}
            onCancel={onClose}
            onDirtyChange={onDirtyChange}
            onSubmit={onSubmit}
          />
        )}

        {mode !== 'create' && isLoading && (
          <PanelState title="Ładowanie szczegółów…" />
        )}

        {mode !== 'create' && !isLoading && error && (
          <PanelState title={error} actionLabel="Spróbuj ponownie" onAction={onRetry} error />
        )}

        {mode === 'details' && !isLoading && !error && details && (
          <WorldElementDetails
            category={category}
            definitions={definitions}
            disabled={isBusy}
            element={details}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        )}

        {mode === 'edit' && !isLoading && !error && details && (
          <WorldElementForm
            key={details.id}
            category={category}
            definitions={definitions}
            definitionsError={definitionsError}
            definitionsReady={definitionsReady}
            element={details}
            onManageAttributes={onManageAttributes}
            onRetryDefinitions={onRetryDefinitions}
            onBusyChange={onBusyChange}
            onCancel={onCancelEdit}
            onDirtyChange={onDirtyChange}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </aside>
  );
}

function PanelState({ actionLabel, error = false, onAction, title }) {
  return (
    <div className={`world-element-panel__state${error ? ' world-element-panel__state--error' : ''}`} role={error ? 'alert' : 'status'}>
      <p>{title}</p>
      {actionLabel && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
