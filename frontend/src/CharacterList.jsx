import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import FABIcon from './assets/icons/plus.png';
import AttributeDefinitionManager from './features/attributes/AttributeDefinitionManager';
import useAttributeDefinitions from './features/attributes/useAttributeDefinitions';
import './features/attributes/attributes.css';
import CharacterForm from './features/characters/CharacterForm';
import CharacterGrid from './features/characters/CharacterGrid';
import './features/characters/characterAttributes.css';
import useCharacters from './features/characters/useCharacters';
import useWorldPanelTransition from './features/world/useWorldPanelTransition';
import './features/world/worldElementPanel.css';

const CHARACTER_USAGE_LABELS = {
  few: 'postacie',
  many: 'postaci',
  one: 'postać',
};

function CharacterList() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [formVersion, setFormVersion] = useState(0);
  const [formLoadError, setFormLoadError] = useState('');
  const [isLoadingCharacterForm, setIsLoadingCharacterForm] = useState(false);
  const [isAttributesPanelOpen, setIsAttributesPanelOpen] = useState(false);
  const [isAttributesPanelDirty, setIsAttributesPanelDirty] = useState(false);
  const attributesButtonRef = useRef(null);
  const formRequestRef = useRef(0);
  const {
    cancelCharacterRequest,
    characters,
    deleteCharacter,
    error: listError,
    loadCharacter,
    saveCharacter,
    setError: setListError,
  } = useCharacters(projectId);
  const { cancelPanelClose, closingPanel, startPanelClose } = useWorldPanelTransition();
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
      setIsModalOpen(false);
      setEditingCharacter(null);
      setFormLoadError('');
      setIsLoadingCharacterForm(false);
      setIsAttributesPanelOpen(false);
    });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const closeForm = useCallback(() => {
    formRequestRef.current += 1;
    cancelCharacterRequest();
    setEditingCharacter(null);
    setFormLoadError('');
    setIsLoadingCharacterForm(false);
    setIsModalOpen(false);
  }, [cancelCharacterRequest]);

  const openCreateModal = () => {
    formRequestRef.current += 1;
    setFormVersion((current) => current + 1);
    setEditingCharacter(null);
    setFormLoadError('');
    setIsLoadingCharacterForm(false);
    setIsModalOpen(true);
  };

  const openEditModal = async (character) => {
    const requestId = formRequestRef.current + 1;
    formRequestRef.current = requestId;
    setFormVersion((current) => current + 1);
    setEditingCharacter(character);
    setFormLoadError('');
    setIsModalOpen(true);
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

  const handleDelete = async (characterId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę postać?')) return;

    try {
      const deleted = await deleteCharacter(characterId);
      if (deleted) await definitionStore.refreshDefinitions();
    } catch (error) {
      setListError(error.message || 'Nie udało się usunąć postaci.');
    }
  };

  const requestCloseAttributesPanel = useCallback(() => {
    if (definitionStore.isMutating || closingPanel === 'attributes') return;
    if (isAttributesPanelDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
    startPanelClose('attributes', () => {
      cancelPanelClose();
      setIsAttributesPanelOpen(false);
      setIsAttributesPanelDirty(false);
      window.requestAnimationFrame(() => attributesButtonRef.current?.focus());
    });
  }, [cancelPanelClose, closingPanel, definitionStore.isMutating, isAttributesPanelDirty, startPanelClose]);

  return (
    <div className="character-list-page">
      <div className="character-list-page__toolbar">
        <h1>Postacie</h1>
        <button
          ref={attributesButtonRef}
          type="button"
          className="character-list-page__attributes-button"
          data-world-panel-trigger
          onClick={() => {
            setIsAttributesPanelDirty(false);
            setIsAttributesPanelOpen(true);
          }}
          disabled={definitionStore.isMutating || isAttributesPanelOpen}
        >
          Atrybuty postaci
        </button>
        <button
          type="button"
          onClick={openCreateModal}
          style={{
            position: 'fixed',
            bottom: '40px',
            right: '40px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#6c7683',
            opacity: 0.9,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(event) => { event.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(event) => { event.currentTarget.style.transform = 'scale(1)'; }}
        >
          <img src={FABIcon} alt="Dodaj postać" style={{ width: '24px', height: '24px' }} />
        </button>
      </div>

      {listError && <p className="character-form__error" role="alert">{listError}</p>}

      {isModalOpen && (
        <CharacterForm
          key={formVersion}
          character={editingCharacter}
          definitionStore={definitionStore}
          isLoading={isLoadingCharacterForm}
          loadError={formLoadError}
          onClose={closeForm}
          onSave={handleSaveCharacter}
          projectId={projectId}
        />
      )}

      <CharacterGrid
        characters={characters}
        onDelete={handleDelete}
        onEdit={openEditModal}
        onOpen={(characterId) => navigate(`/project/${projectId}/characters/${characterId}`)}
      />

      <div className="world-element-panel-layer character-attribute-panel-layer">
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
