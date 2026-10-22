export default function ChapterToolbar({
  chapter,
  documentNumber,
  isDirty,
  isSaving,
  onEdit,
  onModeChange,
  onSave,
  status,
  viewMode,
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

      <div className="chapter-toolbar__modes" role="group" aria-label="Tryb pracy z rozdziałami">
        <button
          type="button"
          className={`chapter-toolbar__mode${viewMode === 'editor' ? ' chapter-toolbar__mode--active' : ''}`}
          onClick={() => onModeChange('editor')}
          aria-pressed={viewMode === 'editor'}
          title="Edytor"
        >
          <EditorIcon />
          <span>Edytor</span>
        </button>
        <button
          type="button"
          className={`chapter-toolbar__mode${viewMode === 'plan' ? ' chapter-toolbar__mode--active' : ''}`}
          onClick={() => onModeChange('plan')}
          aria-pressed={viewMode === 'plan'}
          title="Plan rozdziałów"
        >
          <PlanIcon />
          <span>Plan rozdziałów</span>
        </button>
      </div>

      <div className="chapter-toolbar__actions">
        {viewMode === 'editor' && (
          <>
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
          </>
        )}
      </div>
    </header>
  );
}

function EditorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 19h4l10-10-4-4L5 15v4Z" />
      <path d="m13.5 6.5 4 4M5 21h14" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6h10M9 12h10M9 18h10" />
      <circle cx="5" cy="6" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="5" cy="18" r="1" />
    </svg>
  );
}
