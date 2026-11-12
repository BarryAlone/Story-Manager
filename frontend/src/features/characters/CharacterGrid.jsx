import CharacterCard from './CharacterCard';

export default function CharacterGrid({ characters, onDelete, onEdit, onOpen }) {
  return (
    <div className="character-grid">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          onDelete={(trigger) => onDelete(character.id, trigger)}
          onEdit={(trigger) => onEdit(character, trigger)}
          onOpen={() => onOpen(character.id)}
        />
      ))}
    </div>
  );
}
