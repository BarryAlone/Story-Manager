import { useState } from 'react';

export default function NoteFormFields({
  disabled = false,
  existingImageUrl = null,
  idPrefix,
  onChange,
  onImageChange,
  onRemoveImage,
  removeImage = false,
  values,
}) {
  const [isSourceVisible, setIsSourceVisible] = useState(Boolean(values.source));

  return (
    <div className="note-form__fields">
      <label htmlFor={`${idPrefix}-title`}>
        Tytuł
        <input
          id={`${idPrefix}-title`}
          type="text"
          maxLength="120"
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          autoComplete="off"
          disabled={disabled}
        />
      </label>

      <label htmlFor={`${idPrefix}-content`}>
        Treść
        <textarea
          id={`${idPrefix}-content`}
          maxLength="10000"
          rows="7"
          value={values.content}
          onChange={(event) => onChange('content', event.target.value)}
          disabled={disabled}
        />
      </label>

      {isSourceVisible ? (
        <label htmlFor={`${idPrefix}-source`}>
          Źródło
          <input
            id={`${idPrefix}-source`}
            type="text"
            maxLength="500"
            value={values.source}
            onChange={(event) => onChange('source', event.target.value)}
            placeholder="Autor, książka lub adres URL"
            autoComplete="off"
            disabled={disabled}
          />
        </label>
      ) : (
        <button
          type="button"
          className="note-form__add-source"
          onClick={() => setIsSourceVisible(true)}
          disabled={disabled}
        >
          + Dodaj źródło
        </button>
      )}

      <div className="note-form__image-field">
        <label htmlFor={`${idPrefix}-image`}>Zdjęcie</label>
        {existingImageUrl && !removeImage && !values.image && (
          <div className="note-form__existing-image">
            <img src={existingImageUrl} alt="Obecne zdjęcie notatki" />
            <button type="button" onClick={onRemoveImage} disabled={disabled}>Usuń zdjęcie</button>
          </div>
        )}
        <input
          id={`${idPrefix}-image`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onImageChange(event.target.files?.[0] || null)}
          disabled={disabled}
        />
        {values.image && <span className="note-form__file-name">Wybrano: {values.image.name}</span>}
        {removeImage && !values.image && <span className="note-form__file-name">Zdjęcie zostanie usunięte.</span>}
      </div>
    </div>
  );
}
