export default function CharacterSectionTableOfContents({ sections }) {
  if (sections.length < 2) return null;

  return (
    <nav className="character-sections-toc" aria-label="Spis treści postaci">
      <strong>Spis treści</strong>
      <ol>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#character-section-${section.id}`}>{section.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
