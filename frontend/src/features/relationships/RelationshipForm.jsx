import CharacterCombobox from './CharacterCombobox';

export default function RelationshipForm({ crud, firstCharacterRef }) {
  const isEditing = crud.editingRelationshipId !== null;

  return (
    <section className="relationship-workspace__section" aria-labelledby="relationship-form-heading">
      <div className="relationship-workspace__section-heading">
        <h2 id="relationship-form-heading">{isEditing ? 'Edytuj relację' : 'Nowa relacja'}</h2>
        <button type="button" className="relationship-workspace__secondary" onClick={crud.beginNew}>
          Nowa relacja
        </button>
      </div>
      <form className="relationship-workspace__form" onSubmit={crud.save} noValidate>
        <CharacterCombobox
          ref={firstCharacterRef}
          id="relationship-character-1"
          label="Postać źródłowa"
          characters={crud.characters}
          selectedId={crud.character1Id}
          query={crud.character1Query}
          excludedId={crud.character2Id}
          error={crud.fieldErrors.character_1_id?.[0]}
          disabled={isEditing}
          onQueryChange={crud.setCharacter1Query}
          onSelect={(character) => crud.setCharacter1Id(character ? String(character.id) : '')}
        />
        <CharacterCombobox
          id="relationship-character-2"
          label="Postać docelowa"
          characters={crud.characters}
          selectedId={crud.character2Id}
          query={crud.character2Query}
          excludedId={crud.character1Id}
          error={crud.fieldErrors.character_2_id?.[0]}
          disabled={isEditing}
          onQueryChange={crud.setCharacter2Query}
          onSelect={(character) => crud.setCharacter2Id(character ? String(character.id) : '')}
        />
        <label className="relationship-workspace__field" htmlFor="relationship-type">
          Typ relacji
          <input
            id="relationship-type"
            type="text"
            value={crud.relationshipType}
            maxLength={128}
            disabled={isEditing}
            aria-invalid={Boolean(crud.fieldErrors.relation_name)}
            aria-describedby={crud.fieldErrors.relation_name ? 'relationship-type-error' : undefined}
            onChange={(event) => crud.setRelationshipType(event.target.value)}
            placeholder="Np. Rodzeństwo, sojusz"
          />
        </label>
        {crud.fieldErrors.relation_name ? (
          <p id="relationship-type-error" className="relationship-workspace__field-error">
            {crud.fieldErrors.relation_name[0]}
          </p>
        ) : null}
        {isEditing ? (
          <p className="relationship-workspace__notice">
            Dane relacji zostały wczytane, ale zapis edycji wymaga brakującej trasy aktualizacji w API.
          </p>
        ) : null}
        {crud.formError ? <p className="relationship-workspace__field-error" role="alert">{crud.formError}</p> : null}
        <div className="relationship-workspace__form-actions">
          <button type="submit" className="relationship-workspace__primary" disabled={crud.isSaving || isEditing}>
            {crud.isSaving ? 'Zapisywanie…' : 'Zapisz relację'}
          </button>
          {isEditing ? (
            <button
              type="button"
              className="relationship-workspace__danger"
              disabled={crud.isDeleting}
              onClick={() => crud.remove(crud.editingRelationshipId)}
            >
              {crud.isDeleting ? 'Usuwanie…' : 'Usuń relację'}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
