import { readJson } from '../../api';

export async function worldApiError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;
  const domainMessage = [409, 422].includes(response.status) ? payload?.message : null;

  const error = new Error(validationMessage || domainMessage || fallback);

  error.errors = payload?.errors || {};
  error.status = response.status;
  error.valuesCount = Number(payload?.values_count || 0);

  return error;
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}
