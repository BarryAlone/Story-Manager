import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tinymce/tinymce-react';

import editIcon from '../../assets/icons/pencil.png';
import { backendUrl } from '../../api';
import AttributeValueFields from '../attributes/AttributeValueFields';
import CharacterAttributeSummary from './CharacterAttributeSummary';

export default function CharacterDetailsContent({
  attributesButtonRef,
  character,
  currentAttributeValues,
  definitionStore,
  definitionsReady,
  editingFields,
  fieldErrors,
  form,
  isAttributesPanelOpen,
  isSaving,
  onAttributeChange,
  onEditField,
  onImageChange,
  onInputChange,
  onOpenAttributes,
  onReset,
  onSave,
  saveError,
}) {
  const imageUrl = character.character_image
    ? backendUrl(`/storage/${character.character_image}`)
    : null;
  const selectedImageUrl = useMemo(
    () => (form.imageFile ? URL.createObjectURL(form.imageFile) : null),
    [form.imageFile],
  );
  const visibleImageUrl = selectedImageUrl || imageUrl;
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const imageInputRef = useRef(null);
  const imagePreviewButtonRef = useRef(null);
  const lightboxCloseButtonRef = useRef(null);
  const wasImagePreviewOpenRef = useRef(false);
  const isEditing = Object.values(editingFields).some(Boolean);
  const beginEditingFromSurface = (event, field, enabled = true) => {
    if (!enabled || editingFields[field]) return;
    if (event.target.closest('button, a, input, textarea, select, [contenteditable="true"], .tox-tinymce')) return;
    onEditField(field);
  };

  useEffect(() => () => {
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  }, [selectedImageUrl]);

  useEffect(() => {
    if (!isImagePreviewOpen) return undefined;

    lightboxCloseButtonRef.current?.focus({ preventScroll: true });
    const closeWithKeyboard = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsImagePreviewOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        lightboxCloseButtonRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', closeWithKeyboard, true);
    return () => document.removeEventListener('keydown', closeWithKeyboard, true);
  }, [isImagePreviewOpen]);

  useEffect(() => {
    if (isImagePreviewOpen) {
      wasImagePreviewOpenRef.current = true;
      return;
    }

    if (wasImagePreviewOpenRef.current) {
      wasImagePreviewOpenRef.current = false;
      imagePreviewButtonRef.current?.focus({ preventScroll: true });
    }
  }, [isImagePreviewOpen]);

  return (
    <div className="character-wiki">
      <div className="character-wiki__layout">
        <main className="character-wiki__article">
          <header className="character-wiki__article-header">
            <div
              className={`character-wiki__title-row${editingFields.name ? '' : ' character-wiki__editable'}`}
              onClick={(event) => beginEditingFromSurface(event, 'name')}
            >
              {editingFields.name ? (
                <input
                  className="character-wiki__title-input"
                  type="text"
                  value={form.name}
                  aria-label="Nazwa postaci"
                  onChange={(event) => onInputChange('name', event.target.value)}
                />
              ) : (
                <h1>{character.name}</h1>
              )}
              <EditButton label="Edytuj nazwę postaci" onClick={() => onEditField('name')} />
            </div>

            <div
              className={`character-wiki__intro${editingFields.description ? '' : ' character-wiki__editable'}`}
              onClick={(event) => beginEditingFromSurface(event, 'description')}
            >
              {editingFields.description ? (
                <textarea
                  value={form.description}
                  aria-label="Krótki opis postaci"
                  rows={5}
                  onChange={(event) => onInputChange('description', event.target.value)}
                />
              ) : (
                <p className={character.description ? '' : 'character-wiki__empty-text'}>
                  {character.description || 'Ta postać nie ma jeszcze krótkiego opisu.'}
                </p>
              )}
              <div className="character-wiki__intro-heading">
                <EditButton label="Edytuj krótki opis" onClick={() => onEditField('description')} />
              </div>
            </div>
          </header>

          <section
            className={`character-wiki__history${editingFields.description_long ? '' : ' character-wiki__editable'}`}
            aria-labelledby="character-history-title"
            onClick={(event) => beginEditingFromSurface(event, 'description_long')}
          >
            <div className="character-wiki__section-heading">
              <h2 id="character-history-title">Historia postaci</h2>
              <EditButton label="Edytuj historię postaci" onClick={() => onEditField('description_long')} />
            </div>

            {editingFields.description_long ? (
              <div className="character-wiki__editor">
                <Editor
                  apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                  value={form.description_long}
                  onEditorChange={(content) => onInputChange('description_long', content)}
                  init={{
                    height: 'calc(100vh - 260px)',
                    menubar: false,
                    plugins: [
                      'advlist autolink lists link charmap preview anchor',
                      'searchreplace visualblocks code fullscreen',
                      'insertdatetime table code help wordcount',
                    ],
                    toolbar:
                      'undo redo | formatselect | bold italic underline strikethrough | '
                      + 'alignleft aligncenter alignright | bullist numlist outdent indent | '
                      + 'blockquote | link | removeformat | code',
                    content_style: 'body { font-family: Inter, system-ui, sans-serif; font-size: 14px; }',
                  }}
                />
              </div>
            ) : (
              <div className="character-wiki__history-content">
                {character.description_long ? (
                  <div dangerouslySetInnerHTML={{ __html: character.description_long }} />
                ) : (
                  <p className="character-wiki__empty-text">
                    Brak historii postaci. Użyj akcji edycji, aby dodać tekst.
                  </p>
                )}
              </div>
            )}
          </section>

          {saveError && <p className="character-form__error" role="alert">{saveError}</p>}
          {isEditing && (
            <div className="character-wiki__save-actions">
              <button type="button" className="character-wiki__button" onClick={onReset}>
                Anuluj zmiany
              </button>
              <button
                type="button"
                className="character-wiki__button character-wiki__button--primary"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? 'Zapisuję…' : 'Zapisz zmiany'}
              </button>
            </div>
          )}
        </main>

        <aside className="character-wiki__infobox" aria-label={`Informacje o postaci: ${character.name}`}>
          <div
            className={`character-wiki__infobox-title${editingFields.name ? '' : ' character-wiki__editable'}`}
            onClick={(event) => beginEditingFromSurface(event, 'name')}
          >
            {editingFields.name ? (
              <input
                type="text"
                value={form.name}
                aria-label="Nazwa postaci"
                onChange={(event) => onInputChange('name', event.target.value)}
              />
            ) : (
              <h2 title={character.name}>{character.name}</h2>
            )}
            <EditButton label="Edytuj nazwę postaci" onClick={() => onEditField('name')} />
          </div>

          <div className="character-wiki__portrait">
            {visibleImageUrl ? (
              <button
                ref={imagePreviewButtonRef}
                type="button"
                className="character-wiki__portrait-preview"
                aria-label={`Powiększ portret postaci: ${form.name || character.name}`}
                title={`Powiększ portret postaci: ${form.name || character.name}`}
                onClick={() => setIsImagePreviewOpen(true)}
              >
                <img src={visibleImageUrl} alt={`Portret postaci: ${form.name || character.name}`} />
              </button>
            ) : (
              <div className="character-wiki__portrait-placeholder">
                <span aria-hidden="true">{character.name.trim().charAt(0).toLocaleUpperCase('pl-PL') || '?'}</span>
                <small>Brak zdjęcia</small>
              </div>
            )}
            <EditButton label="Zmień zdjęcie postaci" onClick={() => imageInputRef.current?.click()} />
            <input
              ref={imageInputRef}
              className="character-wiki__image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onImageChange}
            />
          </div>

          <div
            className={`character-wiki__infobox-identity${editingFields.group_name ? '' : ' character-wiki__editable'}`}
            onClick={(event) => beginEditingFromSurface(event, 'group_name')}
          >
            <div className="character-wiki__group-row">
              <span className="character-wiki__group-label">Grupa:</span>
              {editingFields.group_name ? (
                <input
                  type="text"
                  value={form.group_name}
                  aria-label="Grupa postaci"
                  placeholder="Frakcja / grupa"
                  onChange={(event) => onInputChange('group_name', event.target.value)}
                />
              ) : (
                <span className={`character-wiki__group-value${character.group_name ? '' : ' character-wiki__group--empty'}`} title={character.group_name || 'Brak grupy'}>
                  {character.group_name || 'Brak grupy'}
                </span>
              )}
              <EditButton label="Edytuj grupę postaci" onClick={() => onEditField('group_name')} />
            </div>
          </div>

          <section
            className={`character-detail__attributes${editingFields.attribute_values || !definitionsReady || definitionStore.definitions.length === 0 ? '' : ' character-wiki__editable'}`}
            aria-labelledby="character-detail-attributes-title"
            onClick={(event) => beginEditingFromSurface(
              event,
              'attribute_values',
              definitionsReady && definitionStore.definitions.length > 0,
            )}
          >
            <div className="character-detail__attributes-header">
              <h3 id="character-detail-attributes-title">Atrybuty</h3>
              <div className="character-detail__attributes-controls">
                <button
                  ref={attributesButtonRef}
                  type="button"
                  className="character-detail__attributes-manage"
                  data-world-panel-trigger
                  onClick={onOpenAttributes}
                  disabled={definitionStore.isMutating || isAttributesPanelOpen}
                >
                  Zarządzaj atrybutami
                </button>
                {definitionsReady && definitionStore.definitions.length > 0 && !editingFields.attribute_values && (
                  <EditButton label="Edytuj wartości atrybutów" onClick={() => onEditField('attribute_values')} />
                )}
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
                onChange={onAttributeChange}
              />
            )}
            {definitionsReady && !editingFields.attribute_values && (
              <CharacterAttributeSummary
                definitions={definitionStore.definitions}
                values={character.attribute_values}
              />
            )}

          </section>
        </aside>
      </div>

      {isImagePreviewOpen && visibleImageUrl && createPortal(
        <div
          className="world-element-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Powiększony portret postaci: ${form.name || character.name}`}
          data-panel-portal
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsImagePreviewOpen(false);
          }}
        >
          <button
            ref={lightboxCloseButtonRef}
            type="button"
            className="world-element-image-lightbox__close"
            aria-label="Zamknij powiększony portret"
            onClick={() => setIsImagePreviewOpen(false)}
          >
            ×
          </button>
          <img src={visibleImageUrl} alt={`Powiększony portret postaci: ${form.name || character.name}`} />
        </div>,
        document.body,
      )}
    </div>
  );
}

function EditButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="character-wiki__edit-button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <img src={editIcon} alt="" />
    </button>
  );
}
