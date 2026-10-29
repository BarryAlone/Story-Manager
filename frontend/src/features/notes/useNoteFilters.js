import { useCallback, useMemo, useState } from 'react';

export const DEFAULT_NOTE_FILTERS = Object.freeze({
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

function noteTimestamp(note) {
  const timestamp = Date.parse(note.created_at);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function searchableText(note) {
  return [note.title, note.content, note.source]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('pl-PL');
}

export function filterNotes(notes, searchQuery, filters) {
  const query = searchQuery.trim().toLocaleLowerCase('pl-PL');
  const fromTimestamp = localDayStart(filters.dateFrom);
  const toTimestamp = nextLocalDayStart(filters.dateTo);

  return notes
    .filter((note) => !query || searchableText(note).includes(query))
    .filter((note) => {
      if (filters.images === filters.text) return true;
      if (filters.images) return Boolean(note.image_path);
      if (filters.text) return !note.image_path;
      return true;
    })
    .filter((note) => {
      const createdAt = noteTimestamp(note);
      if (fromTimestamp !== null && createdAt < fromTimestamp) return false;
      if (toTimestamp !== null && createdAt >= toTimestamp) return false;
      return true;
    })
    .sort((first, second) => {
      const difference = noteTimestamp(first) - noteTimestamp(second);
      if (difference !== 0) return filters.order === 'oldest' ? difference : -difference;
      return filters.order === 'oldest' ? first.id - second.id : second.id - first.id;
    });
}

export default function useNoteFilters(notes) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_NOTE_FILTERS }));

  const visibleNotes = useMemo(
    () => filterNotes(notes, searchQuery, filters),
    [filters, notes, searchQuery],
  );

  const activeFilterCount = Number(Boolean(searchQuery.trim()))
    + Number(filters.images || filters.text)
    + Number(Boolean(filters.dateFrom || filters.dateTo))
    + Number(filters.order !== 'newest');

  const clearAll = useCallback(() => {
    setSearchQuery('');
    setFilters({ ...DEFAULT_NOTE_FILTERS });
  }, []);

  return {
    activeFilterCount,
    applyFilters: setFilters,
    clearAll,
    filters,
    searchQuery,
    setSearchQuery,
    visibleNotes,
  };
}
