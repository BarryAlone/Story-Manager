import { apiFetch, readJson } from '../../api';

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

export async function notesApiError(response, fallback) {
  const payload = await readJson(response);
  const validationMessage = payload?.errors
    ? Object.values(payload.errors).flat().find(Boolean)
    : null;

  return new Error(validationMessage || payload?.message || fallback);
}

async function jsonRequest(path, options, fallback) {
  const response = await apiFetch(path, options);
  if (!response.ok) throw await notesApiError(response, fallback);
  if (response.status === 204) return null;
  return response.json();
}

export const projectNotesApi = {
  list(projectId, signal) {
    return jsonRequest(
      `/api/projects/${projectId}/notes`,
      { signal },
      'Nie udało się pobrać notatek.',
    );
  },

  show(noteId, signal) {
    return jsonRequest(
      `/api/project-notes/${noteId}`,
      { signal },
      'Nie udało się pobrać notatki.',
    );
  },

  create(projectId, values, signal) {
    return jsonRequest(
      `/api/projects/${projectId}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal,
      },
      'Nie udało się utworzyć notatki.',
    );
  },

  update(noteId, values, signal) {
    return jsonRequest(
      `/api/project-notes/${noteId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal,
      },
      'Nie udało się zapisać notatki.',
    );
  },

  remove(noteId, signal) {
    return jsonRequest(
      `/api/project-notes/${noteId}`,
      { method: 'DELETE', signal },
      'Nie udało się usunąć notatki.',
    );
  },
};

export const projectChecklistApi = {
  list(projectId, signal) {
    return jsonRequest(
      `/api/projects/${projectId}/checklist-items?status=all`,
      { signal },
      'Nie udało się pobrać checklisty.',
    );
  },

  create(projectId, values, signal) {
    return jsonRequest(
      `/api/projects/${projectId}/checklist-items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal,
      },
      'Nie udało się dodać zadania.',
    );
  },

  update(itemId, values, signal) {
    return jsonRequest(
      `/api/project-checklist-items/${itemId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        signal,
      },
      'Nie udało się zapisać zadania.',
    );
  },

  setCompletion(itemId, isCompleted, signal) {
    return jsonRequest(
      `/api/project-checklist-items/${itemId}/completion`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted }),
        signal,
      },
      'Nie udało się zmienić stanu zadania.',
    );
  },

  reorder(projectId, status, itemIds, signal) {
    return jsonRequest(
      `/api/projects/${projectId}/checklist-items/order`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, item_ids: itemIds }),
        signal,
      },
      'Nie udało się zmienić kolejności zadań.',
    );
  },

  remove(itemId, signal) {
    return jsonRequest(
      `/api/project-checklist-items/${itemId}`,
      { method: 'DELETE', signal },
      'Nie udało się usunąć zadania.',
    );
  },
};
