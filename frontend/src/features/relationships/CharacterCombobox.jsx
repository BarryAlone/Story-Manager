import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';

const MAX_OPTIONS = 200;

function characterName(character) {
  return String(character?.name || 'Postać bez nazwy');
}

function characterGroup(character) {
  return String(character?.groupName ?? character?.group_name ?? '').trim();
}

const CharacterCombobox = forwardRef(function CharacterCombobox({
  id,
  label,
  characters,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  excludedId = '',
  placeholder = 'Wpisz nazwę postaci',
  error = '',
  disabled = false,
}, forwardedRef) {
  const generatedId = useId();
  const inputId = id || `character-combobox-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef(null);
  const localInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const setInputRef = (element) => {
    localInputRef.current = element;
    if (typeof forwardedRef === 'function') forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  };

  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL');
    const excludedValue = String(excludedId || '');
    return characters
      .filter((character) => String(character.id) !== excludedValue)
      .filter((character) => (
        !normalizedQuery
        || characterName(character).toLocaleLowerCase('pl-PL').includes(normalizedQuery)
      ))
      .slice(0, MAX_OPTIONS);
  }, [characters, excludedId, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const chooseCharacter = (character) => {
    onSelect(character);
    onQueryChange(characterName(character));
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const clear = () => {
    onSelect(null);
    onQueryChange('');
    setIsOpen(false);
    setActiveIndex(-1);
    localInputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault();
      chooseCharacter(options[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'Tab') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className="character-combobox">
      <label htmlFor={inputId}>{label}</label>
      <div className="character-combobox__field">
        <input
          ref={setInputRef}
          id={inputId}
          type="text"
          role="combobox"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          onChange={(event) => {
            if (selectedId) onSelect(null);
            onQueryChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        {!disabled && (query || selectedId) ? (
          <button type="button" onClick={clear} aria-label={`Wyczyść pole: ${label}`}>×</button>
        ) : null}
      </div>

      {isOpen ? (
        <ul id={listboxId} role="listbox" className="character-combobox__options">
          {options.length > 0 ? options.map((character, index) => {
            const group = characterGroup(character);
            const isSelected = String(character.id) === String(selectedId || '');
            return (
              <li key={character.id} role="none" className={activeIndex === index ? 'character-combobox__option--active' : ''}>
                <button
                  id={`${inputId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseCharacter(character)}
                >
                  <span>{characterName(character)}</span>
                  <small>{group ? `${group} · ID ${character.id}` : `ID ${character.id}`}</small>
                </button>
              </li>
            );
          }) : <li className="character-combobox__empty">Brak pasujących postaci.</li>}
        </ul>
      ) : null}
      {error ? <p id={`${inputId}-error`} className="relationship-workspace__field-error">{error}</p> : null}
    </div>
  );
});

export default CharacterCombobox;
