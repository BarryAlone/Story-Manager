import CharacterCombobox from './CharacterCombobox';
import {
  CharacterGroupFilter,
  GraphScopeToggle,
  RelationTypeFilter,
} from './GraphFilters';
import RelationshipIconButton, {
  CollapseIcon,
  ExpandIcon,
  PanelChevronIcon,
} from './RelationshipIconButton';
import { DEV_SCENARIOS } from './relationshipConstants';

export default function RelationshipToolbar({ controller, scenarioKey, onScenarioChange }) {
  return (
    <div className="relationship-graph__toolbar">
      <div className="relationship-graph__toolbar-main">
        <RelationshipIconButton
          className="relationship-graph__panel-toggle"
          label={controller.isPanelOpen ? 'Schowaj panel narzędzi' : 'Pokaż panel narzędzi'}
          aria-expanded={controller.isPanelOpen}
          aria-controls="relationship-tools-panel"
          onClick={controller.togglePanel}
        >
          <PanelChevronIcon direction={controller.isPanelOpen ? 'left' : 'right'} />
        </RelationshipIconButton>

        <p className="relationship-graph__stats" aria-live="polite">
          {controller.visibleGraphData.nodes.length} postaci · {controller.visibleGraphData.links.length} relacji
          {scenarioKey ? ' · Dane testowe' : ''}
        </p>

        <div className="relationship-graph__toolbar-search">
          <CharacterCombobox
            id="graph-character-search"
            label="Znajdź postać"
            characters={controller.sourceGraphData.nodes}
            selectedId={controller.selectedNodeId ?? ''}
            query={controller.searchQuery}
            onQueryChange={controller.setSearchQuery}
            onSelect={(node) => {
              if (node) controller.showNode(node, { resetFilters: true });
              else controller.clearSelection();
            }}
          />
        </div>

        <GraphScopeToggle controller={controller} />
        <RelationTypeFilter controller={controller} />
        <CharacterGroupFilter controller={controller} />

        <button
          type="button"
          className="relationship-workspace__secondary relationship-graph__clear-filters"
          onClick={controller.clearFilters}
          disabled={!controller.hasActiveFilters}
        >
          Wyczyść filtry
        </button>

        {import.meta.env.DEV ? (
          <label className="relationship-graph__scenario-control">
            <span>Scenariusz</span>
            <select value={scenarioKey} onChange={onScenarioChange}>
              <option value="">Dane API</option>
              {DEV_SCENARIOS.map((scenario) => (
                <option key={scenario.key} value={scenario.key}>{scenario.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        <RelationshipIconButton
          className="relationship-graph__expand-toggle"
          label={controller.isExpanded ? 'Przywróć zwykły widok' : 'Rozszerz graf'}
          aria-pressed={controller.isExpanded}
          onClick={() => controller.setIsExpanded((expanded) => !expanded)}
        >
          {controller.isExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </RelationshipIconButton>
      </div>

      <p className="relationship-graph__hover-info" aria-live="polite">
        {controller.hoveredLink && controller.hoveredLinkSource && controller.hoveredLinkTarget
          ? `${controller.hoveredLinkSource.name} — ${controller.hoveredLink.label} — ${controller.hoveredLinkTarget.name}`
          : '\u00a0'}
      </p>
    </div>
  );
}
