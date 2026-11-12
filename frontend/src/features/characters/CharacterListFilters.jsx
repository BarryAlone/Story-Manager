import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { UNGROUPED_CHARACTER_KEY } from './useCharacterListFilters';

export default function CharacterListFilters({
  activeFilterCount,
  availableGroups,
  hasUngroupedCharacters,
  isGrouped,
  onClear,
  onGroupingChange,
  onQueryChange,
  onSortOrderChange,
  onToggleGroup,
  query,
  selectedGroupKeys,
  sortOrder,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const popoverId = useId();
  const hasResettableState = activeFilterCount > 0 || query.trim().length > 0;

  const closePopover = useCallback((restoreFocus = true) => {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
    }
  }, []);

  const positionPopover = useCallback(() => {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) return;

    const margin = 8;
    const gap = 6;
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - popoverRect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - popoverRect.height - margin);
    const openAbove = window.innerHeight - buttonRect.bottom < popoverRect.height + gap + margin
      && buttonRect.top >= popoverRect.height + gap + margin;
    const preferredTop = openAbove
      ? buttonRect.top - popoverRect.height - gap
      : buttonRect.bottom + gap;

    popover.style.left = `${Math.max(margin, Math.min(buttonRect.right - popoverRect.width, maxLeft))}px`;
    popover.style.top = `${Math.max(margin, Math.min(preferredTop, maxTop))}px`;
    popover.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    positionPopover();
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    };
  }, [isOpen, positionPopover]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOutside = (event) => {
      if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      closePopover(false);
    };
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closePopover();
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape, true);
    };
  }, [closePopover, isOpen]);

  return (
    <div className="character-list-controls">
      <label className="character-list-controls__search">
        <svg className="character-list-controls__search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <span className="sr-only">Szukaj postaci</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Szukaj po nazwie, grupie lub opisie"
        />
      </label>

      <button
        ref={buttonRef}
        type="button"
        className="character-list-controls__filter-button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? popoverId : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        Filtry
      </button>

      <button
        type="button"
        className="character-list-controls__reset-button"
        aria-label={hasResettableState
          ? `Wyczyść wyszukiwanie i filtry${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`
          : 'Brak aktywnego wyszukiwania i filtrów'}
        title={hasResettableState ? 'Wyczyść wyszukiwanie i filtry' : 'Brak aktywnych filtrów'}
        disabled={!hasResettableState}
        onClick={onClear}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20 11a8 8 0 1 0-2.34 5.66" />
          <path d="M20 4v7h-7" />
        </svg>
        {activeFilterCount > 0 && (
          <span className="character-list-controls__reset-count" aria-hidden="true">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          id={popoverId}
          className="character-filter-popover"
          role="dialog"
          aria-label="Filtry postaci"
          data-panel-portal
        >
          <label className="character-filter-popover__switch">
            <input
              type="checkbox"
              checked={isGrouped}
              onChange={(event) => onGroupingChange(event.target.checked)}
            />
            <span>Grupuj postacie</span>
          </label>

          <fieldset className="character-filter-popover__section">
            <legend>Grupy</legend>
            <div className="character-filter-popover__groups">
              {availableGroups.map((group) => (
                <label key={group} title={group}>
                  <input
                    type="checkbox"
                    checked={selectedGroupKeys.includes(group)}
                    onChange={() => onToggleGroup(group)}
                  />
                  <span>{group}</span>
                </label>
              ))}
              {hasUngroupedCharacters && (
                <label>
                  <input
                    type="checkbox"
                    checked={selectedGroupKeys.includes(UNGROUPED_CHARACTER_KEY)}
                    onChange={() => onToggleGroup(UNGROUPED_CHARACTER_KEY)}
                  />
                  <span>Bez grupy</span>
                </label>
              )}
              {availableGroups.length === 0 && !hasUngroupedCharacters && (
                <p>Brak grup do wyboru.</p>
              )}
            </div>
          </fieldset>

          <fieldset className="character-filter-popover__section">
            <legend>Kolejność</legend>
            <div className="character-filter-popover__order">
              <label>
                <input
                  type="radio"
                  name="character-sort-order"
                  value="oldest"
                  checked={sortOrder === 'oldest'}
                  onChange={() => onSortOrderChange('oldest')}
                />
                <span>Najstarsze</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="character-sort-order"
                  value="newest"
                  checked={sortOrder === 'newest'}
                  onChange={() => onSortOrderChange('newest')}
                />
                <span>Najnowsze</span>
              </label>
            </div>
          </fieldset>

        </div>,
        document.body,
      )}
    </div>
  );
}
