import { useCallback, useMemo, useState } from 'react';

export const DEFAULT_INSPIRATION_FILTERS = Object.freeze({
  dateFrom: '',
  dateTo: '',
  images: false,
  order: 'newest',
  text: false,
});

function localDayStart(value) {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
}

function nextLocalDayStart(value) {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day + 1).getTime();
}

function inspirationTimestamp(inspiration) {
  const timestamp = Date.parse(inspiration.created_at);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function searchableText(inspiration) {
  return [inspiration.title, inspiration.content, inspiration.source]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pl-PL');
}

export function filterInspirations(inspirations, searchQuery, filters) {
  const query = searchQuery.trim().toLocaleLowerCase('pl-PL');
  const fromTimestamp = localDayStart(filters.dateFrom);
  const toTimestamp = nextLocalDayStart(filters.dateTo);

  return inspirations
    .filter((inspiration) => !query || searchableText(inspiration).includes(query))
    .filter((inspiration) => {
      if (filters.images === filters.text) return true;
      if (filters.images) return Boolean(inspiration.image_path);
      if (filters.text) return !inspiration.image_path;
      return true;
    })
    .filter((inspiration) => {
      const createdAt = inspirationTimestamp(inspiration);
      if (fromTimestamp !== null && createdAt < fromTimestamp) return false;
      if (toTimestamp !== null && createdAt >= toTimestamp) return false;
      return true;
    })
    .sort((first, second) => {
      const difference = inspirationTimestamp(first) - inspirationTimestamp(second);
      if (difference !== 0) return filters.order === 'oldest' ? difference : -difference;
      return filters.order === 'oldest' ? first.id - second.id : second.id - first.id;
    });
}

export default function useInspirationFilters(inspirations) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_INSPIRATION_FILTERS }));

  const visibleInspirations = useMemo(
    () => filterInspirations(inspirations, searchQuery, filters),
    [filters, inspirations, searchQuery],
  );

  const activeFilterCount = Number(Boolean(searchQuery.trim()))
    + Number(filters.images || filters.text)
    + Number(Boolean(filters.dateFrom || filters.dateTo))
    + Number(filters.order !== 'newest');

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setFilters({ ...DEFAULT_INSPIRATION_FILTERS });
  }, []);

  return {
    activeFilterCount,
    applyFilters: setFilters,
    clearAll,
    filters,
    searchQuery,
    setSearchQuery,
    visibleInspirations,
  };
}
