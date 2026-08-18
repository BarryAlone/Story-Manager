const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

let unauthorizedHandler = null;

export function backendUrl(path) {
  return `${API_URL}${path}`;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function getXsrfToken() {
  const tokenCookie = document.cookie
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith('XSRF-TOKEN='));

  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.substring('XSRF-TOKEN='.length));
}

export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  headers.set('Accept', 'application/json');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const xsrfToken = getXsrfToken();

    if (xsrfToken) {
      headers.set('X-XSRF-TOKEN', xsrfToken);
    }
  }

  const response = await fetch(backendUrl(path), {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  return response;
}

export async function initializeCsrf() {
  const response = await apiFetch('/sanctum/csrf-cookie');

  if (!response.ok) {
    throw new Error('Nie udało się zainicjalizować ochrony CSRF.');
  }

  if (!getXsrfToken()) {
    throw new Error(
      'Nie można odczytać cookie XSRF-TOKEN. Otwórz SPA i backend pod tą samą nazwą hosta (localhost albo 127.0.0.1).',
    );
  }

  return response;
}
