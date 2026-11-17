import { Editor } from '@tinymce/tinymce-react';
import { richTextEditorConfig } from '../editors/richTextEditorConfig';

const EDITOR_CONTENT_STYLE = `
  html {
    height: 100%;
    overflow-y: scroll;
    scrollbar-gutter: stable;
    scrollbar-color: #94a3b8 #e2e8f0;
    scrollbar-width: thin;
    background: #e9eef5;
  }

  html::-webkit-scrollbar { width: 12px; }
  html::-webkit-scrollbar-track { background: #e2e8f0; }
  html::-webkit-scrollbar-thumb {
    border: 3px solid #e2e8f0;
    border-radius: 999px;
    background: #94a3b8;
  }

  body {
    width: calc(100% - 64px);
    min-height: calc(100% - 64px);
    box-sizing: border-box;
    max-width: 860px;
    margin: 32px auto;
    padding: 42px 56px 120px;
    background: #ffffff;
    color: #1f2937;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 16px;
    line-height: 1.7;
  }

  p { margin: 0 0 1em; }
  blockquote {
    margin: 1.2em 0;
    padding-left: 1em;
    border-left: 3px solid #94a3b8;
    color: #475569;
  }

  @media (max-width: 720px) {
    body {
      width: calc(100% - 24px);
      margin: 12px auto;
      padding: 28px 24px 90px;
    }
  }
`;

export default function ChapterEditor({ chapter, onDirty, onInit }) {
  return (
    <div className="chapter-editor" aria-label={`Edytor treści dokumentu ${chapter.name}`}>
      <Editor
        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
        initialValue={chapter.description_long || ''}
        onDirty={onDirty}
        onInit={(_event, editor) => {
          editor.undoManager.clear();
          editor.setDirty(false);
          onInit(editor);
        }}
        init={richTextEditorConfig({ contentStyle: EDITOR_CONTENT_STYLE })}
      />
    </div>
  );
}
