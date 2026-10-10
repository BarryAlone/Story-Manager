import CharacterCombobox from './CharacterCombobox';
import { UNGROUPED_FILTER } from './relationshipConstants';

export default function GraphFilters({ controller, layoutPersistence }) {
  return (
    <section className="relationship-workspace__section relationship-workspace__controls" aria-labelledby="graph-controls-heading">
      <h2 id="graph-controls-heading">Widok grafu</h2>
      <CharacterCombobox
        id="graph-character-search"
        label="Znajdź postać"
        characters={controller.sourceGraphData.nodes}
        selectedId={controller.selectedNodeId ?? ''}
        query={controller.searchQuery}
        onQueryChange={controller.setSearchQuery}
        onSelect={(node) => {
          if (node) controller.selectNode(node, { resetFilters: true });
          else controller.clearSelection();
        }}
      />

      <fieldset className="relationship-graph__view-mode">
        <legend>Zakres grafu</legend>
        <label>
          <input
            type="radio"
            name="graph-view-mode"
            value="all"
            checked={controller.viewMode === 'all'}
            onChange={() => controller.setViewMode('all')}
          />
          Cały graf
        </label>
        <label>
          <input
            type="radio"
            name="graph-view-mode"
            value="neighbors"
            checked={controller.viewMode === 'neighbors'}
            onChange={controller.showNeighbors}
            disabled={!controller.selectedNode}
          />
          Wybrana postać i bezpośrednie relacje
        </label>
      </fieldset>

      <RelationTypeFilter controller={controller} />
      <CharacterGroupFilter controller={controller} />

      <button
        type="button"
        className="relationship-workspace__secondary"
        onClick={controller.clearFilters}
        disabled={!controller.hasActiveFilters}
      >
        Wyczyść filtry
      </button>
      <button
        type="button"
        className="relationship-workspace__secondary"
        onClick={layoutPersistence.resetLayout}
        disabled={!layoutPersistence.hasSavedLayout}
      >
        Resetuj układ
      </button>
    </section>
  );
}

export function RelationTypeFilter({ controller, compact = false }) {
  return (
    <label className={compact ? 'relationship-graph__expanded-filter' : 'relationship-graph__filter'}>
      <span>Typ relacji</span>
      <select
        value={controller.relationTypeFilter}
        onChange={(event) => controller.setRelationTypeFilter(event.target.value)}
      >
        <option value="">Wszystkie typy</option>
        {controller.relationTypes.map((type) => (
          <option key={type.key} value={type.key}>{type.label}</option>
        ))}
      </select>
    </label>
  );
}

export function CharacterGroupFilter({ controller, compact = false }) {
  if (controller.groups.length === 0 && !controller.hasUngroupedCharacters) return null;

  return (
    <label className={compact ? 'relationship-graph__expanded-filter' : 'relationship-graph__filter'}>
      <span>Grupa postaci</span>
      <select value={controller.groupFilter} onChange={(event) => controller.setGroupFilter(event.target.value)}>
        <option value="">Wszystkie grupy</option>
        {controller.groups.map((group) => <option key={group} value={group}>{group}</option>)}
        {controller.hasUngroupedCharacters ? <option value={UNGROUPED_FILTER}>Bez grupy</option> : null}
      </select>
    </label>
  );
}
