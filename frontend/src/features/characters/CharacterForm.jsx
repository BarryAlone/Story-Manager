import { useMemo, useRef, useState } from 'react';

import AttributeValueFields from '../attributes/AttributeValueFields';
import {
  attributeValueMapsEqual,
  buildAttributeValueMap,
} from '../attributes/attributeValues';
import { appendCharacterAttributeValues } from './characterApi';

function formValues(character) {
  return {
    attributeValues: character?.attribute_values || {},
    description: character?.description || '',
    descriptionLong: character?.description_long || '',
    groupName: character?.group_name || '',
    image: null,
    name: character?.name || '',
  };
}

export default function CharacterForm({
  character,
  definitionStore,
  isLoading,
  loadError,
  onClose,
  onSave,
  projectId,
}) {
  const [values, setValues] = useState(() => formValues(character));
  const [initialValues] = useState(() => formValues(character));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(loadError || '');
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const definitionsReady = !definitionStore.isLoading && !definitionStore.error;
  const normalizedAttributeValues = useMemo(
    () => buildAttributeValueMap(definitionStore.definitions, values.attributeValues),
    [definitionStore.definitions, values.attributeValues],
  );
  const isDirty = values.name !== initialValues.name
    || values.groupName !== initialValues.groupName
    || values.description !== initialValues.description
    || values.descriptionLong !== initialValues.descriptionLong
    || Boolean(values.image)
    || !attributeValueMapsEqual(
      normalizedAttributeValues,
      buildAttributeValueMap(definitionStore.definitions, initialValues.attributeValues),
    );

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const requestClose = () => {
    if (isSaving) return;
    if (isDirty && !window.confirm('Masz niezapisane zmiany. Czy chcesz je odrzucić?')) return;
    onClose();
  };

  const handleSave = async () => {
    if (savingRef.current || isLoading) return;

    savingRef.current = true;
    setIsSaving(true);
    setFieldErrors({});
    setFormError('');

    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('name', values.name);
    formData.append('group_name', values.groupName || '');
    formData.append('description', values.description || '');
    formData.append('description_long', values.descriptionLong || '');
    appendCharacterAttributeValues(
      formData,
      definitionsReady ? normalizedAttributeValues : undefined,
    );
    if (values.image) formData.append('character_image', values.image);
    if (character?.id) formData.append('_method', 'PUT');

    try {
      const savedCharacter = await onSave(formData, character?.id || null);
      if (savedCharacter) onClose();
    } catch (error) {
      setFieldErrors(error.errors || {});
      setFormError(error.message || 'Nie udało się zapisać postaci.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto' }}>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '5px', width: '400px', margin: '20px 0', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>{character?.id ? 'Edytuj postać' : 'Nowa postać'}</h2>
        {isLoading && <p>Ładowanie danych postaci…</p>}
        <input type="text" placeholder="Imię postaci" value={values.name} disabled={isSaving || isLoading} onChange={(event) => updateValue('name', event.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
        <input type="text" placeholder="Frakcja / Grupa (opcjonalnie)" value={values.groupName} disabled={isSaving || isLoading} onChange={(event) => updateValue('groupName', event.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box' }} />
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isSaving || isLoading} onChange={(event) => updateValue('image', event.target.files[0] || null)} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box' }} />

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
              disabled={isSaving || isLoading}
              errors={fieldErrors}
              values={normalizedAttributeValues}
              onChange={(definitionId, value) => {
                setFieldErrors((current) => ({
                  ...current,
                  [`attribute_values.${definitionId}`]: undefined,
                }));
                setValues((current) => ({
                  ...current,
                  attributeValues: { ...current.attributeValues, [definitionId]: value },
                }));
              }}
            />
          )}
        </section>

        <textarea placeholder="Krótki opis postaci" value={values.description} disabled={isSaving || isLoading} onChange={(event) => updateValue('description', event.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />
        <textarea placeholder="Długi opis postaci" value={values.descriptionLong} disabled={isSaving || isLoading} onChange={(event) => updateValue('descriptionLong', event.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' }} />

        {(formError || loadError) && <p className="character-form__error" role="alert">{formError || loadError}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
          <button type="button" onClick={requestClose} disabled={isSaving} style={{ padding: '10px 20px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Anuluj</button>
          <button type="button" onClick={handleSave} disabled={isSaving || isLoading || !values.name.trim()} style={{ padding: '10px 20px', backgroundColor: '#4B5563', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            {isSaving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
