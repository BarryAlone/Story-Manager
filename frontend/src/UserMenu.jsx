import { useState } from 'react';
import useAuth from './useAuth';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError('');

    try {
      await logout();
    } catch (logoutError) {
      setError(logoutError.message);
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontWeight: '500' }}>{user?.name}</span>
      <div style={{ width: '40px', height: '40px', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
        {initial}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        title={error || undefined}
        style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '7px', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}
      </button>
    </div>
  );
}
