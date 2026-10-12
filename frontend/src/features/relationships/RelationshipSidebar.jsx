import SelectionDetails from './SelectionDetails';

export default function RelationshipSidebar({ controller, projectId, children }) {
  const showsSelection = ['character', 'selecting-target', 'form', 'relationship']
    .includes(controller.panelMode);
  const panelTitle = {
    character: 'Szczegóły postaci',
    'selecting-target': 'Wybór postaci',
    form: 'Nowa relacja',
    relationship: 'Szczegóły relacji',
    list: 'Lista relacji',
  }[controller.panelMode] || 'Narzędzia relacji';

  return (
    <aside
      id="relationship-tools-panel"
      className={`relationship-workspace__sidebar relationship-workspace__sidebar--${controller.panelMode}`}
      aria-label="Narzędzia grafu i relacji"
      aria-hidden={!controller.isPanelOpen}
    >
      <div className="relationship-workspace__sidebar-heading">
        <strong>{panelTitle}</strong>
      </div>
      <div className="relationship-workspace__sidebar-content">
        {showsSelection ? <SelectionDetails controller={controller} projectId={projectId} /> : null}
        {typeof children === 'function' ? children(controller) : children}
      </div>
    </aside>
  );
}
