import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { backendUrl } from '../../api';
import AttributeValueFields from '../attributes/AttributeValueFields';
import {
  attributeValueMapsEqual,
  buildAttributeValueMap,
} from '../attributes/attributeValues';
import { appendCharacterAttributeValues } from './characterApi';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
  onBusyChange,
  onDelete,
  onDeleted,
  onDirtyChange,
  onManageAttributes,
  onSave,
  onSaved,
  projectId,
}) {
  const [values, setValues] = useState(() => formValues(character));
  const [initialValues] = useState(() => formValues(character));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(loadError || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const imagePreviewButtonRef = useRef(null);
  const lightboxCloseButtonRef = useRef(null);
  const objectUrlRef = useRef(null);
  const savingRef = useRef(false);
  const wasPreviewOpenRef = useRef(false);
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

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onBusyChange(isSaving || isDeleting);
  }, [isDeleting, isSaving, onBusyChange]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    lightboxCloseButtonRef.current?.focus({ preventScroll: true });

    const closeWithKeyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsPreviewOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        lightboxCloseButtonRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', closeWithKeyboard, true);
    return () => document.removeEventListener('keydown', closeWithKeyboard, true);
  }, [isPreviewOpen]);

  useEffect(() => {
    if (isPreviewOpen) {
      wasPreviewOpenRef.current = true;
      return;
    }

    if (wasPreviewOpenRef.current) {
      wasPreviewOpenRef.current = false;
      imagePreviewButtonRef.current?.focus({ preventScroll: true });
    }
  }, [isPreviewOpen]);

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const selectImage = (event) => {
    const image = event.target.files?.[0] || null;
    setFormError('');
    setImageError(false);

    if (image && !ACCEPTED_IMAGE_TYPES.includes(image.type)) {
      setFormError('Wybierz obraz JPEG, PNG albo WebP.');
      event.target.value = '';
      return;
    }
    if (image && image.size > MAX_IMAGE_SIZE) {
      setFormError('Obraz nie może być większy niż 5 MiB.');
      event.target.value = '';
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = image ? URL.createObjectURL(image) : null;
    setPreviewUrl(objectUrlRef.current);
    updateValue('image', image);
  };

  const handleSave = async (event) => {
    event?.preventDefault();
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

    let savedCharacter = null;
    try {
      savedCharacter = await onSave(formData, character?.id || null);
    } catch (error) {
      setFieldErrors(error.errors || {});
      setFormError(error.message || 'Nie udało się zapisać postaci.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }

    if (savedCharacter) onSaved(savedCharacter);
  };

  const handleDelete = async () => {
    if (!character?.id || savingRef.current || isLoading) return;

    savingRef.current = true;
    setIsDeleting(true);
    setFormError('');

    let deleted = false;
    try {
      deleted = await onDelete(character.id);
    } catch (error) {
      setFormError(error.message || 'Nie udało się usunąć postaci.');
    } finally {
      savingRef.current = false;
      setIsDeleting(false);
    }

    if (deleted) onDeleted();
  };

  const existingImageUrl = character?.character_image
    ? backendUrl(`/storage/${character.character_image.replace(/^\/+/, '')}`)
    : null;
  const visibleImageUrl = previewUrl || existingImageUrl;

  return (
    <form className="world-element-form character-form" onSubmit={handleSave}>
      {isLoading && <p className="character-form__loading">Ładowanie danych postaci…</p>}

      <label htmlFor="character-name">
        Imię postaci
        <input
          id="character-name"
          type="text"
          value={values.name}
          disabled={isSaving || isLoading}
          onChange={(event) => updateValue('name', event.target.value)}
        />
      </label>

      <label htmlFor="character-group-name">
        Frakcja / grupa <span>(opcjonalnie)</span>
        <input
          id="character-group-name"
          type="text"
          value={values.groupName}
          disabled={isSaving || isLoading}
          onChange={(event) => updateValue('groupName', event.target.value)}
        />
      </label>

      <section className="world-element-form__attributes character-form__attributes" aria-labelledby="character-form-attributes-title">
        <div className="character-form__attributes-header">
          <h3 id="character-form-attributes-title">Atrybuty</h3>
          <button type="button" onClick={(event) => onManageAttributes(event.currentTarget)} disabled={isSaving || isLoading}>
            Zarządzaj atrybutami
          </button>
        </div>
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

      <label htmlFor="character-description">
        Krótki opis <span>(opcjonalnie)</span>
        <textarea
          id="character-description"
          value={values.description}
          disabled={isSaving || isLoading}
          onChange={(event) => updateValue('description', event.target.value)}
        />
      </label>

      <label htmlFor="character-description-long">
        Długi opis <span>(opcjonalnie)</span>
        <textarea
          id="character-description-long"
          value={values.descriptionLong}
          disabled={isSaving || isLoading}
          onChange={(event) => updateValue('descriptionLong', event.target.value)}
        />
      </label>

      <div className="world-element-form__image-field">
        <span className="world-element-form__label">
          Obraz <span>(opcjonalnie)</span>
        </span>
        {visibleImageUrl && !imageError ? (
          <button
            ref={imagePreviewButtonRef}
            type="button"
            className="world-element-details__image-trigger character-form__image-trigger"
            title="Powiększ obraz postaci"
            aria-label="Powiększ obraz postaci"
            onClick={() => setIsPreviewOpen(true)}
          >
            <span className="world-element-form__image-preview">
            <img
              src={visibleImageUrl}
              alt={previewUrl ? 'Podgląd wybranego obrazu postaci' : `Obraz postaci: ${character?.name || values.name}`}
              onError={() => setImageError(true)}
            />
            </span>
          </button>
        ) : (
          <div className="world-element-form__image-preview">
            <div className="world-element-image-placeholder">
              <CharacterImagePlaceholderIcon />
              <span>{imageError ? 'Nie udało się wczytać obrazu' : 'Brak obrazu'}</span>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          id="character-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isSaving || isLoading}
          onChange={selectImage}
        />
      </div>

      {(formError || loadError) && <p className="character-form__error" role="alert">{formError || loadError}</p>}

      <footer className="world-element-form__actions">
        {character?.id && (
          <button type="button" className="world-button world-button--danger" onClick={handleDelete} disabled={isSaving || isDeleting || isLoading}>
            {isDeleting ? 'Usuwanie…' : 'Usuń postać'}
          </button>
        )}
        <button type="submit" className="world-button world-button--primary character-form__save" disabled={isSaving || isDeleting || isLoading || !values.name.trim()}>
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </footer>

      {isPreviewOpen && visibleImageUrl && createPortal(
        <div
          className="world-element-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Powiększony obraz postaci"
          data-panel-portal
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPreviewOpen(false);
          }}
        >
          <button
            ref={lightboxCloseButtonRef}
            type="button"
            className="world-element-image-lightbox__close"
            aria-label="Zamknij powiększony obraz"
            onClick={() => setIsPreviewOpen(false)}
          >
            ×
          </button>
          <img src={visibleImageUrl} alt="Powiększony obraz postaci" />
        </div>,
        document.body,
      )}
    </form>
  );
}

function CharacterImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m4 17 5-5 4 4 2-2 5 5" />
    </svg>
  );
}
