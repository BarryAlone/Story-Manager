import { readJson } from '../../../api';

export function sortCharacterSections(sections) {
  return [...sections].sort((first, second) => (
    Number(first.sort_order) - Number(second.sort_order)
    || Number(first.id) - Number(second.id)
  ));
}

export async function characterSectionApiError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;
  const error = new Error(validationMessage || payload?.message || fallback);

  error.errors = payload?.errors || {};
  error.status = response.status;
  error.contentsCount = Number(payload?.contents_count || 0);

  return error;
}
