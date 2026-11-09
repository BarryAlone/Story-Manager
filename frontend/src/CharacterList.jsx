import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import deleteIcon from './assets/icons/trash-can.png';
import editIcon from './assets/icons/pencil.png';
import FABIcon from './assets/icons/plus.png';
import { apiFetch, backendUrl } from './api';
import AttributeDefinitionManager from './features/attributes/AttributeDefinitionManager';
import AttributeValueFields from './features/attributes/AttributeValueFields';
import {
  attributeValueMapsEqual,
  buildAttributeValueMap,
} from './features/attributes/attributeValues';
import useAttributeDefinitions from './features/attributes/useAttributeDefinitions';
import './features/attributes/attributes.css';
import { appendCharacterAttributeValues, characterApiError } from './features/characters/characterApi';
import './features/characters/characterAttributes.css';
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
  const [characters, setCharacters] = useState([]);
  const [listError, setListError] = useState('');

  const [newName, setNewName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDescriptionLong, setNewDescriptionLong] = useState('');
  const [newCharacterImage, setNewCharacterImage] = useState(null);
  const [characterAttributeValues, setCharacterAttributeValues] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isLoadingCharacterForm, setIsLoadingCharacterForm] = useState(false);
  const [isSavingCharacter, setIsSavingCharacter] = useState(false);
  const [initialForm, setInitialForm] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState(null);
  const [isAttributesPanelOpen, setIsAttributesPanelOpen] = useState(false);
  const [isAttributesPanelDirty, setIsAttributesPanelDirty] = useState(false);
  const attributesButtonRef = useRef(null);
  const collectionControllerRef = useRef(null);
  const characterFormControllerRef = useRef(null);
  const projectIdRef = useRef(projectId);
  const savingRef = useRef(false);
  const { cancelPanelClose, closingPanel, startPanelClose } = useWorldPanelTransition();
  const definitionStore = useAttributeDefinitions({
    collectionEndpoint: projectId
      ? `/api/projects/${projectId}/character-attribute-definitions`
      : null,
    scopeKey: projectId ? `character-project:${projectId}` : null,
  });
  const definitionsReady = !definitionStore.isLoading && !definitionStore.error;
  const normalizedCharacterAttributeValues = useMemo(
    () => buildAttributeValueMap(definitionStore.definitions, characterAttributeValues),
    [characterAttributeValues, definitionStore.definitions],
  );
  const isCharacterFormDirty = useMemo(() => {
    if (!isModalOpen || !initialForm) return false;

    return newName !== initialForm.name
      || newGroupName !== initialForm.groupName
      || newDescription !== initialForm.description
      || newDescriptionLong !== initialForm.descriptionLong
      || Boolean(newCharacterImage)
      || !attributeValueMapsEqual(
        normalizedCharacterAttributeValues,
        buildAttributeValueMap(definitionStore.definitions, initialForm.attributeValues),
      );
  }, [definitionStore.definitions, initialForm, isModalOpen, newCharacterImage, newDescription, newDescriptionLong, newGroupName, newName, normalizedCharacterAttributeValues]);

  useEffect(() => {
    projectIdRef.current = projectId;
    collectionControllerRef.current?.abort();
    characterFormControllerRef.current?.abort();
    const controller = new AbortController();
    collectionControllerRef.current = controller;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return null;
      setCharacters([]);
      setListError('');
      setIsModalOpen(false);
      setIsAttributesPanelOpen(false);
      setIsSavingCharacter(false);
      savingRef.current = false;
      return apiFetch(`/api/projects/${projectId}/characters`, { signal: controller.signal });
    })
      .then(async (response) => {
        if (!response) return null;
        if (!response.ok) throw await characterApiError(response, 'Nie udało się pobrać postaci.');
        return response.json();
      })
      .then((data) => {
        if (data && !controller.signal.aborted && projectIdRef.current === projectId) {
          setCharacters(data.characters || data);
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError' && projectIdRef.current === projectId) {
          setListError(error.message || 'Nie udało się pobrać postaci.');
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [projectId]);

  useEffect(() => () => characterFormControllerRef.current?.abort(), []);

  const resetAndCloseModal = useCallback(() => {
    characterFormControllerRef.current?.abort();
    setInitialForm(null);
    setEditingCharacterId(null);
    setNewName('');
    setNewGroupName('');
    setNewDescription('');
    setNewDescriptionLong('');
    setCharacterAttributeValues({});
    setNewCharacterImage(null);
    setFieldErrors({});
    setFormError('');
    setIsLoadingCharacterForm(false);
    setIsSavingCharacter(false);
    savingRef.current = false;
    setIsModalOpen(false);
  }, []);

  const requestCloseModal = useCallback(() => {
    if (isSavingCharacter) return;
    if (isCharacterFormDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
    resetAndCloseModal();
  }, [isCharacterFormDirty, isSavingCharacter, resetAndCloseModal]);

  const initializeCharacterForm = useCallback((character = null) => {
    const attributeValues = character?.attribute_values || {};
    const initial = {
      attributeValues,
      description: character?.description || '',
      descriptionLong: character?.description_long || '',
      groupName: character?.group_name || '',
      name: character?.name || '',
    };

    setInitialForm(initial);
    setEditingCharacterId(character?.id || null);
    setNewName(initial.name);
    setNewGroupName(initial.groupName);
    setNewDescription(initial.description);
    setNewDescriptionLong(initial.descriptionLong);
    setCharacterAttributeValues(attributeValues);
    setNewCharacterImage(null);
    setFieldErrors({});
    setFormError('');
  }, []);

  const openCreateModal = () => {
    initializeCharacterForm();
    setIsModalOpen(true);
  };

  const handleSaveCharacter = async () => {
    if (savingRef.current || isLoadingCharacterForm) return;

    const requestedProjectId = projectId;
    savingRef.current = true;
    setIsSavingCharacter(true);
    setFieldErrors({});
    setFormError('');
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('name', newName);
    formData.append('group_name', newGroupName || '');
    formData.append('description', newDescription || '');
    formData.append('description_long', newDescriptionLong || '');
    appendCharacterAttributeValues(
      formData,
      definitionsReady ? normalizedCharacterAttributeValues : undefined,
    );
    
    if (newCharacterImage) {
      formData.append('character_image', newCharacterImage);
    }

    let url = '/api/characters';
    
    if (editingCharacterId) {
      url = `/api/characters/${editingCharacterId}`;
      formData.append('_method', 'PUT'); 
    }

    try {
      const response = await apiFetch(url, { method: 'POST', body: formData });
      if (!response.ok) throw await characterApiError(response, 'Nie udało się zapisać postaci.');
      const savedCharacter = await response.json();

      if (projectIdRef.current !== requestedProjectId) return;
      setCharacters((current) => editingCharacterId
        ? current.map((character) => Number(character.id) === Number(editingCharacterId) ? savedCharacter : character)
        : [...current, savedCharacter]);
      await definitionStore.refreshDefinitions();
      resetAndCloseModal();
    } catch (error) {
      if (projectIdRef.current !== requestedProjectId) return;
      setFieldErrors(error.errors || {});
      setFormError(error.message || 'Nie udało się zapisać postaci.');
    } finally {
      savingRef.current = false;
      if (projectIdRef.current === requestedProjectId) setIsSavingCharacter(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę postać?")) return;

    try {
      const response = await apiFetch(`/api/characters/${id}`, { method: 'DELETE' });
      if (!response.ok) throw await characterApiError(response, 'Nie udało się usunąć postaci.');
      setCharacters((current) => current.filter((character) => Number(character.id) !== Number(id)));
      await definitionStore.refreshDefinitions();
    } catch (error) {
      setListError(error.message || 'Nie udało się usunąć postaci.');
    }
  };

  const openEditModal = async (character) => {
    const requestedProjectId = projectId;
    characterFormControllerRef.current?.abort();
    const controller = new AbortController();
    characterFormControllerRef.current = controller;
    initializeCharacterForm(character);
    setIsModalOpen(true);
    setIsLoadingCharacterForm(true);

    try {
      const response = await apiFetch(`/api/characters/${character.id}`, { signal: controller.signal });
      if (!response.ok) throw await characterApiError(response, 'Nie udało się pobrać danych postaci.');
      const payload = await response.json();
      if (controller.signal.aborted || projectIdRef.current !== requestedProjectId) return;
      initializeCharacterForm(payload.character || payload);
    } catch (error) {
      if (error?.name !== 'AbortError' && projectIdRef.current === requestedProjectId) {
        setFormError(error.message || 'Nie udało się pobrać danych postaci.');
      }
    } finally {
      if (!controller.signal.aborted && projectIdRef.current === requestedProjectId) {
        setIsLoadingCharacterForm(false);
      }
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
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <img src={FABIcon} alt="Dodaj postać" style={{ width: '24px', height: '24px' }} />
        </button>
      </div>

      {listError && <p className="character-form__error" role="alert">{listError}</p>}

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px', margin: '20px 0', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{editingCharacterId ? 'Edytuj postać' : 'Nowa postać'}</h2>
            {isLoadingCharacterForm && <p>Ładowanie danych postaci…</p>}
            <input type="text" placeholder="Imię postaci" value={newName} disabled={isSavingCharacter || isLoadingCharacterForm} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Frakcja / Grupa (opcjonalnie)" value={newGroupName} disabled={isSavingCharacter || isLoadingCharacterForm} onChange={(e) => setNewGroupName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isSavingCharacter || isLoadingCharacterForm} onChange={(e) => setNewCharacterImage(e.target.files[0] || null)} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />

            <section className="character-form__attributes" aria-labelledby="character-form-attributes-title">
              <h3 id="character-form-attributes-title">Atrybuty</h3>
              {definitionStore.isLoading && <p className="character-form__attributes-state">Ładowanie atrybutów…</p>}
              {definitionStore.error && (
                <p className="character-form__attributes-state character-form__attributes-state--error" role="alert">
                  Nie udało się pobrać atrybutów.{' '}
                  <button type="button" onClick={definitionStore.loadDefinitions}>Spróbuj ponownie</button>
                </p>
              )}
              {definitionsReady && definitionStore.definitions.length === 0 && (
                <p className="character-form__attributes-state">Projekt nie ma jeszcze atrybutów postaci.</p>
              )}
              {definitionsReady && definitionStore.definitions.length > 0 && (
                <AttributeValueFields
                  definitions={definitionStore.definitions}
                  disabled={isSavingCharacter || isLoadingCharacterForm}
                  errors={fieldErrors}
                  values={normalizedCharacterAttributeValues}
                  onChange={(definitionId, value) => {
                    setFieldErrors((current) => ({
                      ...current,
                      [`attribute_values.${definitionId}`]: undefined,
                    }));
                    setCharacterAttributeValues((current) => ({ ...current, [definitionId]: value }));
                  }}
                />
              )}
            </section>

            {/* Pole na krótki i długi opis */}
            <textarea placeholder="Krótki opis postaci" value={newDescription} disabled={isSavingCharacter || isLoadingCharacterForm} onChange={(e) => setNewDescription(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />
            <textarea placeholder="Długi opis postaci" value={newDescriptionLong} disabled={isSavingCharacter || isLoadingCharacterForm} onChange={(e) => setNewDescriptionLong(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />

            {formError && <p className="character-form__error" role="alert">{formError}</p>}

            {/* Przyciski akcji */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
              <button type="button" onClick={requestCloseModal} disabled={isSavingCharacter} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Anuluj</button>
              <button type="button" onClick={handleSaveCharacter} disabled={isSavingCharacter || isLoadingCharacterForm || !newName.trim()} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                {isSavingCharacter ? 'Zapisywanie…' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- KAFELKI POSTACI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {characters.map(character => {
          const imageUrl = character.character_image ? backendUrl(`/storage/${character.character_image}`) : null;

          return (
            <div 
              key={character.id} 
              onClick={() => navigate(`/project/${projectId}/characters/${character.id}`)}
              style={{ textDecoration: 'none',
                       color: 'inherit',
                       position: 'relative',
                       height: '380px',
                       borderRadius: '10px',
                       overflow: 'hidden',
                       backgroundColor: '#374151',
                       backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
                       backgroundSize: 'cover',
                       backgroundPosition: 'center',
                       boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                       display: 'block',
                       cursor: 'pointer',
                       transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Opcje akcji */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px', zIndex: 10 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(character); }} 
                  title="Edytuj"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}
                >
                  <img src={editIcon} alt="Edytuj" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(character.id); }} 
                  title="Usuń"
                  style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.8)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0.7 }}
                >
                  <img src={deleteIcon} alt="Usuń" style={{ width: '20px', height: '20px', opacity: 0.8 }} />
                </button>
              </div>

              {/* Obszar z tekstem */}
              <div style={{ 
                position: 'absolute', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                padding: '40px 20px 20px 20px', 
                background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent)', 
                color: 'white' 
              }}>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  {character.name}
                </h2>
                
                {character.group_name && (
                  <span style={{ backgroundColor: '#4B5563', padding: '3px 10px', borderRadius: '15px', fontSize: '0.8rem', display: 'inline-block', marginBottom: '10px' }}>
                    {character.group_name}
                  </span>
                )}
                
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  color: '#e5e7eb',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {character.description || 'Brak opisu postaci.'}
                </p>
              </div>

            </div>
          );
        })}
      </div>

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
