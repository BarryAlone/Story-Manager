export default function WorldElementsToolbar({
  addButtonRef,
  attributesButtonRef,
  category,
  disabled,
  onCreate,
  onManageAttributes,
  onSearchChange,
  searchQuery,
}) {
  return (
    <header className="world-elements-toolbar">
      <div className="world-elements-toolbar__title">
        <h2 title={category.name}>{category.name}</h2>
        <span>{category.items_count} elementów</span>
      </div>
      <div className="world-elements-toolbar__actions">
        <label className="world-elements-toolbar__search">
          <SearchIcon />
          <span className="sr-only">Szukaj elementów świata</span>
          <input
            type="search"
            value={searchQuery}
            maxLength={128}
            placeholder="Szukaj po nazwie lub opisie…"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <button
          ref={attributesButtonRef}
          type="button"
          className="world-elements-toolbar__attributes"
          onClick={onManageAttributes}
          disabled={disabled}
        >
          Atrybuty kategorii
        </button>
        <button
          ref={addButtonRef}
          type="button"
          className="world-elements-toolbar__add"
          onClick={onCreate}
          disabled={disabled}
        >
          <span aria-hidden="true">+</span> Dodaj element
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
