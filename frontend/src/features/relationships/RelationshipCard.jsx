import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  characterInitials,
  relationColor,
  resolveCharacterImageUrl,
} from './relationshipGraphData';

function displayCharacter(character) {
  if (!character) {
    return {
      id: 'unknown',
      name: 'Nieznana postać',
      imageUrl: null,
      initials: '?',
    };
  }

  return {
    id: character.id,
    name: character.name || 'Nieznana postać',
    imageUrl: character.imageUrl || resolveCharacterImageUrl(character.character_image),
    initials: character.initials || characterInitials(character.name),
  };
}

export function RelationshipCharacter({ character }) {
  const person = displayCharacter(character);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="relationship-card__character" title={person.name}>
      {person.imageUrl && !imageFailed ? (
        <img
          className="relationship-card__avatar"
          src={person.imageUrl}
          alt=""
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className="relationship-card__avatar relationship-card__avatar--fallback"
          style={{ backgroundColor: relationColor(`character-${person.id}`) }}
          aria-hidden="true"
        >
          {person.initials}
        </span>
      )}
      <span className="relationship-card__character-name">{person.name}</span>
    </span>
  );
}

export function RelationshipParticipants({ source, target, relationName }) {
  return (
    <div className="relationship-card__participants">
      <RelationshipCharacter character={source} />
      {relationName ? (
        <span className="relationship-card__name" title={relationName}>{relationName}</span>
      ) : (
        <span className="relationship-card__connector" aria-hidden="true">—</span>
      )}
      <RelationshipCharacter character={target} />
    </div>
  );
}

export default function RelationshipCard({
  relationship,
  source,
  target,
  contextCharacterId = null,
  disabled = false,
  fieldError = '',
  formError = '',
  isDeleting = false,
  isExpanded = false,
  isReadOnly = false,
  isSaving = false,
  nameDraft = '',
  onCancel,
  onDelete,
  onExpand,
  onNameChange,
  onSave,
}) {
  const cardRef = useRef(null);
  const fieldId = useId();
  const nameInputRef = useRef(null);
  const relationName = relationship.relation_name || relationship.label || 'Powiązanie';
  const sourceId = String(source?.id ?? '');
  const contextualCharacter = String(contextCharacterId) === sourceId ? target : source;

  useEffect(() => {
    if (!isExpanded || isReadOnly) return;

    const frame = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      cardRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
      nameInputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isExpanded, isReadOnly]);

  if (!isExpanded) {
    return (
      <article className="relationship-card">
        <button
          type="button"
          className={`relationship-card__summary${contextCharacterId === null ? '' : ' relationship-card__summary--contextual'}`}
          aria-expanded="false"
          disabled={disabled}
          onClick={onExpand}
        >
          {contextCharacterId === null ? (
            <RelationshipParticipants
              source={source}
              target={target}
              relationName={relationName}
            />
          ) : (
            <>
              <RelationshipCharacter character={contextualCharacter} />
              <span className="relationship-card__name" title={relationName}>{relationName}</span>
            </>
          )}
        </button>
      </article>
    );
  }

  return (
    <article ref={cardRef} className="relationship-card relationship-card--expanded">
      <div className="relationship-card__expanded-content">
        <RelationshipParticipants source={source} target={target} />

        {isReadOnly ? (
          <>
            <p className="relationship-graph__readonly">Dane testowe — tylko odczyt.</p>
            <div className="relationship-card__actions relationship-card__actions--readonly">
              <button type="button" className="relationship-workspace__secondary" onClick={onCancel}>
                Zwiń
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onSave} noValidate>
            <label className="relationship-workspace__field" htmlFor={fieldId}>
              Nazwa relacji
              <input
                ref={nameInputRef}
                id={fieldId}
                type="text"
                maxLength={128}
                value={nameDraft}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? `${fieldId}-error` : undefined}
                onChange={(event) => onNameChange(event.target.value)}
              />
            </label>
            {fieldError ? (
              <p id={`${fieldId}-error`} className="relationship-workspace__field-error">
                {fieldError}
              </p>
            ) : null}
            {formError ? <p className="relationship-workspace__field-error" role="alert">{formError}</p> : null}

            <div className="relationship-card__actions">
              <button
                type="button"
                className="relationship-workspace__danger"
                disabled={isDeleting || isSaving}
                onClick={onDelete}
              >
                {isDeleting ? 'Usuwanie…' : 'Usuń relację'}
              </button>
              <span className="relationship-card__actions-primary">
                <button
                  type="button"
                  className="relationship-workspace__secondary"
                  disabled={isDeleting || isSaving}
                  onClick={onCancel}
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="relationship-workspace__primary"
                  disabled={isDeleting || isSaving}
                >
                  {isSaving ? 'Zapisywanie…' : 'Zapisz'}
                </button>
              </span>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}
