import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function AttributeDefinitionMenu({
  buttonRef: reportButtonRef,
  definitionName,
  disabled,
  onDelete,
  onEdit,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const setTriggerRef = useCallback((node) => {
    triggerRef.current = node;
    reportButtonRef?.(node);
  }, [reportButtonRef]);

  const positionMenu = useCallback(() => {
    const button = triggerRef.current;
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
    if (!isOpen || disabled) return undefined;

    positionMenu();
    menuRef.current?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [disabled, isOpen, positionMenu]);

  useEffect(() => {
    if (!isOpen || disabled) return undefined;

    const closeOutside = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeWithEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeWithEscape, true);
    };
  }, [disabled, isOpen]);

  const runAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={setTriggerRef}
        type="button"
        className="attribute-definition-list__menu-button"
        aria-label={`Menu atrybutu: ${definitionName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        …
      </button>
      {isOpen && !disabled && createPortal(
        <div ref={menuRef} className="attribute-definition-menu" role="menu" data-world-panel-portal>
          <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>Edytuj</button>
          <button type="button" role="menuitem" className="attribute-definition-menu__delete" onClick={() => runAction(onDelete)}>
            Usuń
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
