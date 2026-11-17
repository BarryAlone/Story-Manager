import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import editIcon from '../../../assets/icons/pencil.png';
import CharacterSectionEditor from './CharacterSectionEditor';
import CharacterSectionTableOfContents from './CharacterSectionTableOfContents';
import useCharacterSectionContents from './useCharacterSectionContents';
import useUnsavedSectionGuard, { UNSAVED_SECTION_MESSAGE } from './useUnsavedSectionGuard';

const CharacterSections = forwardRef(function CharacterSections({
  characterId,
  definitionStore,
  managerButtonRef,
  onOpenManager,
}, ref) {
  const contentStore = useCharacterSectionContents(characterId);
  const syncDefinitions = contentStore.syncDefinitions;
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [editorError, setEditorError] = useState('');
  const editButtonRefs = useRef(new Map());
  const addContentRef = useRef(null);
  const isDirty = editingId !== null && draft !== initialContent;

  useUnsavedSectionGuard(isDirty);

  useEffect(() => {
    if (definitionStore.isLoading || definitionStore.error) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) syncDefinitions(definitionStore.definitions);
    });
    return () => { cancelled = true; };
  }, [definitionStore.definitions, definitionStore.error, definitionStore.isLoading, syncDefinitions]);

  const closeEditor = useCallback((focusId = editingId, restoreFocus = true) => {
    setEditingId(null);
    setDraft('');
    setInitialContent('');
    setEditorError('');
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        (editButtonRefs.current.get(Number(focusId)) || addContentRef.current)?.focus({ preventScroll: true });
      });
    }
  }, [editingId]);

  const requestDiscard = useCallback(({ restoreFocus = true } = {}) => {
    if (contentStore.isMutating) return false;
    if (isDirty && !window.confirm(UNSAVED_SECTION_MESSAGE)) return false;
    if (editingId !== null) closeEditor(editingId, restoreFocus);
    return true;
  }, [closeEditor, contentStore.isMutating, editingId, isDirty]);

  useImperativeHandle(ref, () => ({ requestDiscard }), [requestDiscard]);

  useEffect(() => {
    if (editingId === null) return undefined;
    const closeWithEscape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      requestDiscard();
    };
    document.addEventListener('keydown', closeWithEscape, true);
    return () => document.removeEventListener('keydown', closeWithEscape, true);
  }, [editingId, requestDiscard]);

  const beginEdit = useCallback((section) => {
    if (contentStore.isMutating) return;
    if (editingId !== null && Number(editingId) !== Number(section.id) && !requestDiscard()) return;
    const content = section.content || '';
    setEditingId(Number(section.id));
    setDraft(content);
    setInitialContent(content);
    setEditorError('');
  }, [contentStore.isMutating, editingId, requestDiscard]);

  const save = async (section) => {
    if (contentStore.isMutating || !draft.trim()) return;
    setEditorError('');
    try {
      await contentStore.saveContent(section.id, draft);
      closeEditor(section.id);
      definitionStore.refreshDefinitions();
    } catch (error) {
      if (error?.name !== 'AbortError') setEditorError(error.message || 'Nie udało się zapisać treści sekcji.');
    }
  };

  const clear = async (section) => {
    if (contentStore.isMutating) return;
    if (!window.confirm(`Wyczyścić treść sekcji „${section.title}” dla tej postaci? Globalna sekcja pozostanie bez zmian.`)) return;
    setEditorError('');
    try {
      await contentStore.clearContent(section.id);
      closeEditor(section.id);
      definitionStore.refreshDefinitions();
    } catch (error) {
      if (error?.name !== 'AbortError') setEditorError(error.message || 'Nie udało się wyczyścić treści sekcji.');
    }
  };

  const filledSections = useMemo(
    () => contentStore.sections.filter((section) => Boolean(section.content?.trim())),
    [contentStore.sections],
  );
  const emptySections = useMemo(
    () => contentStore.sections.filter((section) => !section.content?.trim()),
    [contentStore.sections],
  );
  const articleSections = useMemo(
    () => contentStore.sections.filter((section) => (
      Boolean(section.content?.trim()) || Number(editingId) === Number(section.id)
    )),
    [contentStore.sections, editingId],
  );

  const openManager = () => {
    if (requestDiscard({ restoreFocus: false })) onOpenManager();
  };

  if (contentStore.isLoading) {
    return <div className="character-sections-state" role="status">Ładowanie sekcji postaci…</div>;
  }

  if (contentStore.error) {
    return (
      <div className="character-sections-state character-sections-state--error" role="alert">
        <p>{contentStore.error}</p>
        <button type="button" onClick={contentStore.loadSections}>Spróbuj ponownie</button>
      </div>
    );
  }

  return (
    <div className="character-sections">
      <div className="character-sections__toolbar">
        {emptySections.length > 0 && (
          <label className="character-sections__add">
            <span className="sr-only">Dodaj treść sekcji</span>
            <select
              ref={addContentRef}
              value=""
              disabled={editingId !== null || contentStore.isMutating}
              aria-label="Dodaj treść sekcji"
              onChange={(event) => {
                const section = emptySections.find((item) => Number(item.id) === Number(event.target.value));
                if (section) beginEdit(section);
              }}
            >
              <option value="">Dodaj treść sekcji…</option>
              {emptySections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}
            </select>
          </label>
        )}
        <button
          ref={managerButtonRef}
          type="button"
          className="character-section-button"
          data-panel-trigger
          onClick={openManager}
          disabled={definitionStore.isMutating}
        >
          Zarządzaj sekcjami
        </button>
      </div>

      {contentStore.sections.length === 0 && (
        <div className="character-sections-state">
          <p>Projekt nie ma jeszcze sekcji postaci.</p>
          <button type="button" onClick={openManager}>Utwórz pierwszą sekcję</button>
        </div>
      )}

      {contentStore.sections.length > 0 && filledSections.length === 0 && editingId === null && (
        <div className="character-sections-state">
          <p>Ta postać nie ma jeszcze uzupełnionych sekcji.</p>
          {emptySections.length > 0 && (
            <button type="button" onClick={() => beginEdit(emptySections[0])}>Uzupełnij pierwszą sekcję</button>
          )}
        </div>
      )}

      <CharacterSectionTableOfContents sections={filledSections} />

      <div className="character-sections__article">
        {articleSections.map((section, sectionIndex) => {
          const isEditing = Number(editingId) === Number(section.id);
          return (
            <section key={section.id} id={`character-section-${section.id}`} className="character-section" aria-labelledby={`character-section-title-${section.id}`}>
              <div className="character-section__heading">
                <h2 id={`character-section-title-${section.id}`}>
                  <span className="character-section__number">{sectionIndex + 1}.</span>
                  {section.title}
                </h2>
                {!isEditing && (
                  <button
                    ref={(node) => {
                      if (node) editButtonRefs.current.set(Number(section.id), node);
                      else editButtonRefs.current.delete(Number(section.id));
                    }}
                    type="button"
                    className="character-wiki__edit-button"
                    aria-label={`Edytuj sekcję: ${section.title}`}
                    title={`Edytuj sekcję: ${section.title}`}
                    onClick={() => beginEdit(section)}
                  >
                    <img src={editIcon} alt="" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <CharacterSectionEditor
                  draft={draft}
                  error={editorError}
                  hasContent={Boolean(section.content_id)}
                  isSaving={contentStore.isMutating}
                  onCancel={requestDiscard}
                  onChange={(value) => {
                    setDraft(value);
                    setEditorError('');
                  }}
                  onClear={() => clear(section)}
                  onSave={() => save(section)}
                  title={section.title}
                />
              ) : (
                <div className="character-section__content" dangerouslySetInnerHTML={{ __html: section.content }} />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
});

export default CharacterSections;
