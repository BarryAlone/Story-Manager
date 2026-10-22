import { Editor } from '@tinymce/tinymce-react';

const EDITOR_PLUGINS = [
  'autolink',
  'charmap',
  'lists',
  'link',
  'searchreplace',
  'fullscreen',
  'wordcount',
];

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

const COLOR_MAP = [
  '#000000', 'Czarny', '#434343', 'Grafitowy', '#666666', 'Szary',
  '#999999', 'Jasnoszary', '#ffffff', 'Biały', '#980000', 'Bordowy',
  '#ff0000', 'Czerwony', '#ff9900', 'Pomarańczowy', '#ffff00', 'Żółty',
  '#00ff00', 'Zielony', '#00ffff', 'Turkusowy', '#4a86e8', 'Niebieski',
  '#0000ff', 'Ciemnoniebieski', '#9900ff', 'Fioletowy', '#ff00ff', 'Różowy',
];

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
        init={{
          height: '100%',
          menubar: false,
          resize: false,
          branding: false,
          promotion: false,
          language: 'pl',
          plugins: EDITOR_PLUGINS,
          toolbar_mode: 'wrap',
          toolbar:
            'undo redo | blocks fontfamily fontsize lineheight | '
            + 'bold italic underline strikethrough subscript superscript | forecolor backcolor removeformat | '
            + 'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | '
            + 'blockquote hr link charmap | searchreplace fullscreen',
          formats: {
            underline: { inline: 'u', exact: true },
            strikethrough: { inline: 's', exact: true },
          },
          block_formats:
            'Akapit=p; Nagłówek 1=h1; Nagłówek 2=h2; Nagłówek 3=h3; '
            + 'Nagłówek 4=h4; Nagłówek 5=h5; Nagłówek 6=h6',
          font_family_formats:
            'Arial=Arial, Helvetica, sans-serif; '
            + 'Courier New=Courier New, Courier, monospace; '
            + 'Georgia=Georgia, serif; '
            + 'Tahoma=Tahoma, Arial, Helvetica, sans-serif; '
            + 'Times New Roman=Times New Roman, Times, serif; '
            + 'Verdana=Verdana, Arial, Helvetica, sans-serif',
          font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
          line_height_formats: '1 1.15 1.5 1.75 2',
          color_map: COLOR_MAP,
          indent_use_margin: false,
          browser_spellcheck: true,
          contextmenu: false,
          content_style: EDITOR_CONTENT_STYLE,
          link_default_target: '_blank',
          link_assume_external_targets: 'https',
        }}
      />
    </div>
  );
}
