import { useEffect, useState } from 'react';
import AuthContext from './AuthContext';
import { apiFetch, initializeCsrf, setUnauthorizedHandler } from './api';

let initialSessionRequest = null;

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function restoreInitialSession() {
  if (!initialSessionRequest) {
    initialSessionRequest = apiFetch('/api/user').then(async response => {
      if (!response.ok) return null;

      return response.json();
    });
  }

  return initialSessionRequest;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setUnauthorizedHandler(() => {
      if (isActive) setUser(null);
    });

    async function restoreSession() {
      try {
        const currentUser = await restoreInitialSession();

        if (isActive) {
          setUser(currentUser);
        }
      } catch {
        if (isActive) setUser(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isActive = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  async function login(credentials) {
    await initializeCsrf();

    const response = await apiFetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      return {
        ok: false,
        errors: payload?.errors || {},
        message: payload?.message || 'Nie udało się zalogować.',
      };
    }

    setUser(payload);

    return { ok: true };
  }

  async function logout() {
    await initializeCsrf();

    const response = await apiFetch('/logout', { method: 'POST' });

    if (!response.ok) {
      throw new Error('Nie udało się wylogować. Spróbuj ponownie.');
    }

    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
