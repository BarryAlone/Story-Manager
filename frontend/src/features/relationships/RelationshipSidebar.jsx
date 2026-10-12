import SelectionDetails from './SelectionDetails';

export default function RelationshipSidebar({ controller, projectId, children }) {
  return (
    <aside
      id="relationship-tools-panel"
      className="relationship-workspace__sidebar"
      aria-label="Narzędzia grafu i relacji"
      aria-hidden={!controller.isPanelOpen}
    >
      <div className="relationship-workspace__sidebar-heading">
        <strong>Narzędzia relacji</strong>
      </div>
      <SelectionDetails controller={controller} projectId={projectId} />
      {typeof children === 'function' ? children(controller) : children}
    </aside>
  );
}
