import { Fragment, useEffect, useRef, useState } from 'react';
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/react';
import { isValidChapterDrop } from './chapterDragAndDrop';

function ChapterMenu({
  canAddSubchapter,
  chapter,
  onAddSubchapter,
  onClose,
  onDelete,
  onEdit,
}) {
  const runAction = (action) => {
    onClose();
    action();
  };

  return (
    <div className="chapter-tree__menu" role="menu" aria-label={`Akcje dla ${chapter.name}`}>
      {canAddSubchapter && (
        <button type="button" role="menuitem" onClick={() => runAction(() => onAddSubchapter(chapter))}>
          Dodaj podrozdział
        </button>
      )}
      <button type="button" role="menuitem" onClick={() => runAction(() => onEdit(chapter))}>Edytuj dane</button>
      <button type="button" role="menuitem" className="chapter-tree__menu-delete" onClick={() => runAction(() => onDelete(chapter))}>Usuń</button>
    </div>
  );
}

function ChapterDropLine({ activeChapter, beforeId, chapters, isInManuscript, parentId }) {
  const target = { beforeId, isInManuscript, kind: 'reorder', parentId };
  const isValid = isValidChapterDrop(activeChapter, target, chapters);
  const { isDropTarget, ref } = useDroppable({
    id: `chapter-line:${isInManuscript ? 'manuscript' : 'drafts'}:${parentId ?? 'root'}:${beforeId ?? 'end'}`,
    type: 'chapter-line',
    accept: 'chapter',
    data: target,
    disabled: !isValid,
    collisionPriority: 30,
  });

  return (
    <li
      ref={ref}
      className={`chapter-tree__drop-line${isValid ? ' chapter-tree__drop-line--valid' : ''}${isDropTarget ? ' chapter-tree__drop-line--over' : ''}`}
      aria-hidden="true"
    />
  );
}

function ChapterSection({ activeChapter, chapters, children, kind, label, labelledBy }) {
  const target = { kind };
  const isValid = isValidChapterDrop(activeChapter, target, chapters);
  const { isDropTarget, ref } = useDroppable({
    id: `chapter-section:${kind}`,
    type: 'chapter-section',
    accept: 'chapter',
    data: target,
    disabled: !isValid,
    collisionPriority: 10,
  });

  return (
    <section
      ref={ref}
      className={`chapter-tree__section chapter-tree__section--${kind}${activeChapter ? ' chapter-tree__section--drag-active' : ''}${isValid ? ' chapter-tree__section--drop-valid' : ''}${isDropTarget ? ' chapter-tree__section--drop-over' : ''}`}
      aria-labelledby={labelledBy}
      aria-label={label}
    >
      {children}
    </section>
  );
}

function ChapterRow({
  activeDragChapter,
  activeId,
  canAddSubchapter = false,
  chapter,
  chapters,
  depth = 0,
  hasChildren = false,
  isExpanded = false,
  isMenuOpen,
  isStructureUpdating,
  menuRef,
  number,
  onAddSubchapter,
  onDelete,
  onEdit,
  onMenuToggle,
  onSelect,
  onToggle,
}) {
  const isActive = Number(activeId) === Number(chapter.id);
  const {
    isDragging,
    ref: draggableRef,
  } = useDraggable({
    id: `chapter:${chapter.id}`,
    type: 'chapter',
    data: { chapterId: chapter.id },
    disabled: isStructureUpdating,
  });
  const parentTarget = { kind: 'parent', parentId: chapter.id };
  const isValidParent = canAddSubchapter
    && isValidChapterDrop(activeDragChapter, parentTarget, chapters);
  const {
    isDropTarget: isParentDropTarget,
    ref: parentDropRef,
  } = useDroppable({
    id: `chapter-parent:${chapter.id}`,
    type: 'chapter-parent',
    accept: 'chapter',
    data: parentTarget,
    disabled: !isValidParent,
    collisionPriority: 20,
  });

  return (
    <li
      ref={draggableRef}
      className={`chapter-tree__item${isActive ? ' chapter-tree__item--active' : ''}${isDragging ? ' chapter-tree__item--dragging' : ''}`}
      tabIndex={isStructureUpdating ? -1 : 0}
      aria-label={`Przenieś ${chapter.name}`}
      aria-disabled={isStructureUpdating || undefined}
    >
      <div
        ref={parentDropRef}
        className={`chapter-tree__row chapter-tree__row--depth-${depth}${isValidParent ? ' chapter-tree__row--drop-valid' : ''}${isParentDropTarget ? ' chapter-tree__row--drop-over' : ''}`}
      >
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

        <div
          role="button"
          tabIndex="0"
          className="chapter-tree__select"
          onClick={() => onSelect(chapter)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(chapter);
            }
          }}
          aria-current={isActive ? 'page' : undefined}
          aria-label={`${number ? `${number}. ` : ''}${chapter.name}`}
          title={chapter.name}
        >
          <span className="chapter-tree__number">{number || ''}</span>
          <span className="chapter-tree__name">{chapter.name}</span>
        </div>

        <div
          className="chapter-tree__menu-wrap"
          ref={isMenuOpen ? menuRef : undefined}
          onPointerDown={(event) => event.stopPropagation()}
        >
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
              canAddSubchapter={canAddSubchapter}
              chapter={chapter}
              onAddSubchapter={onAddSubchapter}
              onClose={() => onMenuToggle(null)}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function ChapterBranch({ branch, expandedIds, isInManuscript, isMenuOpen, ...rowProps }) {
  const isExpanded = expandedIds.has(Number(branch.chapter.id));

  return (
    <li className="chapter-tree__branch">
      <ul className="chapter-tree__list">
        <ChapterRow
          {...rowProps}
          chapter={branch.chapter}
          canAddSubchapter={isInManuscript}
          hasChildren={branch.children.length > 0}
          isExpanded={isExpanded}
          isMenuOpen={isMenuOpen(branch.chapter.id)}
          number={branch.number}
        />
      </ul>
      {isExpanded && branch.children.length > 0 && (
        <ul className="chapter-tree__list chapter-tree__children">
          {branch.children.map((child) => (
            <Fragment key={child.chapter.id}>
              <ChapterDropLine
                activeChapter={rowProps.activeDragChapter}
                beforeId={child.chapter.id}
                chapters={rowProps.chapters}
                isInManuscript={isInManuscript}
                parentId={Number(branch.chapter.id)}
              />
              <ChapterRow
                {...rowProps}
                chapter={child.chapter}
                depth={1}
                isMenuOpen={isMenuOpen(child.chapter.id)}
                number={child.number}
              />
            </Fragment>
          ))}
          <ChapterDropLine
            activeChapter={rowProps.activeDragChapter}
            beforeId={null}
            chapters={rowProps.chapters}
            isInManuscript={isInManuscript}
            parentId={Number(branch.chapter.id)}
          />
        </ul>
      )}
    </li>
  );
}

function ChapterBranches({ branches, isInManuscript, ...branchProps }) {
  return (
    <ul className="chapter-tree__list">
      {branches.map((branch) => (
        <Fragment key={branch.chapter.id}>
          <ChapterDropLine
            activeChapter={branchProps.activeDragChapter}
            beforeId={branch.chapter.id}
            chapters={branchProps.chapters}
            isInManuscript={isInManuscript}
            parentId={null}
          />
          <ChapterBranch {...branchProps} branch={branch} isInManuscript={isInManuscript} />
        </Fragment>
      ))}
      <ChapterDropLine
        activeChapter={branchProps.activeDragChapter}
        beforeId={null}
        chapters={branchProps.chapters}
        isInManuscript={isInManuscript}
        parentId={null}
      />
    </ul>
  );
}

export default function ChapterTree({
  activeId,
  chapters,
  expandedIds,
  isLoading,
  isStructureUpdating,
  onAddSubchapter,
  onCreate,
  onDelete,
  onDrop,
  onEdit,
  onSelect,
  onToggle,
  structure,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [activeDragChapter, setActiveDragChapter] = useState(null);
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
  const isMenuOpen = (id) => Number(openMenuId) === Number(id);
  const branchProps = {
    activeDragChapter,
    activeId,
    chapters,
    expandedIds,
    isMenuOpen,
    isStructureUpdating,
    menuRef,
    onAddSubchapter,
    onDelete,
    onEdit,
    onMenuToggle: toggleMenu,
    onSelect,
    onToggle,
  };

  const handleDragStart = ({ operation }) => {
    const chapter = chapters.find(
      (item) => Number(item.id) === Number(operation.source?.data.chapterId),
    );
    setOpenMenuId(null);
    setActiveDragChapter(chapter || null);
  };

  const handleDragEnd = ({ canceled, operation }) => {
    const sourceChapter = chapters.find(
      (item) => Number(item.id) === Number(operation.source?.data.chapterId),
    );
    const target = operation.target?.data;
    setActiveDragChapter(null);

    if (canceled || !sourceChapter || !isValidChapterDrop(sourceChapter, target, chapters)) return;
    onDrop(sourceChapter, target);
  };

  return (
    <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <nav className="chapter-tree" aria-label="Struktura rozdziałów">
        <div className="chapter-tree__heading">
          <h1>Rozdziały</h1>
          <button type="button" className="chapter-tree__add" onClick={onCreate} aria-label="Dodaj rozdział">+</button>
        </div>

        {isLoading ? (
          <p className="chapter-tree__state" role="status">Ładowanie struktury…</p>
        ) : (
          <>
            <ChapterSection activeChapter={activeDragChapter} chapters={chapters} kind="manuscript" label="Upuść szkic lub podrozdział jako rozdział główny.">
              {structure.roots.length === 0 && !activeDragChapter ? (
                <p className="chapter-tree__state">Brak rozdziałów w rękopisie.</p>
              ) : (
                <ChapterBranches {...branchProps} branches={structure.roots} isInManuscript />
              )}
            </ChapterSection>

            <ChapterSection activeChapter={activeDragChapter} chapters={chapters} kind="drafts" label="Upuść jako szkic" labelledBy="drafts-heading">
              <h2 id="drafts-heading">Szkice</h2>
              {structure.drafts.length === 0 && !activeDragChapter ? (
                <p className="chapter-tree__state">Brak szkiców.</p>
              ) : (
                <ChapterBranches {...branchProps} branches={structure.drafts} isInManuscript={false} />
              )}
            </ChapterSection>
          </>
        )}
        <DragOverlay className="chapter-tree__drag-overlay">
          {activeDragChapter ? (
            <div>
              <span aria-hidden="true">⠿</span>
              <strong>{activeDragChapter.name}</strong>
            </div>
          ) : null}
        </DragOverlay>
      </nav>
    </DragDropProvider>
  );
}
