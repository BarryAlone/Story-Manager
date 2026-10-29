import { useState } from 'react';
import { useParams } from 'react-router-dom';

import InspirationCard from './InspirationCard';
import InspirationCreateDialog from './InspirationCreateDialog';
import InspirationFilters from './InspirationFilters';
import useMasonryLayout from './useMasonryLayout';
import useInspirationFilters from './useInspirationFilters';
import useProjectInspirations from './useProjectInspirations';
import './inspirations.css';

export default function InspirationsPage() {
  const { projectId } = useParams();
  const { createInspiration, deleteInspiration, isLoading, loadError, loadInspirations, inspirations, updateInspiration } = useProjectInspirations(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [activeInspirationId, setActiveInspirationId] = useState(null);
  const [activeMode, setActiveMode] = useState('collapsed');
  const masonryRef = useMasonryLayout();
  const {
    activeFilterCount,
    applyFilters,
    clearAll,
    filters,
    searchQuery,
    setSearchQuery,
    visibleInspirations,
  } = useInspirationFilters(inspirations);
  const activeInspiration = activeInspirationId === null
    ? null
    : inspirations.find((inspiration) => inspiration.id === activeInspirationId) || null;
  const visibleInspirationIds = new Set(visibleInspirations.map((inspiration) => inspiration.id));
  const renderedInspirations = activeInspiration && !visibleInspirationIds.has(activeInspiration.id)
    ? [...visibleInspirations, activeInspiration]
    : visibleInspirations;

  const changeCardMode = (inspirationId, mode) => {
    if (mode === 'collapsed') {
      setActiveInspirationId(null);
      setActiveMode('collapsed');
      return;
    }

    setActiveInspirationId(inspirationId);
    setActiveMode(mode);
  };

  const changeSearchQuery = (nextSearchQuery) => {
    setSearchQuery(nextSearchQuery);
  };

  const changeFilters = (field, value) => {
    const nextFilters = { ...filters, [field]: value };
    if (nextFilters.dateFrom && nextFilters.dateTo && nextFilters.dateTo < nextFilters.dateFrom) return;

    applyFilters(nextFilters);
  };

  return (
    <section className="inspirations-page">
      <header className="inspirations-toolbar">
        <div className="inspirations-toolbar__search">
          <SearchIcon />
          <input
            type="search"
            value={searchQuery}
            placeholder="Szukaj inspiracji..."
            aria-label="Szukaj inspiracji"
            onChange={(event) => changeSearchQuery(event.target.value)}
          />
        </div>
        <InspirationFilters
          activeFilterCount={activeFilterCount}
          filters={filters}
          onChange={changeFilters}
          onClear={clearAll}
        />
        <button type="button" className="inspirations-toolbar__add" onClick={() => setIsCreating(true)}>
          <span aria-hidden="true">+</span> Dodaj inspirację
        </button>
      </header>

      <div className="inspirations-page__content">
        {isLoading && <div className="inspirations-state" role="status">Ładowanie inspiracji…</div>}

        {!isLoading && loadError && (
          <div className="inspirations-state inspirations-state--error" role="alert">
            <strong>Nie udało się pobrać inspiracji.</strong>
            <span>{loadError}</span>
            <button type="button" onClick={loadInspirations}>Spróbuj ponownie</button>
          </div>
        )}

        {!isLoading && !loadError && inspirations.length === 0 && (
          <div className="inspirations-state">
            <strong>Jeszcze nie ma żadnych inspiracji.</strong>
            <span>Zapisz tytuł, krótką myśl, obraz albo wszystkie te elementy razem.</span>
            <button type="button" onClick={() => setIsCreating(true)}>Dodaj pierwszą inspirację</button>
          </div>
        )}

        {!isLoading && !loadError && inspirations.length > 0 && visibleInspirations.length === 0 && activeInspiration === null && (
          <div className="inspirations-state">
            <strong>Brak pasujących inspiracji.</strong>
            <span>Zmień wyszukiwanie lub wyczyść zastosowane filtry.</span>
            <button type="button" onClick={clearAll}>Wyczyść wyszukiwanie i filtry</button>
          </div>
        )}

        {!isLoading && !loadError && renderedInspirations.length > 0 && (
          <div ref={masonryRef} className="inspirations-masonry" aria-label="Inspiracje projektu">
            {renderedInspirations.map((inspiration) => (
              <div key={inspiration.id} className="inspirations-masonry__item" data-masonry-item data-inspiration-id={inspiration.id}>
                <InspirationCard
                  inspiration={inspiration}
                  isVisible={visibleInspirationIds.has(inspiration.id)}
                  mode={activeInspirationId === inspiration.id ? activeMode : 'collapsed'}
                  onDelete={deleteInspiration}
                  onUpdate={updateInspiration}
                  onModeChange={(mode) => changeCardMode(inspiration.id, mode)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreating && <InspirationCreateDialog onClose={() => setIsCreating(false)} onCreate={createInspiration} />}
    </section>
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
