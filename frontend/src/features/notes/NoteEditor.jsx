import { useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';

import { richTextEditorConfig } from '../editors/richTextEditorConfig';
import useNoteAutosave from './useNoteAutosave';

const NOTE_EDITOR_CONTENT_STYLE = `
  body {
    box-sizing: border-box;
    max-width: 900px;
    min-height: 100%;
    margin: 0 auto;
    padding: 32px 42px 80px;
    color: #1f2937;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 16px;
    line-height: 1.65;
  }
  p { margin: 0 0 1em; }
  blockquote {
    margin: 1em 0;
    padding-left: 1em;
    border-left: 3px solid #94a3b8;
    color: #475569;
  }
`;

const NOTE_EDITOR_PLUGINS = ['autolink', 'lists', 'link'];
const NOTE_EDITOR_TOOLBAR = 'undo redo | blocks | bold italic underline | bullist numlist | blockquote link | removeformat';

export default function NoteEditor({
  disabled,
  note,
  onDelete,
  onTogglePin,
  onUpdate,
  registerFlush,
}) {
  const {
    draft,
    flush,
    retry,
    saveError,
    saveState,
    setContent,
    setTitle,
  } = useNoteAutosave(note, onUpdate);

  useEffect(() => {
    registerFlush(flush);
    return () => registerFlush(null);
  }, [flush, registerFlush]);

  const statusLabel = {
    dirty: 'Zmiany oczekują na zapis',
    saving: 'Zapisywanie…',
    saved: 'Zapisano',
    error: 'Błąd zapisu',
  }[saveState];

  return (
    <section className="project-note-editor" aria-label={`Edytor notatki ${note.title}`}>
      <header className="project-note-editor__header">
        <input
          className="project-note-editor__title"
          aria-label="Tytuł notatki"
          value={draft.title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="project-note-editor__actions">
          <span className={`project-note-editor__status is-${saveState}`} role="status" aria-live="polite">
            {statusLabel}
          </span>
          <button type="button" onClick={onTogglePin} disabled={disabled}>
            {note.is_pinned ? 'Odepnij' : 'Przypnij'}
          </button>
          <button type="button" className="is-danger" onClick={onDelete} disabled={disabled}>
            Usuń
          </button>
        </div>
      </header>

      {saveError && (
        <div className="project-note-editor__error" role="alert">
          <span>{saveError}</span>
          <button type="button" onClick={retry}>Spróbuj ponownie</button>
        </div>
      )}

      <div className="project-note-editor__body">
        <Editor
          key={note.id}
          apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
          value={draft.content}
          onEditorChange={setContent}
          init={{
            ...richTextEditorConfig({ contentStyle: NOTE_EDITOR_CONTENT_STYLE }),
            plugins: NOTE_EDITOR_PLUGINS,
            toolbar: NOTE_EDITOR_TOOLBAR,
            block_formats: 'Akapit=p; Nagłówek 1=h1; Nagłówek 2=h2; Nagłówek 3=h3',
            statusbar: false,
          }}
        />
      </div>
    </section>
  );
}
