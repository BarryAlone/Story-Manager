import RelationshipIconButton, { PanelChevronIcon } from './RelationshipIconButton';

export default function RelationshipSidebar({ controller, children }) {
  const panelTitle = {
    character: 'Szczegóły postaci',
    'selecting-target': 'Wybór postaci',
    form: 'Nowa relacja',
    relationship: 'Szczegóły relacji',
    list: 'Lista relacji',
  }[controller.panelMode] || 'Narzędzia relacji';

  return (
    <div className="relationship-workspace__panel-layer">
      <RelationshipIconButton
        className="relationship-workspace__panel-toggle"
        label={controller.isPanelOpen ? 'Ukryj panel relacji' : 'Pokaż panel relacji'}
        aria-expanded={controller.isPanelOpen}
        aria-controls="relationship-tools-panel"
        disabled={controller.isRelationshipEditDirty}
        onClick={controller.togglePanel}
      >
        <PanelChevronIcon direction={controller.isPanelOpen ? 'right' : 'left'} />
      </RelationshipIconButton>

      <aside
        id="relationship-tools-panel"
        className={`relationship-workspace__sidebar relationship-workspace__sidebar--${controller.panelMode}`}
        aria-label="Narzędzia grafu i relacji"
        aria-hidden={!controller.isPanelOpen}
        inert={!controller.isPanelOpen ? '' : undefined}
      >
        <div className="relationship-workspace__sidebar-heading">
          <strong>{panelTitle}</strong>
        </div>
        <div className="relationship-workspace__sidebar-content">
          {typeof children === 'function' ? children(controller) : children}
        </div>
      </aside>
    </div>
  );
}
