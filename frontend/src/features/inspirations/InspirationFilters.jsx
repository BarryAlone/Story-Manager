export default function InspirationFilters({ activeFilterCount, filters, onChange, onClear }) {
  return (
    <div className="inspirations-filters" aria-label="Filtry inspiracji">
      <fieldset className="inspirations-filter-toggle">
        <legend>Zawartość inspiracji</legend>
        <button
          type="button"
          className={filters.images ? 'inspirations-filter-option inspirations-filter-option--active' : 'inspirations-filter-option'}
          aria-pressed={filters.images}
          onClick={() => onChange('images', !filters.images)}
        >
          <ImageIcon />
          Obraz
        </button>
        <button
          type="button"
          className={filters.text ? 'inspirations-filter-option inspirations-filter-option--active' : 'inspirations-filter-option'}
          aria-pressed={filters.text}
          onClick={() => onChange('text', !filters.text)}
        >
          <TextIcon />
          Tekst
        </button>
      </fieldset>

      <div className="inspirations-filter-dates" role="group" aria-label="Data utworzenia">
        <CalendarIcon />
        <label>
          <span>Od</span>
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(event) => onChange('dateFrom', event.target.value)}
          />
        </label>
        <span className="inspirations-filter-dates__separator" aria-hidden="true" />
        <label>
          <span>Do</span>
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(event) => onChange('dateTo', event.target.value)}
          />
        </label>
      </div>

      <fieldset className="inspirations-filter-toggle">
        <legend>Kolejność inspiracji</legend>
        <FilterOption
          checked={filters.order === 'newest'}
          name="inspirations-order-filter"
          value="newest"
          onChange={onChange}
        >
          <SortDescendingIcon />
          Najnowsze
        </FilterOption>
        <FilterOption
          checked={filters.order === 'oldest'}
          name="inspirations-order-filter"
          value="oldest"
          onChange={onChange}
        >
          <SortAscendingIcon />
          Najstarsze
        </FilterOption>
      </fieldset>

      <div className="inspirations-filter-reset">
        <button
          type="button"
          aria-label={activeFilterCount > 0
            ? `Wyczyść wszystkie filtry (${activeFilterCount})`
            : 'Brak aktywnych filtrów'}
          aria-describedby="inspirations-filter-reset-tooltip"
          disabled={activeFilterCount === 0}
          onClick={onClear}
        >
          <ResetIcon />
          {activeFilterCount > 0 && <span aria-hidden="true">{activeFilterCount}</span>}
        </button>
        <span id="inspirations-filter-reset-tooltip" role="tooltip">Wyczyść filtry</span>
      </div>
    </div>
  );
}

function FilterOption({ checked, children, name, onChange, value }) {
  return (
    <label className={checked ? 'inspirations-filter-option inspirations-filter-option--active' : 'inspirations-filter-option'}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={(event) => onChange('order', event.target.value)}
      />
      {children}
    </label>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="m5.5 17 4-4 3 3 2.5-2.5 3.5 3.5" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 6h14M5 10h14M5 14h10M5 18h12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="inspirations-filter-dates__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10h17" />
    </svg>
  );
}

function SortDescendingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6h10M4 11h7M4 16h4M17 5v14M14 16l3 3 3-3" />
    </svg>
  );
}

function SortAscendingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6h4M4 11h7M4 16h10M17 19V5M14 8l3-3 3 3" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68" />
      <path d="M4 4v4.68h4.68" />
    </svg>
  );
}
