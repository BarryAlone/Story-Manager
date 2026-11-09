import { useCallback, useEffect, useRef, useState } from 'react';

import AttributeDefinitionForm from './AttributeDefinitionForm';
import AttributeDefinitionMenu from './AttributeDefinitionMenu';
import useWorldPanelDismiss from '../world/useWorldPanelDismiss';

const ATTRIBUTE_FORM_TRANSITION_MS = 140;

export default function AttributeDefinitionManager({
  contextLabel,
  disabled,
  isClosing,
  onClose,
  onDirtyChange,
  store,
}) {
  const [formDefinition, setFormDefinition] = useState(undefined);
  const [isFormClosing, setIsFormClosing] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [actionError, setActionError] = useState('');
  const [forceDelete, setForceDelete] = useState(null);
  const panelRef = useRef(null);
  const addButtonRef = useRef(null);
  const menuButtonRefs = useRef(new Map());
  const formCloseTimerRef = useRef(null);

  useWorldPanelDismiss({
    disabled: disabled || isClosing,
    onOutsideClick: onClose,
    panelRef,
  });

  const reportDirty = useCallback((dirty) => {
    setIsFormDirty(dirty);
    onDirtyChange(dirty);
  }, [onDirtyChange]);

  const restoreFormFocus = useCallback((definition) => {
    window.requestAnimationFrame(() => {
      const target = definition
        ? menuButtonRefs.current.get(definition.id)
        : addButtonRef.current;
      target?.focus({ preventScroll: true });
    });
  }, []);

  const transitionForm = useCallback((nextDefinition, focusDefinition = null) => {
    if (formCloseTimerRef.current !== null) return false;

    setIsFormClosing(true);
    reportDirty(false);
    formCloseTimerRef.current = window.setTimeout(() => {
      formCloseTimerRef.current = null;
      setFormDefinition(nextDefinition);
      setIsFormClosing(false);
      if (nextDefinition === undefined) restoreFormFocus(focusDefinition);
    }, ATTRIBUTE_FORM_TRANSITION_MS);
    return true;
  }, [reportDirty, restoreFormFocus]);

  const closeForm = useCallback(() => {
    if (isFormClosing) return false;
    if (isFormDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return false;

    return transitionForm(undefined, formDefinition || null);
  }, [formDefinition, isFormClosing, isFormDirty, transitionForm]);

  const openForm = useCallback((definition) => {
    if (isFormClosing) return;
    if (formDefinition !== undefined) {
      if (isFormDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
      setActionError('');
      transitionForm(definition);
      return;
    }
    setActionError('');
    setFormDefinition(definition);
    reportDirty(false);
  }, [formDefinition, isFormClosing, isFormDirty, reportDirty, transitionForm]);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => () => {
    if (formCloseTimerRef.current !== null) window.clearTimeout(formCloseTimerRef.current);
  }, []);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || disabled || isClosing) return;
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
  }, [closeForm, disabled, forceDelete, formDefinition, isClosing, onClose]);

  const saveDefinition = async (values) => {
    const editedDefinition = formDefinition || null;
    if (editedDefinition) await store.updateDefinition(editedDefinition.id, values);
    else await store.createDefinition(values);
    setActionError('');
    transitionForm(undefined, editedDefinition);
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
    <aside
      ref={panelRef}
      className={`world-element-panel attribute-definition-panel${isClosing ? ' world-element-panel--closing' : ''}`}
      tabIndex="-1"
      aria-label="Atrybuty"
    >
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

        {!store.isLoading && !store.error && (
          <>
            <div className="attribute-definition-manager__toolbar">
              <p>{store.definitions.length} {store.definitions.length === 1 ? 'atrybut' : 'atrybutów'}</p>
              <button
                ref={addButtonRef}
                type="button"
                onClick={() => openForm(null)}
                disabled={disabled || formDefinition !== undefined || isFormClosing}
              >
                + Dodaj
              </button>
            </div>

            {formDefinition === null && (
              <div className="attribute-definition-manager__create-form">
                <AttributeDefinitionForm
                  key="new"
                  disabled={disabled || isFormClosing}
                  isClosing={isFormClosing}
                  onCancel={closeForm}
                  onDirtyChange={reportDirty}
                  onSubmit={saveDefinition}
                  variant="compact"
                />
              </div>
            )}

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
                  <li key={definition.id} className={formDefinition?.id === definition.id ? 'attribute-definition-list__editing' : ''}>
                    {formDefinition?.id === definition.id ? (
                      <AttributeDefinitionForm
                        key={definition.id}
                        definition={definition}
                        disabled={disabled || isFormClosing}
                        isClosing={isFormClosing}
                        onCancel={closeForm}
                        onDirtyChange={reportDirty}
                        onSubmit={saveDefinition}
                        variant="inline"
                      />
                    ) : (
                      <>
                        <div className="attribute-definition-list__summary">
                          <strong title={definition.name}>{definition.name}</strong>
                          <span>
                            {definition.value_type === 'number' ? 'Liczba' : 'Tekst'} · używany przez {definition.values_count} elementów
                          </span>
                        </div>
                        <AttributeDefinitionMenu
                          buttonRef={(node) => {
                            if (node) menuButtonRefs.current.set(definition.id, node);
                            else menuButtonRefs.current.delete(definition.id);
                          }}
                          definitionName={definition.name}
                          disabled={disabled}
                          onDelete={() => requestDelete(definition)}
                          onEdit={() => openForm(definition)}
                        />
                      </>
                    )}
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
