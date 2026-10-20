import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function draftFromChapter(chapter) {
  return {
    synopsis: chapter?.description || '',
    notes: chapter?.notes || '',
  };
}

export default function useChapterWriting(chapter, updateChapterContent) {
  const editorRef = useRef(null);
  const chapterId = chapter?.id ?? null;
  const [draftState, setDraftState] = useState(() => ({
    chapterId,
    ...draftFromChapter(chapter),
  }));
  const [editorDirtyChapterId, setEditorDirtyChapterId] = useState(null);
  const [saveRecord, setSaveRecord] = useState({ chapterId: null, state: 'idle', error: '' });
  const draft = useMemo(() => (
    Number(draftState.chapterId) === Number(chapterId)
      ? { synopsis: draftState.synopsis, notes: draftState.notes }
      : draftFromChapter(chapter)
  ), [chapter, chapterId, draftState]);
  const isEditorDirty = chapterId !== null
    && Number(editorDirtyChapterId) === Number(chapterId);
  const currentSaveRecord = Number(saveRecord.chapterId) === Number(chapterId)
    ? saveRecord
    : { state: 'idle', error: '' };

  const isPanelDirty = Boolean(chapter) && (
    draft.synopsis !== (chapter.description || '')
    || draft.notes !== (chapter.notes || '')
  );
  const isDirty = isEditorDirty || isPanelDirty;
  const isSaving = currentSaveRecord.state === 'saving';

  useEffect(() => {
    if (!isDirty) return undefined;

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const registerEditor = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const markEditorDirty = useCallback(() => {
    setEditorDirtyChapterId(chapterId);
    setSaveRecord({ chapterId, state: 'idle', error: '' });
  }, [chapterId]);

  const updateDraft = useCallback((field, value) => {
    setDraftState({ chapterId, ...draft, [field]: value });
    setSaveRecord({ chapterId, state: 'idle', error: '' });
  }, [chapterId, draft]);

  const resetFromChapter = useCallback((nextChapter = chapter) => {
    if (!nextChapter) return;

    setDraftState({ chapterId: nextChapter.id, ...draftFromChapter(nextChapter) });
    setEditorDirtyChapterId(null);
    setSaveRecord({ chapterId: nextChapter.id, state: 'idle', error: '' });

    if (editorRef.current && Number(nextChapter.id) === Number(chapterId)) {
      editorRef.current.setContent(nextChapter.description_long || '');
      editorRef.current.undoManager.clear();
      editorRef.current.setDirty(false);
    }
  }, [chapter, chapterId]);

  const save = useCallback(async () => {
    if (!chapter || isSaving || !isDirty) return null;

    setSaveRecord({ chapterId, state: 'saving', error: '' });

    try {
      const savedChapter = await updateChapterContent(chapter, {
        description: draft.synopsis,
        description_long: editorRef.current?.getContent() ?? chapter.description_long ?? '',
        notes: draft.notes,
      });

      setDraftState({ chapterId: savedChapter.id, ...draftFromChapter(savedChapter) });
      setEditorDirtyChapterId(null);
      editorRef.current?.setDirty(false);
      setSaveRecord({ chapterId: savedChapter.id, state: 'saved', error: '' });

      return savedChapter;
    } catch (error) {
      setSaveRecord({
        chapterId,
        state: 'error',
        error: error.message || 'Nie udało się zapisać treści rozdziału.',
      });
      return null;
    }
  }, [chapter, chapterId, draft.notes, draft.synopsis, isDirty, isSaving, updateChapterContent]);

  useEffect(() => {
    const saveFromKeyboard = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };

    window.addEventListener('keydown', saveFromKeyboard);
    return () => window.removeEventListener('keydown', saveFromKeyboard);
  }, [save]);

  const status = useMemo(() => {
    if (isSaving) return { kind: 'saving', message: 'Zapisywanie…' };
    if (currentSaveRecord.state === 'error') {
      return { kind: 'error', message: currentSaveRecord.error };
    }
    if (isDirty) return { kind: 'dirty', message: 'Niezapisane zmiany' };
    if (currentSaveRecord.state === 'saved') return { kind: 'saved', message: 'Zapisano' };
    return { kind: 'idle', message: '' };
  }, [currentSaveRecord.error, currentSaveRecord.state, isDirty, isSaving]);

  return {
    draft,
    isDirty,
    isSaving,
    markEditorDirty,
    registerEditor,
    resetFromChapter,
    save,
    status,
    updateDraft,
  };
}
