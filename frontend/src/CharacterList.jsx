import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AttributeDefinitionManager from './features/attributes/AttributeDefinitionManager';
import useAttributeDefinitions from './features/attributes/useAttributeDefinitions';
import './features/attributes/attributes.css';
import CharacterGrid from './features/characters/CharacterGrid';
import CharacterPanel from './features/characters/CharacterPanel';
import './features/characters/characterAttributes.css';
import './features/characters/characterList.css';
import useCharacters from './features/characters/useCharacters';
import usePanelTransition from './features/panels/usePanelTransition';
import './features/world/worldElementPanel.css';

const CHARACTER_USAGE_LABELS = {
  few: 'postacie',
  many: 'postaci',
  one: 'postać',
};

function CharacterList() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [formPanelMode, setFormPanelMode] = useState(null);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [formLoadError, setFormLoadError] = useState('');
  const [isLoadingCharacterForm, setIsLoadingCharacterForm] = useState(false);
  const [isFormPanelBusy, setIsFormPanelBusy] = useState(false);
  const [isFormPanelDirty, setIsFormPanelDirty] = useState(false);
  const [isAttributesPanelOpen, setIsAttributesPanelOpen] = useState(false);
  const [isAttributesPanelDirty, setIsAttributesPanelDirty] = useState(false);
  const attributesButtonRef = useRef(null);
  const addButtonRef = useRef(null);
  const formRequestRef = useRef(0);
  const returnFocusRef = useRef(null);
  const {
    cancelCharacterRequest,
    characters,
    deleteCharacter,
    error: listError,
    isLoading: isLoadingCharacters,
    loadCharacter,
    reload: reloadCharacters,
    saveCharacter,
    setError: setListError,
  } = useCharacters(projectId);
  const { cancelPanelClose, closingPanel, startPanelClose } = usePanelTransition();
  const definitionStore = useAttributeDefinitions({
    collectionEndpoint: projectId
      ? `/api/projects/${projectId}/character-attribute-definitions`
      : null,
    scopeKey: projectId ? `character-project:${projectId}` : null,
  });

  useEffect(() => {
    let cancelled = false;
    formRequestRef.current += 1;
    Promise.resolve().then(() => {
      if (cancelled) return;
      cancelPanelClose();
      setFormPanelMode(null);
      setEditingCharacter(null);
      setFormLoadError('');
      setIsLoadingCharacterForm(false);
      setIsFormPanelBusy(false);
      setIsFormPanelDirty(false);
      setIsAttributesPanelOpen(false);
      setIsAttributesPanelDirty(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cancelPanelClose, projectId]);

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      else addButtonRef.current?.focus();
    });
  }, []);

  const clearFormPanel = useCallback((shouldRestoreFocus = true) => {
    cancelPanelClose();
    formRequestRef.current += 1;
    cancelCharacterRequest();
    setEditingCharacter(null);
    setFormLoadError('');
    setIsLoadingCharacterForm(false);
    setIsFormPanelBusy(false);
    setIsFormPanelDirty(false);
    setFormPanelMode(null);
    if (shouldRestoreFocus) restoreFocus();
  }, [cancelCharacterRequest, cancelPanelClose, restoreFocus]);

  const clearAttributesPanel = useCallback((shouldRestoreFocus = true) => {
    cancelPanelClose();
    setIsAttributesPanelOpen(false);
    setIsAttributesPanelDirty(false);
    if (shouldRestoreFocus) restoreFocus();
  }, [cancelPanelClose, restoreFocus]);

  const confirmDiscardPanel = useCallback(() => (
    (!isFormPanelDirty && !isAttributesPanelDirty)
    || window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')
  ), [isAttributesPanelDirty, isFormPanelDirty]);

  const requestCloseFormPanel = useCallback(() => {
    if (isFormPanelBusy || closingPanel === 'character' || !confirmDiscardPanel()) return;
    startPanelClose('character', () => clearFormPanel());
  }, [clearFormPanel, closingPanel, confirmDiscardPanel, isFormPanelBusy, startPanelClose]);

  const closeSavedFormPanel = useCallback(() => {
    setIsFormPanelDirty(false);
    startPanelClose('character', () => clearFormPanel());
  }, [clearFormPanel, startPanelClose]);

  const openCreatePanel = (trigger = addButtonRef.current) => {
    if (isFormPanelBusy || definitionStore.isMutating || !confirmDiscardPanel()) return;
    returnFocusRef.current = trigger;
    clearAttributesPanel(false);
    formRequestRef.current += 1;
    setFormVersion((current) => current + 1);
    setEditingCharacter(null);
    setFormLoadError('');
    setIsLoadingCharacterForm(false);
    setIsFormPanelBusy(false);
    setIsFormPanelDirty(false);
    setFormPanelMode('create');
  };

  const openEditPanel = async (character, trigger) => {
    if (isFormPanelBusy || definitionStore.isMutating || !confirmDiscardPanel()) return;
    returnFocusRef.current = trigger;
    clearAttributesPanel(false);
    const requestId = formRequestRef.current + 1;
    formRequestRef.current = requestId;
    setFormVersion((current) => current + 1);
    setEditingCharacter(character);
    setFormLoadError('');
    setIsFormPanelBusy(false);
    setIsFormPanelDirty(false);
    setFormPanelMode('edit');
    setIsLoadingCharacterForm(true);

    try {
      const loadedCharacter = await loadCharacter(character.id);
      if (loadedCharacter && formRequestRef.current === requestId) {
        setEditingCharacter(loadedCharacter);
        setFormVersion((current) => current + 1);
      }
    } catch (error) {
      if (formRequestRef.current === requestId) {
        setFormLoadError(error.message || 'Nie udało się pobrać danych postaci.');
      }
    } finally {
      if (formRequestRef.current === requestId) setIsLoadingCharacterForm(false);
    }
  };

  const handleSaveCharacter = async (formData, characterId) => {
    const savedCharacter = await saveCharacter(formData, characterId);
    if (savedCharacter) await definitionStore.refreshDefinitions();
    return savedCharacter;
  };

  const requestDeleteCharacter = async (characterId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę postać?')) return false;

    const deleted = await deleteCharacter(characterId);
    if (deleted) await definitionStore.refreshDefinitions();
    return deleted;
  };

  const handleDelete = async (characterId, trigger) => {
    try {
      const deleted = await requestDeleteCharacter(characterId);
      window.requestAnimationFrame(() => {
        if (!deleted && trigger?.isConnected) trigger.focus();
        else addButtonRef.current?.focus();
      });
    } catch (error) {
      setListError(error.message || 'Nie udało się usunąć postaci.');
      window.requestAnimationFrame(() => trigger?.isConnected && trigger.focus());
    }
  };

  const requestCloseAttributesPanel = useCallback(() => {
    if (definitionStore.isMutating || closingPanel === 'attributes') return;
    if (!confirmDiscardPanel()) return;
    startPanelClose('attributes', () => clearAttributesPanel());
  }, [clearAttributesPanel, closingPanel, confirmDiscardPanel, definitionStore.isMutating, startPanelClose]);

  const openAttributesPanel = (trigger = attributesButtonRef.current) => {
    if (isFormPanelBusy || definitionStore.isMutating || !confirmDiscardPanel()) return;
    returnFocusRef.current = attributesButtonRef.current || trigger;
    clearFormPanel(false);
    setIsAttributesPanelDirty(false);
    setIsAttributesPanelOpen(true);
  };

  return (
    <div className="character-list-page">
      <div className="character-list-page__toolbar">
        <div className="character-list-page__heading">
          <h1>Postacie</h1>
          <span className="character-list-page__count" aria-live="polite">
            {characters.length} {characters.length === 1 ? 'postać' : characters.length > 1 && characters.length < 5 ? 'postacie' : 'postaci'}
          </span>
        </div>

        <div className="character-list-page__actions">
          <button
            ref={attributesButtonRef}
            type="button"
            className="character-list-page__action"
            data-world-panel-trigger
            onClick={(event) => openAttributesPanel(event.currentTarget)}
            disabled={definitionStore.isMutating || isAttributesPanelOpen}
          >
            Atrybuty postaci
          </button>
          <button
            ref={addButtonRef}
            type="button"
            className="character-list-page__action character-list-page__action--primary"
            data-panel-trigger
            onClick={(event) => openCreatePanel(event.currentTarget)}
          >
            Dodaj postać
          </button>
        </div>
      </div>

      {isLoadingCharacters && characters.length === 0 ? (
        <div className="character-list-page__state" role="status" aria-label="Ładowanie postaci">
          <div className="character-list-page__state-content">
            <span className="character-list-page__loading-indicator" aria-hidden="true" />
            <p>Ładowanie postaci…</p>
          </div>
        </div>
      ) : listError && characters.length === 0 ? (
        <div className="character-list-page__state" role="alert">
          <div className="character-list-page__state-content">
            <h2>Nie udało się pobrać postaci</h2>
            <p>{listError}</p>
            <button type="button" className="character-list-page__retry" onClick={reloadCharacters}>
              Spróbuj ponownie
            </button>
          </div>
        </div>
      ) : characters.length === 0 ? (
        <div className="character-list-page__state">
          <div className="character-list-page__state-content">
            <h2>Nie ma jeszcze żadnych postaci</h2>
            <p>Dodaj pierwszą postać, aby rozpocząć tworzenie obsady projektu.</p>
            <button
              type="button"
              className="character-list-page__action character-list-page__action--primary"
              onClick={(event) => openCreatePanel(event.currentTarget)}
            >
              Dodaj postać
            </button>
          </div>
        </div>
      ) : (
        <>
          {listError && (
            <div className="character-list-page__inline-error" role="alert">
              <span>{listError}</span>
              <button type="button" onClick={reloadCharacters}>Spróbuj ponownie</button>
            </div>
          )}
          <CharacterGrid
            characters={characters}
            onDelete={handleDelete}
            onEdit={openEditPanel}
            onOpen={(characterId) => navigate(`/project/${projectId}/characters/${characterId}`)}
          />
        </>
      )}

      <div className="world-element-panel-layer character-attribute-panel-layer">
        {formPanelMode && (
          <CharacterPanel
            character={editingCharacter}
            definitionStore={definitionStore}
            formVersion={formVersion}
            isBusy={isFormPanelBusy || definitionStore.isMutating}
            isClosing={closingPanel === 'character'}
            isLoading={isLoadingCharacterForm}
            loadError={formLoadError}
            mode={formPanelMode}
            onBusyChange={setIsFormPanelBusy}
            onClose={requestCloseFormPanel}
            onDelete={requestDeleteCharacter}
            onDeleted={closeSavedFormPanel}
            onDirtyChange={setIsFormPanelDirty}
            onManageAttributes={openAttributesPanel}
            onSave={handleSaveCharacter}
            onSaved={closeSavedFormPanel}
            projectId={projectId}
          />
        )}

        {isAttributesPanelOpen && (
          <AttributeDefinitionManager
            contextLabel="Postacie w projekcie"
            disabled={definitionStore.isMutating || closingPanel === 'attributes'}
            emptyMessage="Projekt nie ma jeszcze atrybutów postaci."
            isClosing={closingPanel === 'attributes'}
            onClose={requestCloseAttributesPanel}
            onDirtyChange={setIsAttributesPanelDirty}
            panelTitle="Atrybuty postaci"
            store={definitionStore}
            usageLabels={CHARACTER_USAGE_LABELS}
          />
        )}
      </div>
    </div>
  );
}

export default CharacterList;
