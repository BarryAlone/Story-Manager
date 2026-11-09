import { formatAttributeValue } from '../attributes/attributeValues';

export default function CharacterAttributeSummary({ definitions, values = {} }) {
  const populatedDefinitions = definitions.filter((definition) => {
    const value = values?.[definition.id];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });

  if (populatedDefinitions.length === 0) {
    return <p className="character-attributes__empty">Brak uzupełnionych atrybutów.</p>;
  }

  return (
    <dl className="character-attributes__summary">
      {populatedDefinitions.map((definition) => (
        <div key={definition.id}>
          <dt title={definition.name}>{definition.name}</dt>
          <dd>{formatAttributeValue(definition, values[definition.id])}</dd>
        </div>
      ))}
    </dl>
  );
}
