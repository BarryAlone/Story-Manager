import GraphFilters from './GraphFilters';
import SelectionDetails from './SelectionDetails';

export default function RelationshipSidebar({ controller, layoutPersistence, projectId, children }) {
  return (
    <aside className="relationship-workspace__sidebar" aria-label="Narzędzia grafu i relacji">
      <div className="relationship-workspace__sidebar-heading">
        <strong>Narzędzia relacji</strong>
        <button type="button" onClick={controller.closePanel} aria-label="Zwiń panel narzędzi">×</button>
      </div>
      <GraphFilters controller={controller} layoutPersistence={layoutPersistence} />
      <SelectionDetails controller={controller} projectId={projectId} />
      {children}
    </aside>
  );
}
