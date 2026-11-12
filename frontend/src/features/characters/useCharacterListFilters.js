import { useMemo, useState } from 'react';

export const UNGROUPED_CHARACTER_KEY = '__ungrouped__';

const groupName = (character) => character.group_name?.trim() || '';
const groupKey = (character) => groupName(character) || UNGROUPED_CHARACTER_KEY;

const compareIds = (left, right) => {
  const leftId = Number(left.id);
  const rightId = Number(right.id);
  if (Number.isFinite(leftId) && Number.isFinite(rightId)) return leftId - rightId;
  return String(left.id).localeCompare(String(right.id), 'pl', { numeric: true });
};

const createdTimestamp = (character) => {
  const timestamp = Date.parse(character.created_at);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export default function useCharacterListFilters(characters) {
  const [query, setQuery] = useState('');
  const [isGrouped, setIsGrouped] = useState(true);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState([]);
  const [sortOrder, setSortOrder] = useState('oldest');

  const { availableGroups, hasUngroupedCharacters } = useMemo(() => {
    const groups = new Set();
    let hasUngrouped = false;

    characters.forEach((character) => {
      const name = groupName(character);
      if (name) groups.add(name);
      else hasUngrouped = true;
    });

    return {
      availableGroups: [...groups].sort((left, right) => left.localeCompare(right, 'pl', { sensitivity: 'base' })),
      hasUngroupedCharacters: hasUngrouped,
    };
  }, [characters]);

  const visibleCharacters = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL');
    const selectedGroups = new Set(selectedGroupKeys);
    const direction = sortOrder === 'newest' ? -1 : 1;

    return characters
      .filter((character) => {
        if (selectedGroups.size > 0 && !selectedGroups.has(groupKey(character))) return false;
        if (!normalizedQuery) return true;

        return [character.name, character.group_name, character.description]
          .some((value) => String(value || '').toLocaleLowerCase('pl-PL').includes(normalizedQuery));
      })
      .sort((left, right) => {
        const dateDifference = createdTimestamp(left) - createdTimestamp(right);
        return dateDifference !== 0 ? dateDifference * direction : compareIds(left, right) * direction;
      });
  }, [characters, query, selectedGroupKeys, sortOrder]);

  const groupedCharacters = useMemo(() => {
    if (!isGrouped) return [];

    const sections = new Map();
    visibleCharacters.forEach((character) => {
      const key = groupKey(character);
      if (!sections.has(key)) {
        sections.set(key, {
          key,
          label: key === UNGROUPED_CHARACTER_KEY ? 'Bez grupy' : groupName(character),
          characters: [],
        });
      }
      sections.get(key).characters.push(character);
    });

    return [...sections.values()].sort((left, right) => {
      if (left.key === UNGROUPED_CHARACTER_KEY) return 1;
      if (right.key === UNGROUPED_CHARACTER_KEY) return -1;
      return left.label.localeCompare(right.label, 'pl', { sensitivity: 'base' });
    });
  }, [isGrouped, visibleCharacters]);

  const toggleGroup = (key) => {
    setSelectedGroupKeys((current) => (
      current.includes(key)
        ? current.filter((selectedKey) => selectedKey !== key)
        : [...current, key]
    ));
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedGroupKeys([]);
    setIsGrouped(true);
    setSortOrder('oldest');
  };

  return {
    activeFilterCount: (selectedGroupKeys.length > 0 ? 1 : 0) + (isGrouped ? 0 : 1) + (sortOrder === 'newest' ? 1 : 0),
    availableGroups,
    clearFilters,
    groupedCharacters,
    hasUngroupedCharacters,
    isGrouped,
    query,
    selectedGroupKeys,
    setIsGrouped,
    setQuery,
    setSortOrder,
    sortOrder,
    toggleGroup,
    visibleCharacters,
  };
}
