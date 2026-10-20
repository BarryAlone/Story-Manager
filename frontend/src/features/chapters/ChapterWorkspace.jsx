import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChapterDocument from './ChapterDocument';
import ChapterFormModal from './ChapterFormModal';
import ChapterInspector from './ChapterInspector';
import ChapterSubchapterModal from './ChapterSubchapterModal';
import ChapterSwapModal from './ChapterSwapModal';
import ChapterToolbar from './ChapterToolbar';
import ChapterTree from './ChapterTree';
import { buildChapterStructure } from './chapterStructure';
import useChapters from './useChapters';
import useChapterWriting from './useChapterWriting';
import './chapterWorkspace.css';

export default function ChapterWorkspace() {
  const { chapterId, projectId } = useParams();
  const navigate = useNavigate();
  const chapterStore = useChapters(projectId);
  const structure = useMemo(() => buildChapterStructure(chapterStore.chapters), [chapterStore.chapters]);
  const activeChapter = chapterStore.chapters.find((chapter) => Number(chapter.id) === Number(chapterId)) || null;
  const {
    draft,
    isDirty,
    isSaving,
    markEditorDirty,
    registerEditor,
    resetFromChapter,
    save: saveWriting,
    status: writingStatus,
    updateDraft,
  } = useChapterWriting(activeChapter, chapterStore.updateChapterContent);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());
  const [formChapter, setFormChapter] = useState(undefined);
  const [subchapterParent, setSubchapterParent] = useState(null);
  const [swapChapter, setSwapChapter] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const expandedIds = useMemo(() => new Set(
    structure.roots
      .map((root) => Number(root.chapter.id))
      .filter((id) => !collapsedIds.has(id)),
  ), [collapsedIds, structure.roots]);

  const discardWritingChanges = useCallback(() => {
    if (!isDirty) return true;

    const shouldDiscard = window.confirm(
      'Ten dokument ma niezapisane zmiany. Czy chcesz je odrzucić?',
    );

    if (shouldDiscard) resetFromChapter();
    return shouldDiscard;
  }, [isDirty, resetFromChapter]);

  const selectChapter = useCallback((chapter) => {
    if (Number(chapter.id) === Number(chapterId)) return;
    if (!discardWritingChanges()) return;

    setActionError('');
    setIsInspectorOpen(false);
    navigate(`/project/${projectId}/chapters/${chapter.id}`);
  }, [chapterId, discardWritingChanges, navigate, projectId]);

  const closeModal = useCallback(() => setFormChapter(undefined), []);
  const closeSubchapterModal = useCallback(() => setSubchapterParent(null), []);
  const closeInspector = useCallback(() => setIsInspectorOpen(false), []);

  const handleSave = async (payload) => {
    const savedChapter = await chapterStore.saveChapter(payload);
    if (savedChapter.parent_id !== null && savedChapter.parent_id !== undefined) {
      setCollapsedIds((current) => {
        const next = new Set(current);
        next.delete(Number(savedChapter.parent_id));
        return next;
      });
    }
    if (Number(savedChapter.id) === Number(activeChapter?.id)) {
      resetFromChapter(savedChapter);
    }
    setFormChapter(undefined);
    selectChapter(savedChapter);
  };

  const openChapterForm = useCallback((chapter) => {
    if (!discardWritingChanges()) return;
    setFormChapter(chapter);
  }, [discardWritingChanges]);

  const openSubchapterForm = useCallback((parent) => {
    if (!discardWritingChanges()) return;
    setActionError('');
    setSubchapterParent(parent);
  }, [discardWritingChanges]);

  const handleCreateSubchapter = async (payload) => {
    const savedChapter = await chapterStore.createSubchapter(payload);
    const parentId = Number(payload.parent.id);

    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(parentId);
      return next;
    });
    setSubchapterParent(null);
    selectChapter(savedChapter);
  };

  const handleDelete = async (chapter) => {
    if (!window.confirm(`Czy na pewno chcesz trwale usunąć „${chapter.name}”?`)) return;
    if (Number(chapter.id) === Number(chapterId) && !discardWritingChanges()) return;
    setActionError('');

    try {
      await chapterStore.deleteChapter(chapter.id);
      if (Number(chapter.id) === Number(chapterId)) {
        const parent = chapterStore.chapters.find(
          (item) => Number(item.id) === Number(chapter.parent_id),
        );
        navigate(parent
          ? `/project/${projectId}/chapters/${parent.id}`
          : `/project/${projectId}/chapters`);
      }
    } catch (error) {
      setActionError(error.message || 'Nie udało się usunąć rozdziału.');
    }
  };

  const handleMove = async (chapter, direction) => {
    setActionError('');
    try {
      await chapterStore.swapChapters(chapter.id, { direction });
    } catch (error) {
      setActionError(error.message || 'Nie udało się zmienić kolejności.');
    }
  };

  const toggleExpanded = (id) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      const numericId = Number(id);
      if (next.has(numericId)) next.delete(numericId);
      else next.add(numericId);
      return next;
    });
  };

  return (
    <section className="chapter-workspace" aria-label="Przestrzeń robocza rozdziałów">
      <div className="chapter-workspace__stage">
        <ChapterTree
          activeId={chapterId}
          expandedIds={expandedIds}
          isLoading={chapterStore.isLoading}
          onAddSubchapter={openSubchapterForm}
          onCreate={() => openChapterForm(null)}
          onDelete={handleDelete}
          onEdit={openChapterForm}
          onMove={handleMove}
          onSelect={selectChapter}
          onSwap={setSwapChapter}
          onToggle={toggleExpanded}
          structure={structure}
        />

        <main className="chapter-workspace__main">
          <ChapterToolbar
            chapter={activeChapter}
            documentNumber={structure.numberById.get(Number(activeChapter?.id))}
            isDirty={isDirty}
            isSaving={isSaving}
            onEdit={openChapterForm}
            onSave={saveWriting}
            status={writingStatus}
          />

          <div className="chapter-workspace__content">
            {actionError && (
              <div className="chapter-workspace__alert" role="alert">
                <span>{actionError}</span>
                <button type="button" onClick={() => setActionError('')} aria-label="Zamknij komunikat">×</button>
              </div>
            )}

            <ChapterDocument
              chapter={activeChapter}
              hasDocuments={chapterStore.chapters.length > 0}
              isLoading={chapterStore.isLoading}
              loadError={chapterStore.loadError}
              onEditorDirty={markEditorDirty}
              onEditorInit={registerEditor}
              onRetry={chapterStore.loadChapters}
            />

            <ChapterInspector
              chapter={activeChapter}
              draft={draft}
              isOpen={isInspectorOpen && Boolean(activeChapter)}
              onClose={closeInspector}
              onFieldChange={updateDraft}
              onToggle={() => setIsInspectorOpen((current) => !current)}
            />
          </div>
        </main>
      </div>

      {formChapter !== undefined && (
        <ChapterFormModal
          chapter={formChapter}
          onClose={closeModal}
          onSubmit={handleSave}
          parentOptions={structure.roots.map((root) => root.chapter)}
        />
      )}

      {subchapterParent && (
        <ChapterSubchapterModal
          onClose={closeSubchapterModal}
          onSubmit={handleCreateSubchapter}
          parent={subchapterParent}
        />
      )}

      {swapChapter && (
        <ChapterSwapModal
          chapter={swapChapter}
          chapters={chapterStore.chapters}
          onClose={() => setSwapChapter(null)}
          onSubmit={chapterStore.swapChapters}
        />
      )}
    </section>
  );
}
