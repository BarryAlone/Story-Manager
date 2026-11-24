import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function NoteActionsMenu({ disabled, note, onDelete, onTogglePin }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  const positionMenu = useCallback(() => {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) return;

    const margin = 8;
    const gap = 5;
    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const openAbove = window.innerHeight - buttonRect.bottom < popoverRect.height + gap + margin
      && buttonRect.top >= popoverRect.height + gap + margin;
    const preferredTop = openAbove
      ? buttonRect.top - popoverRect.height - gap
      : buttonRect.bottom + gap;

    popover.style.top = `${Math.max(margin, Math.min(preferredTop, window.innerHeight - popoverRect.height - margin))}px`;
    popover.style.left = `${Math.max(margin, Math.min(buttonRect.right - popoverRect.width, window.innerWidth - popoverRect.width - margin))}px`;
    popover.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    positionMenu();
    popoverRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
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
      if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      buttonRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape, true);
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
        className="project-note-menu-button"
        aria-label={`Menu notatki: ${note.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        …
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="project-note-menu-popover"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={() => runAction(onTogglePin)}>
            {note.is_pinned ? 'Odepnij' : 'Przypnij'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="project-note-menu-popover__delete"
            onClick={() => runAction(onDelete)}
          >
            Usuń
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
