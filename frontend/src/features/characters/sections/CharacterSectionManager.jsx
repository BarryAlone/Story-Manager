import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import usePanelDismiss from '../../panels/usePanelDismiss';

export default function CharacterSectionManager({
  disabled,
  isClosing,
  onClose,
  onDirtyChange,
  store,
}) {
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [actionError, setActionError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [forceDelete, setForceDelete] = useState(null);
  const panelRef = useRef(null);
  const savingRef = useRef(false);
  const isDirty = Boolean(newTitle.trim()) || (
    editingId !== null
    && editingTitle !== (store.definitions.find((item) => Number(item.id) === Number(editingId))?.title || '')
  );
  const layoutItems = useMemo(() => {
    const items = store.definitions.map((definition) => ({
      definition,
      key: `section-${definition.id}`,
      type: 'section',
    }));
    const galleryPosition = Math.min(Math.max(Number(store.galleryPosition) || 0, 0), items.length);
    items.splice(galleryPosition, 0, { key: 'gallery', type: 'gallery' });
    return items;
  }, [store.definitions, store.galleryPosition]);

  usePanelDismiss({ disabled: disabled || isClosing, onOutsideClick: onClose, panelRef });

  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);
  useEffect(() => { panelRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.defaultPrevented || event.key !== 'Escape' || disabled || isClosing) return;
      event.preventDefault();
      if (editingId !== null) {
        if (isDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
        setEditingId(null);
        setEditingTitle('');
        setFieldErrors({});
      } else if (forceDelete) {
        setForceDelete(null);
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [disabled, editingId, forceDelete, isClosing, isDirty, onClose]);

  const runAction = useCallback(async (action) => {
    if (savingRef.current || disabled) return false;
    savingRef.current = true;
    setActionError('');
    setFieldErrors({});
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error.message || 'Nie udało się wykonać operacji.');
      setFieldErrors(error.errors || {});
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [disabled]);

  const createDefinition = async (event) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    if (await runAction(() => store.createDefinition(title))) setNewTitle('');
  };

  const saveDefinition = async (event) => {
    event.preventDefault();
    const title = editingTitle.trim();
    if (!title || editingId === null) return;
    if (await runAction(() => store.updateDefinition(editingId, title))) {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  const moveLayoutItem = async (index, offset) => {
    const reordered = [...layoutItems];
    const target = index + offset;
    if (target < 0 || target >= reordered.length) return;
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const definitionIds = reordered
      .filter((item) => item.type === 'section')
      .map((item) => item.definition.id);
    const galleryPosition = reordered.findIndex((item) => item.type === 'gallery');
    const succeeded = await runAction(() => store.reorderLayout(definitionIds, galleryPosition));
    if (!succeeded) store.refreshDefinitions();
  };

  const requestDelete = async (definition) => {
    if (!window.confirm(`Usunąć globalną sekcję „${definition.title}”?`)) return;
    setActionError('');
    setForceDelete(null);
    try {
      await store.deleteDefinition(definition.id);
    } catch (error) {
      if (error.status === 409) {
        setForceDelete({
          definition,
          count: error.contentsCount || Number(definition.contents_count || 0),
          message: error.message,
        });
      } else {
        setActionError(error.message || 'Nie udało się usunąć sekcji.');
      }
    }
  };

  const confirmForceDelete = async () => {
    if (!forceDelete) return;
    if (await runAction(() => store.deleteDefinition(forceDelete.definition.id, true))) {
      setForceDelete(null);
    }
  };

  return (
    <aside
      ref={panelRef}
      className={`world-element-panel character-section-manager${isClosing ? ' world-element-panel--closing' : ''}`}
      tabIndex="-1"
      aria-label="Zarządzaj sekcjami postaci"
    >
      <header className="world-element-panel__header">
        <div>
          <h2>Zarządzaj sekcjami</h2>
          <span>Wspólna struktura dla wszystkich postaci</span>
        </div>
        <button type="button" aria-label="Zamknij panel sekcji" onClick={onClose} disabled={disabled}>×</button>
      </header>

      <div className="world-element-panel__content character-section-manager__content">
        {store.isLoading && <ManagerState text="Ładowanie sekcji…" />}
        {!store.isLoading && store.error && (
          <ManagerState text={store.error} action="Spróbuj ponownie" onAction={store.loadDefinitions} error />
        )}

        {!store.isLoading && !store.error && (
          <>
            <form className="character-section-manager__create" onSubmit={createDefinition}>
              <label htmlFor="new-character-section-title">Nowa sekcja</label>
              <div>
                <input
                  id="new-character-section-title"
                  type="text"
                  maxLength="128"
                  value={newTitle}
                  placeholder="Np. Historia postaci"
                  disabled={disabled}
                  aria-invalid={Boolean(fieldErrors.title)}
                  onChange={(event) => {
                    setNewTitle(event.target.value);
                    setFieldErrors({});
                    setActionError('');
                  }}
                />
                <button type="submit" disabled={disabled || !newTitle.trim()}>Dodaj</button>
              </div>
              {fieldErrors.title?.[0] && <span className="character-section-manager__field-error" role="alert">{fieldErrors.title[0]}</span>}
            </form>

            {actionError && <p className="character-section-manager__error" role="alert">{actionError}</p>}

            {forceDelete && (
              <div className="character-section-manager__force" role="alert">
                <strong>{forceDelete.message}</strong>
                <p>
                  Sekcja zawiera treść u {forceDelete.count} {forceDelete.count === 1 ? 'postaci' : 'postaci'}.
                  Wymuszone usunięcie skasuje ją u wszystkich postaci projektu.
                </p>
                <div>
                  <button type="button" onClick={() => setForceDelete(null)} disabled={disabled}>Anuluj</button>
                  <button type="button" className="character-section-button--danger" onClick={confirmForceDelete} disabled={disabled}>
                    Usuń sekcję i wszystkie treści
                  </button>
                </div>
              </div>
            )}

            <ol className="character-section-manager__list">
              {layoutItems.map((item, index) => {
                if (item.type === 'gallery') {
                  return (
                    <li key={item.key} className="character-section-manager__gallery">
                      <div className="character-section-manager__summary">
                        <strong>Galeria</strong>
                        <span>Galeria obrazów każdej postaci</span>
                      </div>
                      <div className="character-section-manager__actions" aria-label="Zmień położenie galerii">
                        <button type="button" aria-label="Przenieś galerię w górę" title="Przenieś w górę" onClick={() => moveLayoutItem(index, -1)} disabled={disabled || index === 0}>↑</button>
                        <button type="button" aria-label="Przenieś galerię w dół" title="Przenieś w dół" onClick={() => moveLayoutItem(index, 1)} disabled={disabled || index === layoutItems.length - 1}>↓</button>
                      </div>
                    </li>
                  );
                }

                const definition = item.definition;
                return (
                  <li key={item.key}>
                    {Number(editingId) === Number(definition.id) ? (
                      <form className="character-section-manager__rename" onSubmit={saveDefinition}>
                        <label htmlFor={`character-section-title-${definition.id}`}>Nazwa sekcji</label>
                        <input
                          id={`character-section-title-${definition.id}`}
                          type="text"
                          maxLength="128"
                          value={editingTitle}
                          autoFocus
                          disabled={disabled}
                          aria-invalid={Boolean(fieldErrors.title)}
                          onChange={(event) => {
                            setEditingTitle(event.target.value);
                            setFieldErrors({});
                          }}
                        />
                        {fieldErrors.title?.[0] && <span className="character-section-manager__field-error" role="alert">{fieldErrors.title[0]}</span>}
                        <div>
                          <button type="button" onClick={() => setEditingId(null)} disabled={disabled}>Anuluj</button>
                          <button type="submit" disabled={disabled || !editingTitle.trim()}>Zapisz</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="character-section-manager__summary">
                          <strong title={definition.title}>{definition.title}</strong>
                          <span>{definition.contents_count} {Number(definition.contents_count) === 1 ? 'uzupełniona postać' : 'uzupełnionych postaci'}</span>
                        </div>
                        <div className="character-section-manager__actions" aria-label={`Akcje sekcji ${definition.title}`}>
                          <button type="button" aria-label="Przenieś w górę" title="Przenieś w górę" onClick={() => moveLayoutItem(index, -1)} disabled={disabled || index === 0}>↑</button>
                          <button type="button" aria-label="Przenieś w dół" title="Przenieś w dół" onClick={() => moveLayoutItem(index, 1)} disabled={disabled || index === layoutItems.length - 1}>↓</button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
                              setEditingId(definition.id);
                              setEditingTitle(definition.title);
                              setFieldErrors({});
                              setActionError('');
                            }}
                            disabled={disabled}
                          >
                            Zmień nazwę
                          </button>
                          <button type="button" className="character-section-manager__delete" onClick={() => requestDelete(definition)} disabled={disabled}>Usuń</button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </aside>
  );
}

function ManagerState({ action, error = false, onAction, text }) {
  return (
    <div className={`character-sections-state${error ? ' character-sections-state--error' : ''}`} role={error ? 'alert' : 'status'}>
      <p>{text}</p>
      {action && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}
