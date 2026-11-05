import { useCallback, useEffect, useRef, useState } from 'react';

import AttributeDefinitionForm from './AttributeDefinitionForm';

export default function AttributeDefinitionManager({
  contextLabel,
  disabled,
  onClose,
  onDirtyChange,
  store,
}) {
  const [formDefinition, setFormDefinition] = useState(undefined);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [actionError, setActionError] = useState('');
  const [forceDelete, setForceDelete] = useState(null);
  const panelRef = useRef(null);

  const reportDirty = useCallback((dirty) => {
    setIsFormDirty(dirty);
    onDirtyChange(dirty);
  }, [onDirtyChange]);

  const closeForm = useCallback(() => {
    if (isFormDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) {
      return false;
    }

    setFormDefinition(undefined);
    reportDirty(false);
    return true;
  }, [isFormDirty, reportDirty]);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape' || disabled) return;
      event.preventDefault();
      if (formDefinition !== undefined) {
        closeForm();
      } else if (forceDelete) {
        setForceDelete(null);
      } else {
        onClose();
      }
    };

    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [closeForm, disabled, forceDelete, formDefinition, onClose]);

  const saveDefinition = async (values) => {
    if (formDefinition) await store.updateDefinition(formDefinition.id, values);
    else await store.createDefinition(values);
    setFormDefinition(undefined);
    reportDirty(false);
    setActionError('');
  };

  const requestDelete = async (definition) => {
    if (!window.confirm(`Czy usunąć atrybut „${definition.name}”?`)) return;

    setActionError('');
    try {
      await store.deleteDefinition(definition.id);
    } catch (error) {
      if (error.status === 409) {
        setForceDelete({
          definition,
          message: error.message,
          valuesCount: error.valuesCount || Number(definition.values_count || 0),
        });
      } else {
        setActionError(error.message || 'Nie udało się usunąć atrybutu.');
      }
    }
  };

  const confirmForceDelete = async () => {
    if (!forceDelete || disabled) return;
    setActionError('');
    try {
      await store.deleteDefinition(forceDelete.definition.id, true);
      setForceDelete(null);
    } catch (error) {
      setActionError(error.message || 'Nie udało się usunąć atrybutu.');
    }
  };

  return (
    <aside ref={panelRef} className="world-element-panel attribute-definition-panel" tabIndex="-1" aria-label="Atrybuty">
      <header className="world-element-panel__header">
        <div>
          <h2>Atrybuty</h2>
          <span>{contextLabel}</span>
        </div>
        <button type="button" aria-label="Zamknij panel atrybutów" onClick={onClose} disabled={disabled}>×</button>
      </header>

      <div className="world-element-panel__content attribute-definition-manager">
        {store.isLoading && <AttributeState text="Ładowanie atrybutów…" />}
        {!store.isLoading && store.error && (
          <AttributeState text={store.error} action="Spróbuj ponownie" onAction={store.loadDefinitions} error />
        )}

        {!store.isLoading && !store.error && formDefinition !== undefined && (
          <AttributeDefinitionForm
            key={formDefinition?.id || 'new'}
            definition={formDefinition || null}
            disabled={disabled}
            onCancel={closeForm}
            onDirtyChange={reportDirty}
            onSubmit={saveDefinition}
          />
        )}

        {!store.isLoading && !store.error && formDefinition === undefined && (
          <>
            <div className="attribute-definition-manager__toolbar">
              <p>{store.definitions.length} {store.definitions.length === 1 ? 'atrybut' : 'atrybutów'}</p>
              <button type="button" onClick={() => {
                reportDirty(false);
                setFormDefinition(null);
              }} disabled={disabled}>+ Dodaj</button>
            </div>

            {actionError && <p className="attribute-definition-manager__error" role="alert">{actionError}</p>}

            {forceDelete && (
              <div className="attribute-force-delete" role="alert">
                <strong>{forceDelete.message}</strong>
                <p>
                  Atrybut ma {forceDelete.valuesCount} zapisanych {forceDelete.valuesCount === 1 ? 'wartość' : 'wartości'}.
                  Wymuszone usunięcie skasuje je ze wszystkich elementów.
                </p>
                <div>
                  <button type="button" onClick={() => setForceDelete(null)} disabled={disabled}>Anuluj</button>
                  <button type="button" className="attribute-force-delete__confirm" onClick={confirmForceDelete} disabled={disabled}>
                    Usuń atrybut i wartości
                  </button>
                </div>
              </div>
            )}

            {store.definitions.length === 0 ? (
              <AttributeState text="Ta kategoria nie ma jeszcze atrybutów." />
            ) : (
              <ul className="attribute-definition-list">
                {store.definitions.map((definition) => (
                  <li key={definition.id}>
                    <div>
                      <strong>{definition.name}</strong>
                      <span>{definition.value_type === 'number' ? 'Liczba' : 'Tekst'} · używany przez {definition.values_count} elementów</span>
                    </div>
                    <div className="attribute-definition-list__actions">
                      <button type="button" onClick={() => {
                        reportDirty(false);
                        setFormDefinition(definition);
                      }} disabled={disabled}>Edytuj</button>
                      <button type="button" onClick={() => requestDelete(definition)} disabled={disabled}>Usuń</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function AttributeState({ action, error = false, onAction, text }) {
  return (
    <div className={`attribute-manager-state${error ? ' attribute-manager-state--error' : ''}`} role={error ? 'alert' : 'status'}>
      <p>{text}</p>
      {action && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}
