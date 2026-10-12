export default function RelationshipLegend({ relationTypes }) {
  if (relationTypes.length === 0) {
    return <div className="relationship-graph__legend relationship-graph__legend--empty" aria-hidden="true" />;
  }

  return (
    <ul className="relationship-graph__legend" aria-label="Legenda widocznych typów relacji">
      {relationTypes.map((type) => (
        <li key={type.key} className="relationship-graph__legend-item">
          <span className="relationship-graph__legend-color" style={{ backgroundColor: type.color }} aria-hidden="true" />
          {type.label}
        </li>
      ))}
    </ul>
  );
}
