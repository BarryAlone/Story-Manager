import { RelationshipParticipants } from './RelationshipCard';

export default function RelationshipForm({
  crud,
  isGraphCreation = false,
  onCancel,
  onSubmit,
  showHeading = true,
}) {
  const source = crud.getCharacter(crud.character1Id);
  const target = crud.getCharacter(crud.character2Id);

  return (
    <section
      className="relationship-workspace__section"
      aria-labelledby={showHeading ? 'relationship-form-heading' : undefined}
      aria-label={showHeading ? undefined : 'Formularz nowej relacji'}
    >
      {showHeading ? (
        <div className="relationship-workspace__section-heading">
          <h2 id="relationship-form-heading">Nowa relacja</h2>
        </div>
      ) : null}
      <form
        className="relationship-workspace__form relationship-workspace__form--compact"
        onSubmit={onSubmit || crud.save}
        onKeyDownCapture={(event) => {
          if (event.key !== 'Escape' || !isGraphCreation) return;
          event.preventDefault();
          event.stopPropagation();
          onCancel?.();
        }}
        noValidate
      >
        <RelationshipParticipants source={source} target={target} />
        <label className="relationship-workspace__field" htmlFor="relationship-type">
          Nazwa relacji
          <input
            id="relationship-type"
            type="text"
            autoFocus={isGraphCreation}
            value={crud.relationshipType}
            maxLength={128}
            aria-invalid={Boolean(crud.fieldErrors.relation_name)}
            aria-describedby={crud.fieldErrors.relation_name ? 'relationship-type-error' : undefined}
            onChange={(event) => crud.setRelationshipType(event.target.value)}
            placeholder="Np. Rodzeństwo, sojusz"
          />
        </label>
        {crud.fieldErrors.character_1_id?.[0] || crud.fieldErrors.character_2_id?.[0] ? (
          <p className="relationship-workspace__field-error" role="alert">
            {crud.fieldErrors.character_1_id?.[0] || crud.fieldErrors.character_2_id?.[0]}
          </p>
        ) : null}
        {crud.fieldErrors.relation_name ? (
          <p id="relationship-type-error" className="relationship-workspace__field-error">
            {crud.fieldErrors.relation_name[0]}
          </p>
        ) : null}
        {crud.formError ? <p className="relationship-workspace__field-error" role="alert">{crud.formError}</p> : null}
        <div className="relationship-workspace__form-actions relationship-workspace__form-actions--end">
          {isGraphCreation ? (
            <button
              type="button"
              className="relationship-workspace__secondary"
              disabled={crud.isSaving}
              onClick={onCancel}
            >
              Anuluj
            </button>
          ) : null}
          <button type="submit" className="relationship-workspace__primary" disabled={crud.isSaving}>
            {crud.isSaving ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>
      </form>
    </section>
  );
}
