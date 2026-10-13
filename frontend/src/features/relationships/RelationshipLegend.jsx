export default function RelationshipLegend({ controller }) {
  const relationTypes = controller.availableRelationTypes;

  if (relationTypes.length === 0) {
    return <div className="relationship-graph__legend relationship-graph__legend--empty" aria-hidden="true" />;
  }

  return (
    <ul
      className={`relationship-graph__legend${controller.selectedRelationTypes.length > 0 ? ' relationship-graph__legend--filtered' : ''}`}
      aria-label="Filtr typów relacji"
    >
      {relationTypes.map((type) => (
        <li key={type.key} className="relationship-graph__legend-item">
          <button
            type="button"
            aria-pressed={controller.selectedRelationTypes.includes(type.key)}
            disabled={controller.isRelationshipFormActive}
            onClick={() => controller.toggleRelationType(type.key)}
          >
            <span className="relationship-graph__legend-color" style={{ backgroundColor: type.color }} aria-hidden="true" />
            {type.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
