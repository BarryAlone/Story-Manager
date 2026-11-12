import { backendUrl } from '../../api';
import CharacterCardMenu from './CharacterCardMenu';

export default function CharacterCard({ character, onDelete, onEdit, onOpen }) {
  const imageUrl = character.character_image
    ? backendUrl(`/storage/${character.character_image}`)
    : null;
  const initials = character.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('pl-PL'))
    .join('') || '?';

  return (
    <article className="character-card">
      <button
        type="button"
        className="character-card__main"
        aria-label={`Otwórz szczegóły postaci: ${character.name}`}
        onClick={onOpen}
      >
        <span className={`character-card__image${imageUrl ? '' : ' character-card__image--placeholder'}`}>
          {imageUrl
            ? <img src={imageUrl} alt="" />
            : <span aria-hidden="true">{initials}</span>}
        </span>

        {character.group_name && (
          <span className="character-card__group" title={character.group_name}>
            {character.group_name}
          </span>
        )}

        <span className="character-card__content">
          <span className="character-card__heading">
            <strong title={character.name}>{character.name}</strong>
          </span>
          <span className={`character-card__description${character.description ? '' : ' character-card__description--empty'}`}>
            {character.description || 'Brak krótkiego opisu.'}
          </span>
        </span>
      </button>

      <CharacterCardMenu
        characterName={character.name}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </article>
  );
}
