import { useEffect, useMemo, useRef, useState } from 'react';

import { backendUrl } from '../../api';
import AttributeValueFields from '../attributes/AttributeValueFields';
import { attributeValueMapsEqual, buildAttributeValueMap } from '../attributes/attributeValues';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function initialValues(element) {
  return {
    description: element?.description || '',
    image: null,
    name: element?.name || '',
  };
}

export default function WorldElementForm({
  category,
  definitions,
  definitionsError,
  definitionsReady,
  element = null,
  onManageAttributes,
  onRetryDefinitions,
  onBusyChange,
  onCancel,
  onDirtyChange,
  onSubmit,
}) {
  const [values, setValues] = useState(() => initialValues(element));
  const [attributeValueDraft, setAttributeValueDraft] = useState({});
  const [removeImage, setRemoveImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);
  const savingRef = useRef(false);
  const isEditing = Boolean(element);
  const initialAttributeValues = useMemo(
    () => buildAttributeValueMap(definitions, element?.attribute_values),
    [definitions, element?.attribute_values],
  );
  const currentAttributeValues = useMemo(
    () => buildAttributeValueMap(definitions, {
      ...(element?.attribute_values || {}),
      ...attributeValueDraft,
    }),
    [attributeValueDraft, definitions, element?.attribute_values],
  );
  const existingImageUrl = element?.image_path
    ? backendUrl(`/storage/${element.image_path.replace(/^\/+/, '')}`)
    : null;
  const isDirty = useMemo(() => (
    values.name !== (element?.name || '')
    || values.description !== (element?.description || '')
    || !attributeValueMapsEqual(currentAttributeValues, initialAttributeValues)
    || Boolean(values.image)
    || removeImage
  ), [currentAttributeValues, element?.description, element?.name, initialAttributeValues, removeImage, values]);
  const canSave = Boolean(values.name.trim()) && definitionsReady && !isSaving;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onBusyChange(isSaving);
  }, [isSaving, onBusyChange]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const setImage = (image) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = image ? URL.createObjectURL(image) : null;
    setPreviewUrl(objectUrlRef.current);
    setImageError(false);
    setValues((current) => ({ ...current, image }));
    if (image) setRemoveImage(false);
  };

  const selectImage = (event) => {
    const image = event.target.files?.[0] || null;
    setError('');
    setFieldErrors({});

    if (image && !ACCEPTED_IMAGE_TYPES.includes(image.type)) {
      setError('Wybierz obraz JPEG, PNG albo WebP.');
      event.target.value = '';
      return;
    }
    if (image && image.size > MAX_IMAGE_SIZE) {
      setError('Obraz nie może być większy niż 5 MiB.');
      event.target.value = '';
      return;
    }

    setImage(image);
  };

  const clearSelectedImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!values.name.trim() || savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setError('');
    setFieldErrors({});

    try {
      await onSubmit({
        attributeValues: definitionsReady ? currentAttributeValues : undefined,
        description: values.description,
        image: values.image,
        name: values.name.trim(),
        removeImage: removeImage && !values.image,
      });
    } catch (submitError) {
      const nextFieldErrors = submitError.errors || {};
      const hasAttributeErrors = Object.keys(nextFieldErrors).some((field) => (
        field.startsWith('attribute_values.')
      ));
      setFieldErrors(nextFieldErrors);
      setError(hasAttributeErrors ? '' : submitError.message || 'Nie udało się zapisać elementu.');
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const visibleImageUrl = previewUrl || (!removeImage ? existingImageUrl : null);

  return (
    <form className="world-element-form" onSubmit={submit}>
      <p className="world-element-form__context">
        Kategoria: <strong>{category.name}</strong>
      </p>

      <label htmlFor="world-element-name">
        Nazwa
        <input
          id="world-element-name"
          type="text"
          maxLength={128}
          value={values.name}
          autoComplete="off"
          autoFocus
          disabled={isSaving}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        />
      </label>

      <label htmlFor="world-element-description">
        Opis <span>(opcjonalny)</span>
        <textarea
          id="world-element-description"
          maxLength={20000}
          rows={9}
          value={values.description}
          disabled={isSaving}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
        />
      </label>

      <section className="world-element-form__attributes" aria-labelledby="world-element-attributes-title">
        <h3 id="world-element-attributes-title">Atrybuty</h3>
        {!definitionsReady && !definitionsError && (
          <p className="world-element-form__attributes-empty">Ładowanie atrybutów…</p>
        )}
        {definitionsError && (
          <p className="world-element-form__attributes-empty" role="alert">
            Nie udało się pobrać atrybutów.{' '}
            <button type="button" onClick={onRetryDefinitions} disabled={isSaving}>Spróbuj ponownie</button>
          </p>
        )}
        {definitionsReady && definitions.length === 0 && (
          <p className="world-element-form__attributes-empty">
            Brak atrybutów w tej kategorii.{' '}
            <button type="button" onClick={onManageAttributes} disabled={isSaving}>Zarządzaj atrybutami</button>
          </p>
        )}
        {definitionsReady && definitions.length > 0 && (
          <AttributeValueFields
            definitions={definitions}
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
      </section>

      <div className="world-element-form__image-field">
        <span className="world-element-form__label">Obraz <span>(opcjonalny)</span></span>
        <div className="world-element-form__image-preview">
          {visibleImageUrl && !imageError ? (
            <img
              src={visibleImageUrl}
              alt={previewUrl ? 'Podgląd wybranego obrazu' : `Obraz elementu: ${element?.name || values.name}`}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="world-element-image-placeholder">
              <ImagePlaceholderIcon />
              <span>{imageError ? 'Nie udało się wczytać obrazu' : 'Brak obrazu'}</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          id="world-element-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isSaving}
          onChange={selectImage}
        />
        <small>JPEG, PNG lub WebP, maksymalnie 5 MiB.</small>

        <div className="world-element-form__image-actions">
          {values.image && (
            <button type="button" onClick={clearSelectedImage} disabled={isSaving}>
              Usuń wybrany obraz
            </button>
          )}
          {isEditing && existingImageUrl && !values.image && !removeImage && (
            <button type="button" onClick={() => setRemoveImage(true)} disabled={isSaving}>
              Usuń obecny obraz
            </button>
          )}
          {removeImage && !values.image && (
            <button type="button" onClick={() => setRemoveImage(false)} disabled={isSaving}>
              Zachowaj obecny obraz
            </button>
          )}
        </div>
      </div>

      {error && <p className="world-element-form__error" role="alert">{error}</p>}

      <footer className="world-element-form__actions">
        <button type="button" className="world-button world-button--secondary" onClick={onCancel} disabled={isSaving}>
          Anuluj
        </button>
        <button type="submit" className="world-button world-button--primary" disabled={!canSave}>
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </footer>
    </form>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m4 17 5-5 4 4 2-2 5 5" />
    </svg>
  );
}
