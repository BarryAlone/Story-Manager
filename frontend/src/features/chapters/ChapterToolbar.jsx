export default function ChapterToolbar({ chapter, documentNumber, onEdit }) {
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
      <button type="button" onClick={() => onEdit(chapter)} disabled={!chapter}>Edytuj dane</button>
    </header>
  );
}
