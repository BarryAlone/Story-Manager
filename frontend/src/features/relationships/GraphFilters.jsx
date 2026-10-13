import { useId } from 'react';
import { UNGROUPED_FILTER } from './relationshipConstants';

export function GraphScopeToggle({ controller }) {
  const neighborhoodTooltipId = useId();

  return (
    <fieldset className="relationship-graph__scope-toggle">
      <legend>Zakres grafu</legend>
      <label className={controller.viewMode === 'all' ? 'relationship-graph__scope-option relationship-graph__scope-option--active' : 'relationship-graph__scope-option'}>
        <input
          type="radio"
          name="graph-view-mode"
          value="all"
          checked={controller.viewMode === 'all'}
          disabled={controller.isRelationshipFormActive}
          onChange={() => controller.setViewMode('all')}
        />
        Cały graf
      </label>
      <label
        className={controller.viewMode === 'neighbors' ? 'relationship-graph__scope-option relationship-graph__scope-option--active' : 'relationship-graph__scope-option'}
        aria-describedby={neighborhoodTooltipId}
      >
        <input
          type="radio"
          name="graph-view-mode"
          value="neighbors"
          checked={controller.viewMode === 'neighbors'}
          onChange={controller.showNeighbors}
          disabled={!controller.selectedNode || controller.isRelationshipFormActive}
        />
        Sąsiedztwo
        <span
          id={neighborhoodTooltipId}
          role="tooltip"
          className="relationship-graph__scope-tooltip"
        >
          Wybrana postać i jej bezpośrednie relacje
        </span>
      </label>
    </fieldset>
  );
}

export function CharacterGroupFilter({ controller }) {
  if (controller.groups.length === 0 && !controller.hasUngroupedCharacters) return null;

  return (
    <label className="relationship-graph__group-filter">
      <span>Grupa postaci</span>
      <select
        value={controller.groupFilter}
        disabled={controller.isRelationshipFormActive}
        onChange={(event) => controller.setGroupFilter(event.target.value)}
      >
        <option value="">Wszystkie grupy</option>
        {controller.groups.map((group) => <option key={group} value={group}>{group}</option>)}
        {controller.hasUngroupedCharacters ? <option value={UNGROUPED_FILTER}>Bez grupy</option> : null}
      </select>
    </label>
  );
}
