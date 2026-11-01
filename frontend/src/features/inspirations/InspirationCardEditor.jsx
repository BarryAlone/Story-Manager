import InspirationFormFields from './InspirationFormFields';

export default function InspirationCardEditor({
  canSave,
  disabled,
  error,
  existingImageUrl,
  inspirationId,
  isSaving,
  onCancel,
  onChange,
  onImageChange,
  onRemoveImage,
  onSave,
  removeImage,
  values,
}) {
  return (
    <div className="inspiration-card__edit" onClick={(event) => event.stopPropagation()}>
      <InspirationFormFields
        disabled={disabled}
        existingImageUrl={existingImageUrl}
        idPrefix={`inspiration-${inspirationId}`}
        values={values}
        removeImage={removeImage}
        onChange={onChange}
        onImageChange={onImageChange}
        onRemoveImage={onRemoveImage}
      />
      {error && <p className="inspiration-form__error" role="alert">{error}</p>}
      <div className="inspiration-card__edit-actions">
        <button type="button" onClick={onCancel} disabled={disabled}>Anuluj</button>
        <button
          type="button"
          className="inspiration-button--primary"
          onClick={onSave}
          disabled={!canSave || disabled}
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}
