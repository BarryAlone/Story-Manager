import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import editIcon from './assets/icons/pencil.png';
import { apiFetch, backendUrl } from './api';
import AttributeDefinitionManager from './features/attributes/AttributeDefinitionManager';
import AttributeValueFields from './features/attributes/AttributeValueFields';
import { buildAttributeValueMap } from './features/attributes/attributeValues';
import useAttributeDefinitions from './features/attributes/useAttributeDefinitions';
import './features/attributes/attributes.css';
import CharacterAttributeSummary from './features/characters/CharacterAttributeSummary';
import { appendCharacterAttributeValues, characterApiError } from './features/characters/characterApi';
import './features/characters/characterAttributes.css';
import useWorldPanelTransition from './features/world/useWorldPanelTransition';
import './features/world/worldElementPanel.css';

const CHARACTER_USAGE_LABELS = {
  few: 'postacie',
  many: 'postaci',
  one: 'postać',
};

function CharacterDetail() {
  const { projectId, characterId } = useParams();
  const [character, setCharacter] = useState(null);
  const [form, setForm] = useState({
    name: '',
    group_name: '',
    description: '',
    description_long: '',
    imageFile: null,
  });
  const [attributeValueDraft, setAttributeValueDraft] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingFields, setEditingFields] = useState({
    name: false,
    group_name: false,
    description: false,
    description_long: false,
    image: false,
    attribute_values: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isAttributesPanelOpen, setIsAttributesPanelOpen] = useState(false);
  const [isAttributesPanelDirty, setIsAttributesPanelDirty] = useState(false);
  const attributesButtonRef = useRef(null);
  const requestControllerRef = useRef(null);
  const savingRef = useRef(false);
  const routeKeyRef = useRef(`${projectId}:${characterId}`);
  const { cancelPanelClose, closingPanel, startPanelClose } = useWorldPanelTransition();
  const definitionStore = useAttributeDefinitions({
    collectionEndpoint: projectId
      ? `/api/projects/${projectId}/character-attribute-definitions`
      : null,
    scopeKey: projectId ? `character-project:${projectId}` : null,
  });
  const definitionsReady = !definitionStore.isLoading && !definitionStore.error;
  const currentAttributeValues = useMemo(
    () => buildAttributeValueMap(definitionStore.definitions, {
      ...(character?.attribute_values || {}),
      ...attributeValueDraft,
    }),
    [attributeValueDraft, character?.attribute_values, definitionStore.definitions],
  );

  useEffect(() => {
    routeKeyRef.current = `${projectId}:${characterId}`;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return null;
      setCharacter(null);
      setLoadError('');
      setSaveError('');
      setFieldErrors({});
      setAttributeValueDraft({});
      setIsSaving(false);
      savingRef.current = false;
      return apiFetch(`/api/projects/${projectId}/characters/${characterId}`, { signal: controller.signal });
    })
      .then(async (response) => {
        if (!response) return null;
        if (!response.ok) throw await characterApiError(response, 'Nie udało się pobrać danych postaci.');
        return response.json();
      })
      .then((data) => {
        if (!data || controller.signal.aborted || routeKeyRef.current !== `${projectId}:${characterId}`) return;
        const characterData = data.character || data;
        setCharacter(characterData);
        setForm({
          name: characterData.name || '',
          group_name: characterData.group_name || '',
          description: characterData.description || '',
          description_long: characterData.description_long || '',
          imageFile: null,
        });
      })
      .catch((error) => {
        if (error?.name !== 'AbortError' && routeKeyRef.current === `${projectId}:${characterId}`) {
          setLoadError(error.message || 'Nie udało się pobrać danych postaci.');
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [characterId, projectId]);

  if (loadError) {
    return <div style={{ padding: '20px', color: '#b91c1c' }}>{loadError}</div>;
  }

  if (!character) {
    return <div style={{ padding: '20px' }}>Ładowanie profilu postaci...</div>;
  }

  const imageUrl = character.character_image ? backendUrl(`/storage/${character.character_image}`) : null;

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm(prev => ({ ...prev, imageFile: e.target.files[0] }));
      setEditingFields(prev => ({ ...prev, image: true }));
    }
  };

  const handleSaveChanges = async () => {
    if (savingRef.current) return;

    const requestedRouteKey = `${projectId}:${characterId}`;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    setFieldErrors({});

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('group_name', form.group_name || '');
    formData.append('description', form.description || '');
    formData.append('description_long', form.description_long || '');
    appendCharacterAttributeValues(formData, definitionsReady ? currentAttributeValues : undefined);
    if (form.imageFile) {
      formData.append('character_image', form.imageFile);
    }
    formData.append('_method', 'PUT');

    try {
      const response = await apiFetch(`/api/characters/${characterId}`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw await characterApiError(response, 'Nie udało się zapisać zmian.');
      const updatedCharacter = await response.json();
      if (routeKeyRef.current !== requestedRouteKey) return;

      setCharacter(updatedCharacter);
      setForm((current) => ({ ...current, imageFile: null }));
      setAttributeValueDraft({});
      setEditingFields({ name: false, group_name: false, description: false, description_long: false, image: false, attribute_values: false });
      await definitionStore.refreshDefinitions();
    } catch (error) {
      if (routeKeyRef.current !== requestedRouteKey) return;
      setFieldErrors(error.errors || {});
      setSaveError(error.message || 'Nie udało się zapisać zmian.');
    } finally {
      savingRef.current = false;
      if (routeKeyRef.current === requestedRouteKey) setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      name: character.name || '',
      group_name: character.group_name || '',
      description: character.description || '',
      description_long: character.description_long || '',
      imageFile: null,
    });
    setAttributeValueDraft({});
    setEditingFields({ name: false, group_name: false, description: false, description_long: false, image: false, attribute_values: false });
    setFieldErrors({});
    setSaveError('');
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
    <div style={{ padding: '20px' }}>
      <Link to={`/project/${projectId}/characters`} style={{ textDecoration: 'none', color: '#4B5563', marginBottom: '20px', display: 'inline-block' }}>
        ← Powrót do listy postaci
      </Link>

      <div style={{ display: 'flex', gap: '40px', marginTop: '20px', flexWrap: 'wrap' }}>
        <div style={{ width: '300px', minWidth: '280px', borderRadius: '10px', backgroundColor: '#374151', overflow: 'hidden' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={character.name} style={{ width: '100%', height: '400px', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#9ca3af' }}>Brak zdjęcia</div>
          )}
          <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Zdjęcie postaci</div>
              <button
                onClick={() => setEditingFields(prev => ({ ...prev, image: true }))}
                title="Zmień zdjęcie"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            {editingFields.image && (
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ marginTop: '12px', width: '100%' }} />
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              {editingFields.name ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{ width: '100%', padding: '14px', fontSize: '2rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              ) : (
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{character.name}</h1>
              )}
            </div>
            <button
              onClick={() => setEditingFields(prev => ({ ...prev, name: true }))}
              title="Edytuj imię"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
            >
              <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            {editingFields.group_name ? (
              <input
                type="text"
                value={form.group_name}
                onChange={(e) => handleInputChange('group_name', e.target.value)}
                placeholder="Frakcja / grupa"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            ) : (
              <span style={{ backgroundColor: '#4B5563', color: 'white', padding: '8px 16px', borderRadius: '15px', fontSize: '0.95rem' }}>
                {character.group_name || 'Brak grupy'}
              </span>
            )}
            <button
              onClick={() => setEditingFields(prev => ({ ...prev, group_name: true }))}
              title="Edytuj grupę"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
            >
              <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          <section className="character-detail__attributes" aria-labelledby="character-detail-attributes-title">
            <div className="character-detail__attributes-header">
              <h3 id="character-detail-attributes-title">Atrybuty</h3>
              <div className="character-detail__attributes-actions">
                {definitionsReady && definitionStore.definitions.length > 0 && !editingFields.attribute_values && (
                  <button
                    type="button"
                    onClick={() => setEditingFields((current) => ({ ...current, attribute_values: true }))}
                  >
                    Edytuj wartości
                  </button>
                )}
                <button
                  ref={attributesButtonRef}
                  type="button"
                  data-world-panel-trigger
                  onClick={() => {
                    setIsAttributesPanelDirty(false);
                    setIsAttributesPanelOpen(true);
                  }}
                  disabled={definitionStore.isMutating || isAttributesPanelOpen}
                >
                  Zarządzaj atrybutami
                </button>
              </div>
            </div>

            {definitionStore.isLoading && <p className="character-form__attributes-state">Ładowanie atrybutów…</p>}
            {definitionStore.error && (
              <p className="character-form__attributes-state character-form__attributes-state--error" role="alert">
                Nie udało się pobrać atrybutów.{' '}
                <button type="button" onClick={definitionStore.loadDefinitions}>Spróbuj ponownie</button>
              </p>
            )}
            {definitionsReady && editingFields.attribute_values && (
              <AttributeValueFields
                definitions={definitionStore.definitions}
                disabled={isSaving}
                errors={fieldErrors}
                values={currentAttributeValues}
                onChange={(definitionId, value) => {
                  setFieldErrors((current) => ({
                    ...current,
                    [`attribute_values.${definitionId}`]: undefined,
                  }));
                  setAttributeValueDraft((current) => ({ ...current, [definitionId]: value }));
                }}
              />
            )}
            {definitionsReady && !editingFields.attribute_values && (
              <CharacterAttributeSummary
                definitions={definitionStore.definitions}
                values={character.attribute_values}
              />
            )}
          </section>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#374151' }}>Biografia / Opis</h3>
              <button
                onClick={() => setEditingFields(prev => ({ ...prev, description: true }))}
                title="Edytuj opis"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            {editingFields.description ? (
              <textarea
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', resize: 'vertical' }}
              />
            ) : (
              <p style={{ lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }}>
                {character.description || 'Ta postać nie ma jeszcze opisu.'}
              </p>
            )}
          </div>

          {saveError && <p className="character-form__error" role="alert">{saveError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '25px', gap: '10px' }}>
            <button
              onClick={handleReset}
              style={{ padding: '10px 18px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', borderRadius: '8px', cursor: 'pointer' }}
            >
              Anuluj zmiany
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              style={{ padding: '10px 18px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              {isSaving ? 'Zapisuję...' : 'Zapisz zmiany'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '32px', padding: '24px', borderRadius: '18px', backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem' }}>Historia postaci</h2>
          </div>
          <button
            onClick={() => setEditingFields(prev => ({ ...prev, description_long: true }))}
            title="Edytuj rozbudowany opis"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
          >
            <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {editingFields.description_long ? (
          <div style={{ backgroundColor: '}#ffffff', borderRadius: '14px', overflow: 'hidden', width: '100%', minHeight: 'calc(65vh)', maxHeight: 'calc(100vh - 220px)' }}>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
              value={form.description_long}
              onEditorChange={(content) => handleInputChange('description_long', content)}
              init={{
                height: 'calc(100vh - 260px)',
                menubar: false,
                plugins: [
                  'advlist autolink lists link charmap preview anchor',
                  'searchreplace visualblocks code fullscreen',
                  'insertdatetime table code help wordcount',
                ],
                toolbar:
                  'undo redo | formatselect | bold italic underline strikethrough | ' +
                  'alignleft aligncenter alignright | bullist numlist outdent indent | ' +
                  'blockquote | link | removeformat | code',
                content_style: 'body { font-family: Inter, system-ui, sans-serif; font-size: 14px; }',
              }}
            />
          </div>
        ) : (
          <div style={{ minHeight: '220px', maxHeight: '420px', overflowY: 'auto', padding: '18px', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', color: '#334155' }}>
            {character.description_long ? (
              <div dangerouslySetInnerHTML={{ __html: character.description_long }} />
            ) : (
              <p style={{ margin: 0, color: '#94a3b8' }}>Brak rozbudowanego opisu. Kliknij ikonę edycji, aby dodać tekst.</p>
            )}
          </div>
        )}
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

export default CharacterDetail;
