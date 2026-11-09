import { useEffect, useMemo, useRef, useState } from 'react';

function initialValues(definition) {
  return {
    name: definition?.name || '',
    value_type: definition?.value_type || 'text',
  };
}

export default function AttributeDefinitionForm({
  definition = null,
  disabled,
  isClosing = false,
  onCancel,
  onDirtyChange,
  onSubmit,
  variant = 'default',
}) {
  const initial = useMemo(() => initialValues(definition), [definition]);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const savingRef = useRef(false);
  const isDirty = values.name !== initial.name || values.value_type !== initial.value_type;
  const idSuffix = definition?.id || 'new';

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const changeValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setGeneralError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!values.name.trim() || savingRef.current || disabled) return;

    savingRef.current = true;
    setErrors({});
    setGeneralError('');

    try {
      await onSubmit({ name: values.name.trim(), value_type: values.value_type });
    } catch (error) {
      setErrors(error.errors || {});
      setGeneralError(error.message || 'Nie udało się zapisać atrybutu.');
      savingRef.current = false;
    }
  };

  return (
    <form
      className={`attribute-definition-form attribute-definition-form--${variant}${isClosing ? ' attribute-definition-form--closing' : ''}`}
      onSubmit={submit}
    >
      <label htmlFor={`attribute-definition-name-${idSuffix}`}>
        Nazwa
        <input
          id={`attribute-definition-name-${idSuffix}`}
          type="text"
          maxLength={128}
          value={values.name}
          autoComplete="off"
          autoFocus
          disabled={disabled}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => changeValue('name', event.target.value)}
        />
        {errors.name?.[0] && <span className="attribute-field-error" role="alert">{errors.name[0]}</span>}
      </label>

      <label htmlFor={`attribute-definition-type-${idSuffix}`}>
        Typ
        <select
          id={`attribute-definition-type-${idSuffix}`}
          value={values.value_type}
          disabled={disabled}
          aria-invalid={Boolean(errors.value_type)}
          onChange={(event) => changeValue('value_type', event.target.value)}
        >
          <option value="text">Tekst</option>
          <option value="number">Liczba</option>
        </select>
        {errors.value_type?.[0] && <span className="attribute-field-error" role="alert">{errors.value_type[0]}</span>}
      </label>

      {generalError && <p className="attribute-definition-form__error" role="alert">{generalError}</p>}

      <footer>
        <button type="button" className="world-button world-button--secondary" onClick={onCancel} disabled={disabled}>
          Anuluj
        </button>
        <button type="submit" className="world-button world-button--primary" disabled={disabled || !values.name.trim()}>
          {disabled && !isClosing ? 'Zapisywanie…' : definition ? 'Zapisz' : 'Dodaj'}
        </button>
      </footer>

      <span className="sr-only" aria-live="polite">{isDirty ? 'Formularz zawiera niezapisane zmiany.' : ''}</span>
    </form>
  );
}
