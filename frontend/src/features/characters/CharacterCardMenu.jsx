import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function CharacterCardMenu({ characterName, onDelete, onEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const positionMenu = useCallback(() => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;

    const margin = 8;
    const gap = 5;
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const openAbove = spaceBelow < menuRect.height + gap + margin
      && buttonRect.top >= menuRect.height + gap + margin;
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
    const trigger = buttonRef.current;
    setIsOpen(false);
    action(trigger);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="character-card__menu-button"
        aria-label={`Menu postaci: ${characterName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
      >
        …
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="character-card__menu-popover"
          role="menu"
          data-panel-portal
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>Edytuj</button>
          <button
            type="button"
            role="menuitem"
            className="character-card__menu-delete"
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
