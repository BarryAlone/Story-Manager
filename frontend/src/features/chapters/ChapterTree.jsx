import { useEffect, useRef, useState } from 'react';

function ChapterMenu({ chapter, onClose, onDelete, onEdit, onMove, onSwap }) {
  const canReorder = Number(chapter.chapter_number) > 0;

  const runAction = (action) => {
    onClose();
    action();
  };

  return (
    <div className="chapter-tree__menu" role="menu" aria-label={`Akcje dla ${chapter.name}`}>
      {canReorder && (
        <>
          <button type="button" role="menuitem" onClick={() => runAction(() => onMove(chapter, 'up'))}>Przesuń wyżej</button>
          <button type="button" role="menuitem" onClick={() => runAction(() => onMove(chapter, 'down'))}>Przesuń niżej</button>
          <button type="button" role="menuitem" onClick={() => runAction(() => onSwap(chapter))}>Zamień z…</button>
        </>
      )}
      <button type="button" role="menuitem" onClick={() => runAction(() => onEdit(chapter))}>Edytuj dane</button>
      <button type="button" role="menuitem" className="chapter-tree__menu-delete" onClick={() => runAction(() => onDelete(chapter))}>Usuń</button>
    </div>
  );
}

function ChapterRow({
  activeId,
  chapter,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  isMenuOpen,
  menuRef,
  number,
  onDelete,
  onEdit,
  onMenuToggle,
  onMove,
  onSelect,
  onSwap,
  onToggle,
}) {
  const isActive = Number(activeId) === Number(chapter.id);

  return (
    <li className={`chapter-tree__item${isActive ? ' chapter-tree__item--active' : ''}`}>
      <div className={`chapter-tree__row chapter-tree__row--depth-${depth}`}>
        <span className="chapter-tree__drag-space" aria-hidden="true" />
        {hasChildren ? (
          <button
            type="button"
            className="chapter-tree__chevron"
            onClick={() => onToggle(chapter.id)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Zwiń ${chapter.name}` : `Rozwiń ${chapter.name}`}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="chapter-tree__chevron-spacer" aria-hidden="true" />
        )}

        <button
          type="button"
          className="chapter-tree__select"
          onClick={() => onSelect(chapter)}
          aria-current={isActive ? 'page' : undefined}
          title={chapter.name}
        >
          <span className="chapter-tree__number">{number || ''}</span>
          <span className="chapter-tree__name">{chapter.name}</span>
        </button>

        <div className="chapter-tree__menu-wrap" ref={isMenuOpen ? menuRef : undefined}>
          <button
            type="button"
            className="chapter-tree__menu-toggle"
            onClick={() => onMenuToggle(chapter.id)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label={`Otwórz menu dla ${chapter.name}`}
          >
            …
          </button>
          {isMenuOpen && (
            <ChapterMenu
              chapter={chapter}
              onClose={() => onMenuToggle(null)}
              onDelete={onDelete}
              onEdit={onEdit}
              onMove={onMove}
              onSwap={onSwap}
            />
          )}
        </div>
      </div>
    </li>
  );
}

export default function ChapterTree({
  activeId,
  expandedIds,
  isLoading,
  onCreate,
  onDelete,
  onEdit,
  onMove,
  onSelect,
  onSwap,
  onToggle,
  structure,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (openMenuId === null) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpenMenuId(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenuId]);

  const toggleMenu = (id) => {
    setOpenMenuId((current) => (Number(current) === Number(id) ? null : id));
  };

  const rowProps = {
    activeId,
    menuRef,
    onDelete,
    onEdit,
    onMenuToggle: toggleMenu,
    onMove,
    onSelect,
    onSwap,
    onToggle,
  };

  return (
    <nav className="chapter-tree" aria-label="Struktura rozdziałów">
      <div className="chapter-tree__heading">
        <div>
          <span className="chapter-tree__eyebrow">Struktura</span>
          <h1>Rozdziały</h1>
        </div>
        <button type="button" className="chapter-tree__add" onClick={onCreate} aria-label="Dodaj rozdział">+</button>
      </div>

      {isLoading ? (
        <p className="chapter-tree__state" role="status">Ładowanie struktury…</p>
      ) : (
        <>
          <section className="chapter-tree__section" aria-labelledby="manuscript-heading">
            <h2 id="manuscript-heading">Rękopis</h2>
            {structure.roots.length === 0 ? (
              <p className="chapter-tree__state">Brak rozdziałów w rękopisie.</p>
            ) : (
              <ul className="chapter-tree__list">
                {structure.roots.map((root) => {
                  const isExpanded = expandedIds.has(Number(root.chapter.id));

                  return (
                    <li key={root.chapter.id} className="chapter-tree__branch">
                      <ul className="chapter-tree__list">
                        <ChapterRow
                          {...rowProps}
                          chapter={root.chapter}
                          hasChildren={root.children.length > 0}
                          isExpanded={isExpanded}
                          isMenuOpen={Number(openMenuId) === Number(root.chapter.id)}
                          number={root.number}
                        />
                      </ul>
                      {isExpanded && root.children.length > 0 && (
                        <ul className="chapter-tree__list chapter-tree__children">
                          {root.children.map((child) => (
                            <ChapterRow
                              {...rowProps}
                              key={child.chapter.id}
                              chapter={child.chapter}
                              depth={1}
                              isMenuOpen={Number(openMenuId) === Number(child.chapter.id)}
                              number={child.number}
                            />
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="chapter-tree__section chapter-tree__section--drafts" aria-labelledby="drafts-heading">
            <h2 id="drafts-heading">Szkice</h2>
            {structure.drafts.length === 0 ? (
              <p className="chapter-tree__state">Brak szkiców.</p>
            ) : (
              <ul className="chapter-tree__list">
                {structure.drafts.map((chapter) => (
                  <ChapterRow
                    {...rowProps}
                    key={chapter.id}
                    chapter={chapter}
                    isMenuOpen={Number(openMenuId) === Number(chapter.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </nav>
  );
}
