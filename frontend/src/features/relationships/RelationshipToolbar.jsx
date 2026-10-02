import CharacterCombobox from './CharacterCombobox';
import { CharacterGroupFilter, RelationTypeFilter } from './GraphFilters';
import { DEV_SCENARIOS } from './relationshipConstants';

export default function RelationshipToolbar({ controller, scenarioKey, onScenarioChange }) {
  return (
    <div className="relationship-graph__toolbar">
      <button
        type="button"
        className="relationship-workspace__panel-toggle"
        onClick={controller.togglePanel}
        aria-expanded={controller.isPanelOpen}
        aria-label={controller.isPanelOpen ? 'Zwiń panel narzędzi' : 'Rozwiń panel narzędzi'}
      >
        {controller.isPanelOpen ? '‹ Panel' : '☰ Panel'}
      </button>
      <p className="relationship-graph__stats" aria-live="polite">
        {controller.visibleGraphData.nodes.length} postaci · {controller.visibleGraphData.links.length} relacji
        {scenarioKey ? ' · Dane testowe' : ''}
      </p>

      {controller.isExpanded ? <ExpandedControls controller={controller} /> : null}

      <p className="relationship-graph__hover-info" aria-live="polite">
        {controller.hoveredLink && controller.hoveredLinkSource && controller.hoveredLinkTarget
          ? `${controller.hoveredLinkSource.name} — ${controller.hoveredLink.label} — ${controller.hoveredLinkTarget.name}`
          : '\u00a0'}
      </p>
      {import.meta.env.DEV ? (
        <label className="relationship-graph__scenario-control">
          Scenariusz
          <select value={scenarioKey} onChange={onScenarioChange}>
            <option value="">Dane API</option>
            {DEV_SCENARIOS.map((scenario) => (
              <option key={scenario.key} value={scenario.key}>{scenario.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        className="relationship-workspace__expand"
        onClick={() => controller.setIsExpanded((expanded) => !expanded)}
      >
        {controller.isExpanded ? 'Zamknij widok' : 'Rozszerz graf'}
      </button>
    </div>
  );
}

function ExpandedControls({ controller }) {
  return (
    <>
      <div className="relationship-graph__expanded-search">
        <CharacterCombobox
          id="graph-character-search-expanded"
          label="Znajdź postać w rozszerzonym grafie"
          characters={controller.sourceGraphData.nodes}
          selectedId={controller.selectedNodeId ?? ''}
          query={controller.searchQuery}
          onQueryChange={controller.setSearchQuery}
          onSelect={(node) => {
            if (node) controller.selectNode(node, { resetFilters: true });
            else controller.clearSelection();
          }}
        />
      </div>
      <RelationTypeFilter controller={controller} compact />
      <CharacterGroupFilter controller={controller} compact />
    </>
  );
}
