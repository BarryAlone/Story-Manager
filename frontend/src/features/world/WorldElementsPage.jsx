import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import WorldCategoryDialog from './WorldCategoryDialog';
import WorldCategorySidebar from './WorldCategorySidebar';
import WorldElementList from './WorldElementList';
import WorldElementsToolbar from './WorldElementsToolbar';
import useWorldElementCategories from './useWorldElementCategories';
import useWorldElements from './useWorldElements';
import './worldElements.css';

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
  const currentView = viewState.projectId === projectId
    ? viewState
    : { activeCategoryId: null, projectId, searchQuery: '' };
  const activeCategory = categoryStore.categories.find((category) => (
    Number(category.id) === Number(currentView.activeCategoryId)
  )) || categoryStore.categories[0] || null;
  const elementStore = useWorldElements(activeCategory?.id || null, currentView.searchQuery);

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

  const selectCategory = (categoryId) => {
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

  const submitCategory = async (name) => {
    if (dialog?.mode === 'rename') {
      await categoryStore.updateCategory(dialog.category.id, name);
    } else {
      const created = await categoryStore.createCategory(name);
      selectCategory(created.id);
    }
    setDialog(null);
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć kategorię „${category.name}”?`)) return;

    setActionMessage(null);
    try {
      await categoryStore.deleteCategory(category.id);
      if (Number(activeCategory?.id) === Number(category.id)) {
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
      selectCategory(created.id);
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
    if (created[0]) selectCategory(created[0].id);

    if (failed.length > 0) {
      setActionMessage({
        type: 'error',
        text: `Dodano ${created.length} z ${namesToCreate.length} kategorii. ${failed.join(' ')}`,
      });
    } else {
      setActionMessage({ type: 'success', text: 'Dodano podstawowe kategorie.' });
    }
  };

  return (
    <section className="world-elements-page" aria-label="Przestrzeń robocza elementów świata">
      <WorldCategorySidebar
        activeCategoryId={activeCategory?.id || null}
        categories={categoryStore.categories}
        disabled={categoryStore.isMutating || isAddingDefaults}
        error={categoryStore.error}
        isLoading={categoryStore.isLoading}
        onCreate={() => setDialog({ mode: 'create' })}
        onDelete={deleteCategory}
        onRename={(category) => setDialog({ category, mode: 'rename' })}
        onSelect={selectCategory}
      />

      <main className="world-elements-main">
        {actionMessage && (
          <div className={`world-elements-notice world-elements-notice--${actionMessage.type}`} role={actionMessage.type === 'error' ? 'alert' : 'status'}>
            <span>{actionMessage.text}</span>
            <button type="button" aria-label="Zamknij komunikat" onClick={() => setActionMessage(null)}>×</button>
          </div>
        )}

        {categoryStore.isLoading && (
          <WorldState title="Ładowanie kategorii…" />
        )}

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
              category={activeCategory}
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
                <WorldElementList elements={elementStore.elements} />
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
