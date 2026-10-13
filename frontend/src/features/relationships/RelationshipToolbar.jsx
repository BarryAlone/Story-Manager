import { useId } from 'react';
import CharacterCombobox from './CharacterCombobox';
import { CharacterGroupFilter, GraphScopeToggle } from './GraphFilters';
import RelationshipIconButton, {
  CollapseIcon,
  ExpandIcon,
  ResetLayoutIcon,
} from './RelationshipIconButton';
import { DEV_SCENARIOS } from './relationshipConstants';

export default function RelationshipToolbar({ controller, scenarioKey, onScenarioChange }) {
  return (
    <div className="relationship-graph__toolbar">
      <div className="relationship-graph__toolbar-main">
        <div className="relationship-graph__toolbar-left">
          <div className="relationship-graph__toolbar-search">
            <CharacterCombobox
              id="graph-character-search"
              label="Znajdź postać"
              characters={controller.sourceGraphData.nodes}
              selectedId={controller.selectedNodeId ?? ''}
              query={controller.searchQuery}
              disabled={controller.isRelationshipFormActive}
              onQueryChange={controller.setSearchQuery}
              onSelect={(node) => {
                if (node) controller.showNode(node, { resetFilters: true });
                else controller.setSearchQuery('');
              }}
            />
          </div>

          <GraphScopeToggle controller={controller} />
          <CharacterGroupFilter controller={controller} />
          <FilterResetButton controller={controller} />
        </div>

        <div className="relationship-graph__toolbar-right">
          <div className="relationship-graph__stats" aria-live="polite">
            <span className="relationship-graph__character-count">
              {controller.visibleGraphData.nodes.length} postaci
            </span>
            <RelationshipCount controller={controller} />
            {scenarioKey ? <span className="relationship-graph__test-badge">Dane testowe</span> : null}
          </div>

          {import.meta.env.DEV ? (
            <label className="relationship-graph__scenario-control">
              <span>Scenariusz</span>
              <select
                value={scenarioKey}
                disabled={controller.isRelationshipFormActive}
                onChange={onScenarioChange}
              >
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
      </div>

      <p className="relationship-graph__hover-info" aria-live="polite">
        {controller.hoveredLink && controller.hoveredLinkSource && controller.hoveredLinkTarget
          ? `${controller.hoveredLinkSource.name} — ${controller.hoveredLink.label} — ${controller.hoveredLinkTarget.name}`
          : '\u00a0'}
      </p>
    </div>
  );
}

function FilterResetButton({ controller }) {
  const label = controller.hasActiveFilters
    ? `Wyczyść wszystkie filtry (${controller.activeFilterCount})`
    : 'Brak aktywnych filtrów';
  return (
    <RelationshipIconButton
      className="relationship-graph__filter-reset"
      label={label}
      disabled={!controller.hasActiveFilters || controller.isRelationshipFormActive}
      onClick={controller.clearFilters}
    >
      <ResetLayoutIcon />
      {controller.activeFilterCount > 0 ? (
        <span className="relationship-graph__filter-count" aria-hidden="true">
          {controller.activeFilterCount}
        </span>
      ) : null}
    </RelationshipIconButton>
  );
}

function RelationshipCount({ controller }) {
  const tooltipId = useId();
  const isDisabled = controller.isRelationshipFormActive;
  const count = controller.visibleGraphData.links.length;
  const label = count === 1 ? '1 relacja' : `${count} relacji`;
  const tooltip = isDisabled
    ? 'Najpierw zapisz albo anuluj formularz relacji.'
    : 'Pokaż listę relacji';

  return (
    <span className="relationship-graph__relationship-count">
      <button
        type="button"
        disabled={isDisabled}
        aria-describedby={tooltipId}
        onClick={controller.showRelationshipList}
      >
        <RelationshipListIcon />
        {label}
      </button>
      <span id={tooltipId} role="tooltip" className="relationship-graph__relationship-count-tooltip">
        {tooltip}
      </span>
    </span>
  );
}

function RelationshipListIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
    </svg>
  );
}
