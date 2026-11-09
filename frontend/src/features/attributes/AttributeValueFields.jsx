import { attributeValueError } from './attributeValues';

export default function AttributeValueFields({
  definitions,
  disabled,
  errors = {},
  onChange,
  values,
}) {
  return (
    <div className="attribute-value-fields">
      {definitions.map((definition) => {
        const id = String(definition.id);
        const error = attributeValueError(errors, id);

        return (
          <label key={definition.id} htmlFor={`attribute-value-${id}`}>
            <span className="attribute-value-fields__name" title={definition.name}>{definition.name}</span>
            <input
              id={`attribute-value-${id}`}
              type={definition.value_type === 'number' ? 'number' : 'text'}
              step={definition.value_type === 'number' ? 'any' : undefined}
              inputMode={definition.value_type === 'number' ? 'decimal' : undefined}
              autoComplete="off"
              value={values[id] ?? ''}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `attribute-value-${id}-error` : undefined}
              onChange={(event) => onChange(id, event.target.value)}
            />
            {error && (
              <span id={`attribute-value-${id}-error`} className="attribute-field-error" role="alert">
                {error}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
