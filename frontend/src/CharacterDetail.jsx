import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import AttributeDefinitionManager from './features/attributes/AttributeDefinitionManager';
import { buildAttributeValueMap } from './features/attributes/attributeValues';
import useAttributeDefinitions from './features/attributes/useAttributeDefinitions';
import './features/attributes/attributes.css';
import CharacterDetailsContent from './features/characters/CharacterDetailsContent';
import './features/characters/characterAttributes.css';
import useCharacterDetails from './features/characters/useCharacterDetails';
import usePanelTransition from './features/panels/usePanelTransition';
import './features/world/worldElementPanel.css';

const CHARACTER_USAGE_LABELS = {
  few: 'postacie',
  many: 'postaci',
  one: 'postać',
};

const INITIAL_EDITING_FIELDS = {
  name: false,
  group_name: false,
  description: false,
  description_long: false,
  image: false,
  attribute_values: false,
};

function characterForm(character) {
  return {
    name: character?.name || '',
    group_name: character?.group_name || '',
    description: character?.description || '',
    description_long: character?.description_long || '',
    imageFile: null,
  };
}

function CharacterDetailEditor({
  character,
  clearFieldError,
  clearSaveState,
  fieldErrors,
  isSaving,
  projectId,
  saveCharacter,
  saveError,
}) {
  const [form, setForm] = useState(() => characterForm(character));
  const [attributeValueDraft, setAttributeValueDraft] = useState({});
  const [editingFields, setEditingFields] = useState(INITIAL_EDITING_FIELDS);
  const [isAttributesPanelOpen, setIsAttributesPanelOpen] = useState(false);
  const [isAttributesPanelDirty, setIsAttributesPanelDirty] = useState(false);
  const attributesButtonRef = useRef(null);
  const { cancelPanelClose, closingPanel, startPanelClose } = usePanelTransition();
  const definitionStore = useAttributeDefinitions({
    collectionEndpoint: projectId
      ? `/api/projects/${projectId}/character-attribute-definitions`
      : null,
    scopeKey: projectId ? `character-project:${projectId}` : null,
  });
  const definitionsReady = !definitionStore.isLoading && !definitionStore.error;
  const currentAttributeValues = useMemo(
    () => buildAttributeValueMap(definitionStore.definitions, {
      ...(character.attribute_values || {}),
      ...attributeValueDraft,
    }),
    [attributeValueDraft, character.attribute_values, definitionStore.definitions],
  );

  const handleInputChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setForm((current) => ({ ...current, imageFile: event.target.files[0] }));
      setEditingFields((current) => ({ ...current, image: true }));
    }
  };

  const handleSaveChanges = async () => {
    const updatedCharacter = await saveCharacter({
      attributeValues: definitionsReady ? currentAttributeValues : undefined,
      form,
    });
    if (!updatedCharacter) return;

    setForm(characterForm(updatedCharacter));
    setAttributeValueDraft({});
    setEditingFields(INITIAL_EDITING_FIELDS);
    await definitionStore.refreshDefinitions();
  };

  const handleReset = () => {
    setForm(characterForm(character));
    setAttributeValueDraft({});
    setEditingFields(INITIAL_EDITING_FIELDS);
    clearSaveState();
  };

  const requestCloseAttributesPanel = () => {
    if (definitionStore.isMutating || closingPanel === 'attributes') return;
    if (isAttributesPanelDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
    startPanelClose('attributes', () => {
      cancelPanelClose();
      setIsAttributesPanelOpen(false);
      setIsAttributesPanelDirty(false);
      window.requestAnimationFrame(() => attributesButtonRef.current?.focus());
    });
  };

  return (
    <>
      <CharacterDetailsContent
        attributesButtonRef={attributesButtonRef}
        character={character}
        currentAttributeValues={currentAttributeValues}
        definitionStore={definitionStore}
        definitionsReady={definitionsReady}
        editingFields={editingFields}
        fieldErrors={fieldErrors}
        form={form}
        isAttributesPanelOpen={isAttributesPanelOpen}
        isSaving={isSaving}
        onAttributeChange={(definitionId, value) => {
          clearFieldError(`attribute_values.${definitionId}`);
          setAttributeValueDraft((current) => ({ ...current, [definitionId]: value }));
        }}
        onEditField={(field) => setEditingFields((current) => ({ ...current, [field]: true }))}
        onImageChange={handleImageChange}
        onInputChange={handleInputChange}
        onOpenAttributes={() => {
          setIsAttributesPanelDirty(false);
          setIsAttributesPanelOpen(true);
        }}
        onReset={handleReset}
        onSave={handleSaveChanges}
        projectId={projectId}
        saveError={saveError}
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
    </>
  );
}

function CharacterDetail() {
  const { projectId, characterId } = useParams();
  const details = useCharacterDetails({ characterId, projectId });

  if (details.loadError) {
    return <div style={{ padding: '20px', color: '#b91c1c' }}>{details.loadError}</div>;
  }

  if (!details.character) {
    return <div style={{ padding: '20px' }}>Ładowanie profilu postaci...</div>;
  }

  return (
    <CharacterDetailEditor
      key={`${projectId}:${characterId}`}
      {...details}
      projectId={projectId}
    />
  );
}

export default CharacterDetail;
