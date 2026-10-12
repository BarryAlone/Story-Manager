import { graphEndpointId } from './relationshipGraphData';

export default function RelationshipListPanel({
  controller,
  crud,
  isReadOnly = false,
  onSelect,
  showHeading = true,
}) {
  const relationships = isReadOnly ? controller.sourceGraphData.links : crud.relationships;
  const listStatus = isReadOnly ? 'ready' : crud.listStatus;
  const getName = (id) => (
    isReadOnly
      ? controller.nodeById.get(id)?.name || `Nieznana postać (ID: ${id})`
      : crud.getCharacterName(id)
  );

  return (
    <section
      className="relationship-workspace__section relationship-workspace__relationship-list-panel"
      aria-labelledby={showHeading ? 'relationship-list-heading' : undefined}
      aria-label={showHeading ? undefined : 'Pełna lista relacji'}
    >
      {showHeading ? <h2 id="relationship-list-heading">Lista relacji</h2> : null}
      {isReadOnly ? (
        <p className="relationship-graph__readonly">Dane testowe — lista tylko do odczytu.</p>
      ) : null}
      {listStatus === 'loading' ? <p>Wczytywanie relacji…</p> : null}
      {listStatus === 'error' ? (
        <div role="alert">
          <p>{crud.listError}</p>
          <button type="button" className="relationship-workspace__secondary" onClick={crud.loadData}>
            Spróbuj ponownie
          </button>
        </div>
      ) : null}
      {listStatus === 'ready' && relationships.length === 0 ? (
        <p className="relationship-workspace__empty">Brak relacji w tym projekcie.</p>
      ) : null}
      {listStatus === 'ready' && relationships.length > 0 ? (
        <ul className="relationship-workspace__relationship-list">
          {relationships.map((relationship) => {
            const sourceId = isReadOnly
              ? graphEndpointId(relationship.source)
              : relationship.character_1_id;
            const targetId = isReadOnly
              ? graphEndpointId(relationship.target)
              : relationship.character_2_id;
            const label = isReadOnly
              ? relationship.label
              : relationship.relation_name || 'Powiązanie';
            return (
              <li key={relationship.id}>
                <button
                  type="button"
                  className={String(relationship.id) === String(controller.selectedLinkId)
                    ? 'relationship-workspace__relationship relationship-workspace__relationship--selected'
                    : 'relationship-workspace__relationship'}
                  onClick={() => onSelect(relationship)}
                >
                  <strong>{label}</strong>
                  <span>
                    {getName(sourceId)} ↔ {getName(targetId)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
