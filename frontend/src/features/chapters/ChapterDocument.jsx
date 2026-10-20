import ChapterEditor from './ChapterEditor';

export default function ChapterDocument({
  chapter,
  hasDocuments,
  isLoading,
  loadError,
  onEditorDirty,
  onEditorInit,
  onRetry,
}) {
  if (isLoading) {
    return <div className="chapter-document__state" role="status">Ładowanie rozdziałów…</div>;
  }

  if (loadError) {
    return (
      <div className="chapter-document__state chapter-document__state--error" role="alert">
        <strong>Nie udało się otworzyć przestrzeni rozdziałów.</strong>
        <span>{loadError}</span>
        <button type="button" onClick={onRetry}>Spróbuj ponownie</button>
      </div>
    );
  }

  if (!hasDocuments) {
    return (
      <div className="chapter-document__state">
        <strong>Nie masz jeszcze żadnych dokumentów.</strong>
        <span>Utwórz pierwszy rozdział lub szkic przyciskiem w panelu po lewej.</span>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="chapter-document__state">
        <strong>Wybierz dokument ze struktury.</strong>
        <span>Obszar jego treści pojawi się tutaj.</span>
      </div>
    );
  }

  return (
    <article className="chapter-document" aria-label={`Treść dokumentu ${chapter.name}`}>
      <ChapterEditor
        key={chapter.id}
        chapter={chapter}
        onDirty={onEditorDirty}
        onInit={onEditorInit}
      />
    </article>
  );
}
