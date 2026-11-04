import { readJson } from '../../api';

export async function worldApiError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;
  const domainMessage = [409, 422].includes(response.status) ? payload?.message : null;

  return new Error(validationMessage || domainMessage || fallback);
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}
