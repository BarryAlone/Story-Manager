import { useEffect, useId, useRef, useState } from 'react';
import useAuth from './useAuth';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const menuId = useId();
  const menuContainerRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = event => {
      if (!menuContainerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        avatarButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError('');

    try {
      await logout();
      setIsOpen(false);
    } catch (logoutError) {
      setError(logoutError.message);
      setIsLoggingOut(false);
    }
  };

  return (
    <div ref={menuContainerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        ref={avatarButtonRef}
        type="button"
        onClick={() => {
          setIsOpen(previous => !previous);
          setError('');
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={isOpen ? 'Zamknij menu użytkownika' : 'Otwórz menu użytkownika'}
        style={{ width: '40px', height: '40px', padding: 0, border: '1px solid #d1d5db', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {initial}
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Menu użytkownika"
          style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 1000, width: 'min(280px, calc(100vw - 32px))', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '10px', backgroundColor: '#fff', boxShadow: '0 12px 30px rgba(17, 24, 39, 0.16)' }}
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              avatarButtonRef.current?.focus();
            }}
            aria-label="Zamknij menu użytkownika"
            title="Zamknij (Escape)"
            style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', padding: 0, border: 0, borderRadius: '6px', backgroundColor: 'transparent', color: '#6b7280', fontSize: '1.25rem', lineHeight: 1, cursor: 'pointer' }}
          >
            ×
          </button>

          <div style={{ marginBottom: '14px', paddingRight: '24px', overflowWrap: 'anywhere' }}>
            <div style={{ fontWeight: 600, color: '#111827' }}>{user?.name}</div>
            <div style={{ marginTop: '3px', fontSize: '0.875rem', color: '#6b7280' }}>{user?.email}</div>
          </div>

          {error && <div role="alert" style={{ marginBottom: '10px', fontSize: '0.875rem', color: '#b91c1c' }}>{error}</div>}

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', backgroundColor: '#fff', color: '#374151', cursor: isLoggingOut ? 'wait' : 'pointer', textAlign: 'left' }}
          >
            {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}
          </button>
        </div>
      )}
    </div>
  );
}
