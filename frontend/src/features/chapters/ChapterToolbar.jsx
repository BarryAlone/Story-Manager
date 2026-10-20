export default function ChapterToolbar({
  chapter,
  documentNumber,
  isDirty,
  isSaving,
  onEdit,
  onSave,
  status,
}) {
  return (
    <header className="chapter-toolbar">
      <div className="chapter-toolbar__document">
        {chapter ? (
          <>
            <span className="chapter-toolbar__number">{documentNumber || 'Szkic'}</span>
            <h1 title={chapter.name}>{chapter.name}</h1>
          </>
        ) : (
          <h1>Wybierz dokument</h1>
        )}
      </div>
      <div className="chapter-toolbar__actions">
        {status.message && (
          <span
            className={`chapter-toolbar__status chapter-toolbar__status--${status.kind}`}
            role={status.kind === 'error' ? 'alert' : 'status'}
          >
            {status.message}
          </span>
        )}
        <button type="button" onClick={() => onEdit(chapter)} disabled={!chapter || isSaving}>Edytuj dane</button>
        <button
          type="button"
          className="chapter-toolbar__save"
          onClick={onSave}
          disabled={!chapter || !isDirty || isSaving}
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz'}
        </button>
      </div>
    </header>
  );
}
