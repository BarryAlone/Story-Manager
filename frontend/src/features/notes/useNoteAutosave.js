import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const AUTOSAVE_DELAY = 800;

function noteDraft(note) {
  return {
    title: note?.title || '',
    content: note?.content || '',
  };
}

function changedFields(draft, saved) {
  const changes = {};
  if (draft.title !== saved.title) changes.title = draft.title;
  if (draft.content !== saved.content) changes.content = draft.content;
  return changes;
}

export default function useNoteAutosave(note, onUpdate) {
  const [draft, setDraft] = useState(() => noteDraft(note));
  const [saveState, setSaveState] = useState('saved');
  const [saveError, setSaveError] = useState('');
  const draftRef = useRef(draft);
  const savedRef = useRef(noteDraft(note));
  const noteIdRef = useRef(note?.id ?? null);
  const timerRef = useRef(null);
  const savePromiseRef = useRef(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(timerRef.current);
    abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    abortControllerRef.current?.abort();
    savePromiseRef.current = null;
    noteIdRef.current = note?.id ?? null;
    const nextDraft = noteDraft(note);
    draftRef.current = nextDraft;
    savedRef.current = nextDraft;

    Promise.resolve().then(() => {
      if (!mountedRef.current) return;
      setDraft(nextDraft);
      setSaveState('saved');
      setSaveError('');
    });
  }, [note]);

  const saveNow = useCallback(() => {
    clearTimeout(timerRef.current);

    if (!noteIdRef.current) return Promise.resolve(true);
    if (savePromiseRef.current) return savePromiseRef.current;

    const drain = (async () => {
      while (noteIdRef.current) {
        const noteId = noteIdRef.current;
        const changes = changedFields(draftRef.current, savedRef.current);
        if (Object.keys(changes).length === 0) {
          if (mountedRef.current) setSaveState('saved');
          return true;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        if (mountedRef.current) {
          setSaveState('saving');
          setSaveError('');
        }

        try {
          const updated = await onUpdate(noteId, changes, controller.signal);
          if (noteIdRef.current !== noteId) return false;

          savedRef.current = {
            title: updated.title || '',
            content: updated.content || '',
          };
          let nextDraft = draftRef.current;
          if ('title' in changes && nextDraft.title === changes.title) {
            nextDraft = { ...nextDraft, title: updated.title || '' };
          }
          if ('content' in changes && nextDraft.content === changes.content) {
            nextDraft = { ...nextDraft, content: updated.content || '' };
          }
          if (nextDraft !== draftRef.current) {
            draftRef.current = nextDraft;
            if (mountedRef.current) setDraft(nextDraft);
          }
        } catch (error) {
          if (error?.name === 'AbortError') return false;
          if (mountedRef.current && noteIdRef.current === noteId) {
            setSaveState('error');
            setSaveError(error.message || 'Nie udało się zapisać zmian.');
          }
          return false;
        }
      }

      return false;
    })();

    savePromiseRef.current = drain;
    drain.finally(() => {
      if (savePromiseRef.current === drain) savePromiseRef.current = null;
    });
    return drain;
  }, [onUpdate]);

  const scheduleSave = useCallback(() => {
    clearTimeout(timerRef.current);
    setSaveState('dirty');
    setSaveError('');
    timerRef.current = window.setTimeout(() => {
      saveNow();
    }, AUTOSAVE_DELAY);
  }, [saveNow]);

  const setTitle = useCallback((title) => {
    setDraft((current) => ({ ...current, title }));
    draftRef.current = { ...draftRef.current, title };
    scheduleSave();
  }, [scheduleSave]);

  const setContent = useCallback((content) => {
    setDraft((current) => ({ ...current, content }));
    draftRef.current = { ...draftRef.current, content };
    scheduleSave();
  }, [scheduleSave]);

  return {
    draft,
    saveState,
    saveError,
    setTitle,
    setContent,
    flush: saveNow,
    retry: saveNow,
  };
}
