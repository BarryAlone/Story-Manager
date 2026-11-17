import { readJson } from '../../../api';

export async function galleryApiError(response, fallbackMessage) {
  const payload = await readJson(response);
  const error = new Error(payload?.message || fallbackMessage);
  error.errors = payload?.errors || {};
  error.status = response.status;
  return error;
}

export function sortGalleryImages(images) {
  return [...images].sort((first, second) => (
    Number(first.sort_order) - Number(second.sort_order)
      || Number(first.id) - Number(second.id)
  ));
}
