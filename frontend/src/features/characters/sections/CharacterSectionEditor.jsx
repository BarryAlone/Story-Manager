import { Editor } from '@tinymce/tinymce-react';

import { richTextEditorConfig } from '../../editors/richTextEditorConfig';

const SECTION_CONTENT_STYLE = `
  body {
    margin: 18px;
    color: #334155;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.75;
  }
  img, table { max-width: 100%; }
  blockquote { margin-left: 0; padding-left: 1rem; border-left: 3px solid #cbd5e1; }
`;

const SECTION_EDITOR_TOOLBAR =
  'undo redo | blocks | bold italic underline | bullist numlist | blockquote link | removeformat';

export default function CharacterSectionEditor({
  draft,
  error,
  hasContent,
  isSaving,
  onCancel,
  onChange,
  onClear,
  onSave,
  title,
}) {
  return (
    <div className="character-section-editor">
      <Editor
        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
        value={draft}
        onEditorChange={onChange}
        onInit={(_event, editor) => {
          editor.focus();
        }}
        init={{
          ...richTextEditorConfig({
            contentStyle: SECTION_CONTENT_STYLE,
            height: 420,
            resize: true,
          }),
          elementpath: false,
          toolbar: SECTION_EDITOR_TOOLBAR,
        }}
      />

      {error && <p className="character-section-editor__error" role="alert">{error}</p>}

      <div className="character-section-editor__actions">
        {hasContent && (
          <button type="button" className="character-section-button character-section-button--danger" onClick={onClear} disabled={isSaving}>
            Wyczyść treść
          </button>
        )}
        <span className="character-section-editor__spacer" />
        <button type="button" className="character-section-button" onClick={onCancel} disabled={isSaving}>
          Anuluj
        </button>
        <button type="button" className="character-section-button character-section-button--primary" onClick={onSave} disabled={isSaving || !draft.trim()}>
          {isSaving ? 'Zapisywanie…' : `Zapisz „${title}”`}
        </button>
      </div>
    </div>
  );
}
