export const RICH_TEXT_EDITOR_PLUGINS = [
  'autolink',
  'charmap',
  'lists',
  'link',
  'searchreplace',
  'fullscreen',
  'wordcount',
];

export const RICH_TEXT_EDITOR_TOOLBAR =
  'undo redo | blocks fontfamily fontsize lineheight | '
  + 'bold italic underline strikethrough subscript superscript | forecolor backcolor removeformat | '
  + 'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | '
  + 'blockquote hr link charmap | searchreplace fullscreen';

export const RICH_TEXT_BLOCK_FORMATS =
  'Akapit=p; Nagłówek 1=h1; Nagłówek 2=h2; Nagłówek 3=h3; '
  + 'Nagłówek 4=h4; Nagłówek 5=h5; Nagłówek 6=h6';

export const RICH_TEXT_FONT_FAMILIES =
  'Arial=Arial, Helvetica, sans-serif; '
  + 'Courier New=Courier New, Courier, monospace; '
  + 'Georgia=Georgia, serif; '
  + 'Tahoma=Tahoma, Arial, Helvetica, sans-serif; '
  + 'Times New Roman=Times New Roman, Times, serif; '
  + 'Verdana=Verdana, Arial, Helvetica, sans-serif';

export const RICH_TEXT_COLOR_MAP = [
  '#000000', 'Czarny', '#434343', 'Grafitowy', '#666666', 'Szary',
  '#999999', 'Jasnoszary', '#ffffff', 'Biały', '#980000', 'Bordowy',
  '#ff0000', 'Czerwony', '#ff9900', 'Pomarańczowy', '#ffff00', 'Żółty',
  '#00ff00', 'Zielony', '#00ffff', 'Turkusowy', '#4a86e8', 'Niebieski',
  '#0000ff', 'Ciemnoniebieski', '#9900ff', 'Fioletowy', '#ff00ff', 'Różowy',
];

export function richTextEditorConfig({ contentStyle, height = '100%', resize = false }) {
  return {
    height,
    menubar: false,
    resize,
    branding: false,
    promotion: false,
    language: 'pl',
    plugins: RICH_TEXT_EDITOR_PLUGINS,
    toolbar_mode: 'wrap',
    toolbar: RICH_TEXT_EDITOR_TOOLBAR,
    formats: {
      underline: { inline: 'u', exact: true },
      strikethrough: { inline: 's', exact: true },
    },
    block_formats: RICH_TEXT_BLOCK_FORMATS,
    font_family_formats: RICH_TEXT_FONT_FAMILIES,
    font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
    line_height_formats: '1 1.15 1.5 1.75 2',
    color_map: RICH_TEXT_COLOR_MAP,
    indent_use_margin: false,
    browser_spellcheck: true,
    contextmenu: false,
    content_style: contentStyle,
    link_default_target: '_blank',
    link_assume_external_targets: 'https',
  };
}
