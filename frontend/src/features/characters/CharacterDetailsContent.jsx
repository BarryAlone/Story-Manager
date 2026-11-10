import { Editor } from '@tinymce/tinymce-react';
import { Link } from 'react-router-dom';

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
  projectId,
  saveError,
}) {
  const imageUrl = character.character_image
    ? backendUrl(`/storage/${character.character_image}`)
    : null;

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
                onClick={() => onEditField('image')}
                title="Zmień zdjęcie"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            {editingFields.image && (
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} style={{ marginTop: '12px', width: '100%' }} />
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
                  onChange={(event) => onInputChange('name', event.target.value)}
                  style={{ width: '100%', padding: '14px', fontSize: '2rem', fontWeight: 700, borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              ) : (
                <h1 style={{ margin: 0, fontSize: '2.5rem' }}>{character.name}</h1>
              )}
            </div>
            <button
              onClick={() => onEditField('name')}
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
                onChange={(event) => onInputChange('group_name', event.target.value)}
                placeholder="Frakcja / grupa"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              />
            ) : (
              <span style={{ backgroundColor: '#4B5563', color: 'white', padding: '8px 16px', borderRadius: '15px', fontSize: '0.95rem' }}>
                {character.group_name || 'Brak grupy'}
              </span>
            )}
            <button
              onClick={() => onEditField('group_name')}
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
                    onClick={() => onEditField('attribute_values')}
                  >
                    Edytuj wartości
                  </button>
                )}
                <button
                  ref={attributesButtonRef}
                  type="button"
                  data-world-panel-trigger
                  onClick={onOpenAttributes}
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

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#374151' }}>Biografia / Opis</h3>
              <button
                onClick={() => onEditField('description')}
                title="Edytuj opis"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                <img src={editIcon} alt="Edytuj" style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
            {editingFields.description ? (
              <textarea
                value={form.description}
                onChange={(event) => onInputChange('description', event.target.value)}
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
              onClick={onReset}
              style={{ padding: '10px 18px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#374151', borderRadius: '8px', cursor: 'pointer' }}
            >
              Anuluj zmiany
            </button>
            <button
              onClick={onSave}
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
            onClick={() => onEditField('description_long')}
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
          <div style={{ minHeight: '220px', maxHeight: '420px', overflowY: 'auto', padding: '18px', backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', color: '#334155' }}>
            {character.description_long ? (
              <div dangerouslySetInnerHTML={{ __html: character.description_long }} />
            ) : (
              <p style={{ margin: 0, color: '#94a3b8' }}>Brak rozbudowanego opisu. Kliknij ikonę edycji, aby dodać tekst.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
