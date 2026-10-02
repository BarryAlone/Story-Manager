export default function RelationshipListPanel({ crud, onSelect }) {
  return (
    <section className="relationship-workspace__section" aria-labelledby="relationship-list-heading">
      <h2 id="relationship-list-heading">Lista relacji</h2>
      {crud.listStatus === 'loading' ? <p>Wczytywanie relacji…</p> : null}
      {crud.listStatus === 'error' ? (
        <div role="alert">
          <p>{crud.listError}</p>
          <button type="button" className="relationship-workspace__secondary" onClick={crud.loadData}>
            Spróbuj ponownie
          </button>
        </div>
      ) : null}
      {crud.listStatus === 'ready' && crud.relationships.length === 0 ? (
        <p className="relationship-workspace__empty">Brak relacji w tym projekcie.</p>
      ) : null}
      {crud.listStatus === 'ready' && crud.relationships.length > 0 ? (
        <ul className="relationship-workspace__relationship-list">
          {crud.relationships.map((relationship) => (
            <li key={relationship.id}>
              <button
                type="button"
                className={String(relationship.id) === String(crud.editingRelationshipId)
                  ? 'relationship-workspace__relationship relationship-workspace__relationship--selected'
                  : 'relationship-workspace__relationship'}
                onClick={() => onSelect(relationship)}
              >
                <strong>{relationship.relation_name || 'Powązanie'}</strong>
                <span>
                  {crud.getCharacterName(relationship.character_1_id)} ↔ {crud.getCharacterName(relationship.character_2_id)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
