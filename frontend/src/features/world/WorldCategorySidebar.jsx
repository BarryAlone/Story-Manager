import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function WorldCategorySidebar({
  activeCategoryId,
  categories,
  disabled,
  error,
  isLoading,
  onCreate,
  onDelete,
  onRename,
  onSelect,
}) {
  return (
    <aside className="world-category-sidebar" aria-label="Kategorie elementów świata">
      <header className="world-category-sidebar__header">
        <h1>Elementy świata</h1>
        <button type="button" aria-label="Dodaj kategorię" title="Dodaj kategorię" onClick={onCreate} disabled={disabled}>
          +
        </button>
      </header>

      {isLoading && <p className="world-category-sidebar__empty">Ładowanie kategorii…</p>}
      {!isLoading && error && <p className="world-category-sidebar__empty">Kategorie niedostępne</p>}
      {!isLoading && !error && categories.length > 0 ? (
        <ul className="world-category-sidebar__list">
          {categories.map((category) => {
            const isActive = Number(category.id) === Number(activeCategoryId);

            return (
              <li key={category.id} className={isActive ? 'world-category-row world-category-row--active' : 'world-category-row'}>
                <button
                  type="button"
                  className="world-category-row__select"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect(category.id)}
                  title={category.name}
                >
                  <span>{category.name}</span>
                  <small aria-label={`${category.items_count} elementów`}>{category.items_count}</small>
                </button>
                <CategoryMenu
                  category={category}
                  disabled={disabled}
                  onDelete={() => onDelete(category)}
                  onRename={() => onRename(category)}
                />
              </li>
            );
          })}
        </ul>
      ) : !isLoading && !error ? (
        <p className="world-category-sidebar__empty">Brak kategorii</p>
      ) : null}
    </aside>
  );
}

function CategoryMenu({ category, disabled, onDelete, onRename }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const positionMenu = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const margin = 8;
    const gap = 4;
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const openAbove = window.innerHeight - buttonRect.bottom < menuRect.height + gap + margin
      && buttonRect.top > menuRect.height + gap + margin;
    const preferredTop = openAbove
      ? buttonRect.top - menuRect.height - gap
      : buttonRect.bottom + gap;
    const maxTop = Math.max(margin, window.innerHeight - menuRect.height - margin);
    const maxLeft = Math.max(margin, window.innerWidth - menuRect.width - margin);

    menu.style.top = `${Math.max(margin, Math.min(preferredTop, maxTop))}px`;
    menu.style.left = `${Math.max(margin, Math.min(buttonRect.right - menuRect.width, maxLeft))}px`;
    menu.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    positionMenu();
    menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [isOpen, positionMenu]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOutside = (event) => {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, [isOpen]);

  const runAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="world-category-row__menu-button"
        aria-label={`Menu kategorii: ${category.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        …
      </button>
      {isOpen && createPortal(
        <div ref={menuRef} className="world-category-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => runAction(onRename)}>Zmień nazwę</button>
          <button type="button" role="menuitem" className="world-category-menu__delete" onClick={() => runAction(onDelete)}>Usuń</button>
        </div>,
        document.body,
      )}
    </>
  );
}
