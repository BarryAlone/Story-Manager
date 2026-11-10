import CharacterCard from './CharacterCard';

export default function CharacterGrid({ characters, onDelete, onEdit, onOpen }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          onDelete={() => onDelete(character.id)}
          onEdit={() => onEdit(character)}
          onOpen={() => onOpen(character.id)}
        />
      ))}
    </div>
  );
}
