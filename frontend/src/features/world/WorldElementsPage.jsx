import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import AttributeDefinitionManager from '../attributes/AttributeDefinitionManager';
import useAttributeDefinitions from '../attributes/useAttributeDefinitions';
import '../attributes/attributes.css';
import WorldCategoryDialog from './WorldCategoryDialog';
import WorldCategorySidebar from './WorldCategorySidebar';
import WorldElementList from './WorldElementList';
import WorldElementPanel from './WorldElementPanel';
import WorldElementsToolbar from './WorldElementsToolbar';
import useWorldElementCategories from './useWorldElementCategories';
import useWorldElementDetails from './useWorldElementDetails';
import useWorldElements from './useWorldElements';
import useWorldPanelTransition from './useWorldPanelTransition';
import './worldElements.css';
import './worldElementPanel.css';

const DEFAULT_CATEGORY_NAMES = ['Lokalizacje', 'Przedmioty', 'Magia'];

export default function WorldElementsPage() {
  const { projectId } = useParams();
  const categoryStore = useWorldElementCategories(projectId);
  const [viewState, setViewState] = useState(() => ({
    activeCategoryId: null,
    projectId,
    searchQuery: '',
  }));
  const [dialog, setDialog] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isAddingDefaults, setIsAddingDefaults] = useState(false);
  const [panelState, setPanelState] = useState(null);
  const [isPanelDirty, setIsPanelDirty] = useState(false);
  const [isPanelBusy, setIsPanelBusy] = useState(false);
  const [isDeletingElement, setIsDeletingElement] = useState(false);
  const [attributesPanelProjectId, setAttributesPanelProjectId] = useState(null);
  const [isAttributesPanelDirty, setIsAttributesPanelDirty] = useState(false);
  const addButtonRef = useRef(null);
  const attributesButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const { cancelPanelClose, closingPanel, startPanelClose } = useWorldPanelTransition();
  const currentView = viewState.projectId === projectId
    ? viewState
    : { activeCategoryId: null, projectId, searchQuery: '' };
  const currentPanel = panelState?.projectId === projectId ? panelState : null;
  const activeCategory = categoryStore.categories.find((category) => (
    Number(category.id) === Number(currentView.activeCategoryId)
  )) || categoryStore.categories[0] || null;
  const definitionStore = useAttributeDefinitions({
    collectionEndpoint: activeCategory
      ? `/api/world-element-categories/${activeCategory.id}/attribute-definitions`
      : null,
    scopeKey: activeCategory ? `world-category:${activeCategory.id}` : null,
  });
  const elementStore = useWorldElements(activeCategory?.id || null, currentView.searchQuery);
  const detailsStore = useWorldElementDetails(
    currentPanel?.mode !== 'create' ? currentPanel?.elementId || null : null,
  );
  const hasFormChanges = Boolean(
    (currentPanel && ['create', 'edit'].includes(currentPanel.mode) && isPanelDirty)
    || (attributesPanelProjectId === projectId && isAttributesPanelDirty)
  );
  const isAttributesPanelOpen = attributesPanelProjectId === projectId;
  const definitionsReady = !definitionStore.isLoading && !definitionStore.error;
  const isElementOperationActive = isPanelBusy
    || isDeletingElement
    || elementStore.isMutating
    || definitionStore.isMutating;

  useEffect(() => {
    if (categoryStore.isLoading || categoryStore.categories.length === 0) return undefined;
    if (categoryStore.categories.some((category) => (
      Number(category.id) === Number(currentView.activeCategoryId)
    ))) return undefined;

    let cancelled = false;
    const firstCategoryId = categoryStore.categories[0].id;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setViewState({ activeCategoryId: firstCategoryId, projectId, searchQuery: '' });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [categoryStore.categories, categoryStore.isLoading, currentView.activeCategoryId, projectId]);

  const confirmDiscardPanel = useCallback(() => (
    !hasFormChanges
    || window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')
  ), [hasFormChanges]);

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      else addButtonRef.current?.focus();
    });
  }, []);

  const clearPanel = useCallback((shouldRestoreFocus = true) => {
    cancelPanelClose();
    setPanelState(null);
    setIsPanelDirty(false);
    setIsPanelBusy(false);
    setIsDeletingElement(false);
    if (shouldRestoreFocus) restoreFocus();
  }, [cancelPanelClose, restoreFocus]);

  const clearAttributesPanel = useCallback((shouldRestoreFocus = true) => {
    cancelPanelClose();
    setAttributesPanelProjectId(null);
    setIsAttributesPanelDirty(false);
    if (shouldRestoreFocus) restoreFocus();
  }, [cancelPanelClose, restoreFocus]);

  const requestClosePanel = useCallback(() => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    startPanelClose('element', () => clearPanel());
  }, [clearPanel, confirmDiscardPanel, isElementOperationActive, startPanelClose]);

  const requestCloseAttributesPanel = useCallback(() => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    startPanelClose('attributes', () => clearAttributesPanel());
  }, [clearAttributesPanel, confirmDiscardPanel, isElementOperationActive, startPanelClose]);

  const cancelEdit = useCallback(() => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    setIsPanelDirty(false);
    setIsPanelBusy(false);
    setPanelState((current) => current ? { ...current, mode: 'details' } : current);
  }, [confirmDiscardPanel, isElementOperationActive]);

  const selectCategory = (categoryId) => {
    if (Number(categoryId) === Number(activeCategory?.id)) return;
    if (isElementOperationActive || !confirmDiscardPanel()) return;

    clearPanel(false);
    clearAttributesPanel(false);
    setActionMessage(null);
    setViewState({ activeCategoryId: categoryId, projectId, searchQuery: '' });
  };

  const changeSearch = (searchQuery) => {
    setViewState((current) => ({
      activeCategoryId: current.projectId === projectId
        ? current.activeCategoryId
        : activeCategory?.id || null,
      projectId,
      searchQuery,
    }));
  };

  const openCreatePanel = (trigger = addButtonRef.current) => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    returnFocusRef.current = trigger;
    clearAttributesPanel(false);
    setIsPanelDirty(false);
    setIsPanelBusy(false);
    setPanelState({ mode: 'create', elementId: null, projectId });
  };

  const openDetails = (element, event) => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    returnFocusRef.current = event.currentTarget;
    clearAttributesPanel(false);
    setIsPanelDirty(false);
    setIsPanelBusy(false);
    setPanelState({ mode: 'details', elementId: element.id, projectId });
  };

  const openCategoryDialog = (nextDialog) => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    clearPanel(false);
    clearAttributesPanel(false);
    setDialog(nextDialog);
  };

  const openAttributesPanel = (trigger = attributesButtonRef.current) => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    returnFocusRef.current = trigger;
    clearPanel(false);
    setIsAttributesPanelDirty(false);
    setAttributesPanelProjectId(projectId);
  };

  const submitCategory = async (name) => {
    if (dialog?.mode === 'rename') {
      await categoryStore.updateCategory(dialog.category.id, name);
    } else {
      const created = await categoryStore.createCategory(name);
      setViewState({ activeCategoryId: created.id, projectId, searchQuery: '' });
    }
    setDialog(null);
  };

  const deleteCategory = async (category) => {
    if (isElementOperationActive || !confirmDiscardPanel()) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć kategorię „${category.name}”?`)) return;

    setActionMessage(null);
    try {
      await categoryStore.deleteCategory(category.id);
      if (Number(activeCategory?.id) === Number(category.id)) {
        clearPanel(false);
        clearAttributesPanel(false);
        const nextCategory = categoryStore.categories.find((item) => (
          Number(item.id) !== Number(category.id)
        ));
        setViewState({
          activeCategoryId: nextCategory?.id || null,
          projectId,
          searchQuery: '',
        });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: error.message || 'Nie udało się usunąć kategorii.' });
    }
  };

  const addSuggestedCategory = async (name) => {
    setActionMessage(null);
    try {
      const created = await categoryStore.createCategory(name);
      setViewState({ activeCategoryId: created.id, projectId, searchQuery: '' });
    } catch (error) {
      setActionMessage({ type: 'error', text: error.message || 'Nie udało się dodać kategorii.' });
    }
  };

  const addDefaultCategories = async () => {
    if (isAddingDefaults) return;

    const existingNames = new Set(categoryStore.categories.map((category) => (
      category.name.trim().toLocaleLowerCase('pl')
    )));
    const namesToCreate = DEFAULT_CATEGORY_NAMES.filter((name) => (
      !existingNames.has(name.toLocaleLowerCase('pl'))
    ));

    setIsAddingDefaults(true);
    setActionMessage(null);
    const created = [];
    const failed = [];

    for (const name of namesToCreate) {
      try {
        created.push(await categoryStore.createCategory(name));
      } catch (error) {
        failed.push(`${name}: ${error.message || 'błąd zapisu'}`);
      }
    }

    setIsAddingDefaults(false);
    if (created[0]) {
      setViewState({ activeCategoryId: created[0].id, projectId, searchQuery: '' });
    }

    if (failed.length > 0) {
      setActionMessage({
        type: 'error',
        text: `Dodano ${created.length} z ${namesToCreate.length} kategorii. ${failed.join(' ')}`,
      });
    } else {
      setActionMessage({ type: 'success', text: 'Dodano podstawowe kategorie.' });
    }
  };

  const createElement = async (values) => {
    const created = await elementStore.createElement(values);
    await definitionStore.refreshDefinitions();
    categoryStore.adjustItemsCount(activeCategory.id, 1);
    setViewState((current) => ({ ...current, projectId, searchQuery: '' }));
    detailsStore.primeDetails(created);
    setIsPanelDirty(false);
    setIsPanelBusy(false);
    setPanelState({ mode: 'details', elementId: created.id, projectId });
  };

  const updateElement = async (values) => {
    const updated = await elementStore.updateElement(currentPanel.elementId, values);
    await definitionStore.refreshDefinitions();
    detailsStore.replaceDetails(updated);
    setIsPanelDirty(false);
    setIsPanelBusy(false);
    setPanelState((current) => current ? { ...current, mode: 'details' } : current);
  };

  const deleteElement = async () => {
    if (isDeletingElement || !detailsStore.element) return;
    if (!window.confirm(`Czy na pewno chcesz trwale usunąć „${detailsStore.element.name}”?`)) return;

    setIsDeletingElement(true);
    setActionMessage(null);
    try {
      await elementStore.deleteElement(detailsStore.element.id);
      await definitionStore.refreshDefinitions();
      categoryStore.adjustItemsCount(activeCategory.id, -1);
      clearPanel();
    } catch (error) {
      setIsDeletingElement(false);
      setActionMessage({ type: 'error', text: error.message || 'Nie udało się usunąć elementu.' });
    }
  };

  return (
    <section className="world-elements-page" aria-label="Przestrzeń robocza elementów świata">
      <WorldCategorySidebar
        activeCategoryId={activeCategory?.id || null}
        categories={categoryStore.categories}
        disabled={categoryStore.isMutating || isAddingDefaults || isElementOperationActive}
        error={categoryStore.error}
        isLoading={categoryStore.isLoading}
        onCreate={() => openCategoryDialog({ mode: 'create' })}
        onDelete={deleteCategory}
        onRename={(category) => openCategoryDialog({ category, mode: 'rename' })}
        onSelect={selectCategory}
      />

      <main className="world-elements-main">
        {actionMessage && (
          <div className={`world-elements-notice world-elements-notice--${actionMessage.type}`} role={actionMessage.type === 'error' ? 'alert' : 'status'}>
            <span>{actionMessage.text}</span>
            <button type="button" aria-label="Zamknij komunikat" onClick={() => setActionMessage(null)}>×</button>
          </div>
        )}

        {categoryStore.isLoading && <WorldState title="Ładowanie kategorii…" />}

        {!categoryStore.isLoading && categoryStore.error && (
          <WorldState
            title="Nie udało się pobrać kategorii."
            detail={categoryStore.error}
            actionLabel="Spróbuj ponownie"
            onAction={categoryStore.loadCategories}
            error
          />
        )}

        {!categoryStore.isLoading && !categoryStore.error && categoryStore.categories.length === 0 && (
          <EmptyCategories
            disabled={categoryStore.isMutating || isAddingDefaults}
            isAddingDefaults={isAddingDefaults}
            onAddDefaults={addDefaultCategories}
            onAddSuggested={addSuggestedCategory}
            onCreate={() => setDialog({ mode: 'create' })}
          />
        )}

        {!categoryStore.isLoading && !categoryStore.error && activeCategory && (
          <>
            <WorldElementsToolbar
              addButtonRef={addButtonRef}
              attributesButtonRef={attributesButtonRef}
              category={activeCategory}
              disabled={isElementOperationActive}
              onCreate={() => openCreatePanel()}
              onManageAttributes={() => openAttributesPanel()}
              onSearchChange={changeSearch}
              searchQuery={currentView.searchQuery}
            />
            <div className="world-elements-content">
              {elementStore.isLoading && <WorldState title="Ładowanie elementów…" compact />}
              {!elementStore.isLoading && elementStore.error && (
                <WorldState
                  title="Nie udało się pobrać elementów."
                  detail={elementStore.error}
                  actionLabel="Spróbuj ponownie"
                  onAction={elementStore.loadElements}
                  error
                  compact
                />
              )}
              {!elementStore.isLoading && !elementStore.error && elementStore.elements.length === 0 && (
                <WorldState
                  title={currentView.searchQuery.trim() ? 'Brak pasujących elementów.' : 'Ta kategoria nie zawiera jeszcze elementów.'}
                  detail={currentView.searchQuery.trim() ? 'Zmień wyszukiwaną frazę lub wyczyść pole.' : null}
                  actionLabel={currentView.searchQuery.trim() ? 'Wyczyść wyszukiwanie' : null}
                  onAction={currentView.searchQuery.trim() ? () => changeSearch('') : null}
                  compact
                />
              )}
              {!elementStore.isLoading && !elementStore.error && elementStore.elements.length > 0 && (
                <WorldElementList
                  elements={elementStore.elements}
                  onSelect={openDetails}
                  selectedElementId={currentPanel?.elementId || null}
                />
              )}
            </div>

            <div className="world-element-panel-layer">
              {currentPanel && (
                <WorldElementPanel
                  category={activeCategory}
                  definitions={definitionStore.definitions}
                  definitionsError={definitionStore.error}
                  definitionsReady={definitionsReady}
                  details={detailsStore.element}
                  error={detailsStore.error}
                  isBusy={isElementOperationActive || closingPanel === 'element'}
                  isClosing={closingPanel === 'element'}
                  isLoading={detailsStore.isLoading}
                  mode={currentPanel.mode}
                  onBusyChange={setIsPanelBusy}
                  onCancelEdit={cancelEdit}
                  onClose={requestClosePanel}
                  onDelete={deleteElement}
                  onDirtyChange={setIsPanelDirty}
                  onEdit={() => {
                    setIsPanelDirty(false);
                    setPanelState((current) => current ? { ...current, mode: 'edit' } : current);
                  }}
                  onManageAttributes={() => openAttributesPanel()}
                  onRetry={detailsStore.loadDetails}
                  onRetryDefinitions={definitionStore.loadDefinitions}
                  onSubmit={currentPanel.mode === 'create' ? createElement : updateElement}
                />
              )}

              {isAttributesPanelOpen && (
                <AttributeDefinitionManager
                  contextLabel={activeCategory.name}
                  disabled={isElementOperationActive || closingPanel === 'attributes'}
                  isClosing={closingPanel === 'attributes'}
                  onClose={requestCloseAttributesPanel}
                  onDirtyChange={setIsAttributesPanelDirty}
                  store={definitionStore}
                />
              )}
            </div>
          </>
        )}

        {!categoryStore.isLoading && !categoryStore.error && categoryStore.categories.length > 0 && !activeCategory && (
          <WorldState title="Wybierz kategorię." />
        )}
      </main>

      {dialog && (
        <WorldCategoryDialog
          key={`${dialog.mode}-${dialog.category?.id || 'new'}`}
          category={dialog.category}
          onClose={() => setDialog(null)}
          onSubmit={submitCategory}
        />
      )}
    </section>
  );
}

function EmptyCategories({ disabled, isAddingDefaults, onAddDefaults, onAddSuggested, onCreate }) {
  return (
    <div className="world-empty-categories">
      <div className="world-empty-categories__content">
        <h2>Utwórz pierwszą kategorię elementów świata.</h2>
        <p>Kategorie porządkują lokalizacje, przedmioty, systemy magii i inne elementy projektu.</p>
        <div className="world-empty-categories__suggestions" aria-label="Proponowane kategorie">
          {DEFAULT_CATEGORY_NAMES.map((name) => (
            <button type="button" key={name} onClick={() => onAddSuggested(name)} disabled={disabled}>
              + {name}
            </button>
          ))}
        </div>
        <div className="world-empty-categories__actions">
          <button type="button" className="world-button world-button--primary" onClick={onAddDefaults} disabled={disabled}>
            {isAddingDefaults ? 'Dodawanie…' : 'Dodaj podstawowe kategorie'}
          </button>
          <button type="button" className="world-button world-button--secondary" onClick={onCreate} disabled={disabled}>
            Utwórz własną kategorię
          </button>
        </div>
      </div>
    </div>
  );
}

function WorldState({ actionLabel, compact = false, detail, error = false, onAction, title }) {
  return (
    <div className={`world-state${compact ? ' world-state--compact' : ''}${error ? ' world-state--error' : ''}`} role={error ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
      {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
