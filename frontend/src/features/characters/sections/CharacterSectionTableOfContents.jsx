export default function CharacterSectionTableOfContents({ items }) {
  if (items.length < 2) return null;

  return (
    <nav className="character-sections-toc" aria-label="Spis treści postaci">
      <strong>Spis treści</strong>
      <ol>
        {items.map((item) => (
          <li key={item.key}>
            <a href={item.href}>{item.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
