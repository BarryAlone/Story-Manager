const LAYOUT_FORMAT_VERSION = 1;
const STORAGE_PREFIX = 'story-manager:relationship-graph-layout';

function encodeKeyPart(value) {
  return encodeURIComponent(String(value));
}

export function buildGraphLayoutStorageKey({ userId, projectId, scenarioKey = '' }) {
  if (userId === null || userId === undefined || !projectId) return null;

  const scope = scenarioKey ? `scenario:${scenarioKey}` : 'project';
  return [
    STORAGE_PREFIX,
    `v${LAYOUT_FORMAT_VERSION}`,
    `user:${encodeKeyPart(userId)}`,
    `project:${encodeKeyPart(projectId)}`,
    `scope:${encodeKeyPart(scope)}`,
  ].join(':');
}

function getStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readGraphLayout(storageKey) {
  if (!storageKey) return null;

  try {
    const serializedLayout = getStorage()?.getItem(storageKey);
    if (!serializedLayout) return null;

    const storedLayout = JSON.parse(serializedLayout);
    if (storedLayout?.version !== LAYOUT_FORMAT_VERSION || !storedLayout.positions) return null;

    const positions = Object.fromEntries(
      Object.entries(storedLayout.positions).filter(([, position]) => (
        Array.isArray(position)
        && position.length === 2
        && position.every(Number.isFinite)
      )),
    );

    return Object.keys(positions).length > 0 ? positions : null;
  } catch {
    return null;
  }
}

export function writeGraphLayout(storageKey, positions) {
  if (!storageKey || Object.keys(positions).length === 0) return false;

  try {
    const storage = getStorage();
    if (!storage) return false;

    storage.setItem(storageKey, JSON.stringify({
      version: LAYOUT_FORMAT_VERSION,
      positions,
    }));
    return true;
  } catch {
    return false;
  }
}

export function removeGraphLayout(storageKey) {
  if (!storageKey) return;

  try {
    getStorage()?.removeItem(storageKey);
  } catch {
    // Brak dostępu do localStorage nie powinien blokować działania grafu.
  }
}
