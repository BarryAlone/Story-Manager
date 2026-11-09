import { readJson } from '../../api';

export async function characterApiError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;
  const error = new Error(validationMessage || payload?.message || fallback);

  error.errors = payload?.errors || {};
  error.status = response.status;

  return error;
}

export function appendCharacterAttributeValues(formData, values) {
  if (values !== undefined) {
    formData.append('attribute_values', JSON.stringify(values));
  }
}
