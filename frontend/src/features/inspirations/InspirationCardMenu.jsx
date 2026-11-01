import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function InspirationCardMenu({ disabled, inspirationTitle, mode, onDelete, onEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
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
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    const openAbove = spaceBelow < popoverRect.height + gap + margin
      && spaceAbove >= popoverRect.height + gap + margin;
    const preferredTop = openAbove
      ? buttonRect.top - popoverRect.height - gap
      : buttonRect.bottom + gap;
    const maxTop = Math.max(margin, window.innerHeight - popoverRect.height - margin);
    const preferredLeft = buttonRect.right - popoverRect.width;
    const maxLeft = Math.max(margin, window.innerWidth - popoverRect.width - margin);

    popover.style.top = `${Math.max(margin, Math.min(preferredTop, maxTop))}px`;
    popover.style.left = `${Math.max(margin, Math.min(preferredLeft, maxLeft))}px`;
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
      if (menuRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      event.stopImmediatePropagation();
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
    <div className="inspiration-card__menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Menu inspiracji${inspirationTitle ? `: ${inspirationTitle}` : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
      >
        …
      </button>
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="inspiration-card__menu-popover"
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          {mode !== 'edit' && (
            <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>Edytuj</button>
          )}
          <button
            type="button"
            role="menuitem"
            className="inspiration-card__menu-delete"
            onClick={() => runAction(onDelete)}
          >
            Usuń
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
