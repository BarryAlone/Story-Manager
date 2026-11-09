export function buildAttributeValueMap(definitions, source = {}) {
  return Object.fromEntries(definitions.map((definition) => [
    String(definition.id),
    source?.[definition.id] == null ? '' : String(source[definition.id]),
  ]));
}

export function attributeValueMapsEqual(first, second) {
  const firstEntries = Object.entries(first);
  const secondEntries = Object.entries(second);

  return firstEntries.length === secondEntries.length
    && firstEntries.every(([key, value]) => second[key] === value);
}

export function attributeValueError(errors, definitionId) {
  return errors?.[`attribute_values.${definitionId}`]?.[0] || '';
}

export function formatAttributeValue(definition, value) {
  const text = String(value ?? '');
  if (definition.value_type !== 'number' || !/^[+-]?\d+\.\d+$/.test(text)) return text;

  const [integerPart, fractionPart] = text.split('.');
  const trimmedFraction = fractionPart.replace(/0+$/, '');
  const formatted = trimmedFraction ? `${integerPart}.${trimmedFraction}` : integerPart;
  return formatted === '-0' || formatted === '+0' ? '0' : formatted;
}
