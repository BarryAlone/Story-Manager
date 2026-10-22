import { useMemo, useState } from 'react';

function normalized(value) {
  return String(value || '').toLocaleLowerCase('pl-PL');
}

function matchesQuery(chapter, query) {
  if (!query) return true;

  return normalized(chapter.name).includes(query)
    || normalized(chapter.description).includes(query);
}

function SynopsisRow({ chapter, isActive, isContext = false, number, onSelect }) {
  const synopsis = chapter.description?.trim();

  return (
    <li className={`chapter-plan__item${number?.includes('.') ? ' chapter-plan__item--child' : ''}`}>
      <button
        type="button"
        className={`chapter-plan__row${isActive ? ' chapter-plan__row--active' : ''}${isContext ? ' chapter-plan__row--context' : ''}`}
        onClick={() => onSelect(chapter)}
        aria-label={`Otwórz ${number ? `rozdział ${number}: ` : 'szkic: '}${chapter.name}`}
      >
        <span className="chapter-plan__number" aria-hidden="true">{number || ''}</span>
        <span className="chapter-plan__summary">
          <span className="chapter-plan__title">
            {chapter.name}
            {isContext && <span className="chapter-plan__context-label">Kontekst</span>}
          </span>
          <span className={`chapter-plan__synopsis${synopsis ? '' : ' chapter-plan__synopsis--empty'}`}>
            {synopsis || 'Brak synopsisu'}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function ChapterSynopsisList({
  activeId,
  isLoading,
  loadError,
  onRetry,
  onSelect,
  structure,
}) {
  const [search, setSearch] = useState('');
  const query = normalized(search.trim());
  const filtered = useMemo(() => {
    const roots = structure.roots.flatMap((root) => {
      const rootMatches = matchesQuery(root.chapter, query);
      const children = root.children.filter((child) => matchesQuery(child.chapter, query));

      if (!rootMatches && children.length === 0) return [];

      return [{
        ...root,
        children: query ? children : root.children,
        isContext: Boolean(query && !rootMatches && children.length > 0),
      }];
    });
    const drafts = structure.drafts.flatMap((root) => {
      const rootMatches = matchesQuery(root.chapter, query);
      const children = root.children.filter((child) => matchesQuery(child.chapter, query));

      if (!rootMatches && children.length === 0) return [];

      return [{
        ...root,
        children: query ? children : root.children,
        isContext: Boolean(query && !rootMatches && children.length > 0),
      }];
    });

    return { drafts, roots };
  }, [query, structure.drafts, structure.roots]);
  const hasDocuments = structure.roots.length > 0 || structure.drafts.length > 0;
  const hasResults = filtered.roots.length > 0 || filtered.drafts.length > 0;

  return (
    <section className="chapter-plan" aria-label="Plan rozdziałów">
      <div className="chapter-plan__search">
        <label htmlFor="chapter-plan-search">Szukaj w planie</label>
        <div className="chapter-plan__search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            id="chapter-plan-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tytuł lub synopsis…"
            autoComplete="off"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Wyczyść wyszukiwanie" title="Wyczyść wyszukiwanie">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="chapter-plan__content">
        {isLoading && <div className="chapter-plan__state" role="status">Ładowanie planu rozdziałów…</div>}

        {!isLoading && loadError && (
          <div className="chapter-plan__state chapter-plan__state--error" role="alert">
            <strong>Nie udało się pobrać planu rozdziałów.</strong>
            <span>{loadError}</span>
            <button type="button" onClick={onRetry}>Spróbuj ponownie</button>
          </div>
        )}

        {!isLoading && !loadError && !hasDocuments && (
          <div className="chapter-plan__state">
            <strong>Brak dokumentów do pokazania.</strong>
            <span>Utwórz pierwszy rozdział lub szkic w panelu po lewej.</span>
          </div>
        )}

        {!isLoading && !loadError && hasDocuments && !hasResults && (
          <div className="chapter-plan__state" role="status">
            <strong>Brak wyników.</strong>
            <span>Nie znaleziono tytułu ani synopsisu pasującego do „{search.trim()}”.</span>
            <button type="button" onClick={() => setSearch('')}>Wyczyść wyszukiwanie</button>
          </div>
        )}

        {!isLoading && !loadError && hasResults && (
          <div className="chapter-plan__sections">
            {filtered.roots.length > 0 && (
              <section className="chapter-plan__section" aria-labelledby="chapter-plan-manuscript">
                <h2 id="chapter-plan-manuscript">Rozdziały</h2>
                <ul className="chapter-plan__list">
                  {filtered.roots.map((root) => (
                    <li key={root.chapter.id} className="chapter-plan__branch">
                      <ul className="chapter-plan__list">
                        <SynopsisRow
                          chapter={root.chapter}
                          isActive={Number(activeId) === Number(root.chapter.id)}
                          isContext={root.isContext}
                          number={root.number}
                          onSelect={onSelect}
                        />
                      </ul>
                      {root.children.length > 0 && (
                        <ul className="chapter-plan__list chapter-plan__children">
                          {root.children.map((child) => (
                            <SynopsisRow
                              key={child.chapter.id}
                              chapter={child.chapter}
                              isActive={Number(activeId) === Number(child.chapter.id)}
                              number={child.number}
                              onSelect={onSelect}
                            />
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {filtered.drafts.length > 0 && (
              <section className="chapter-plan__section chapter-plan__section--drafts" aria-labelledby="chapter-plan-drafts">
                <h2 id="chapter-plan-drafts">Szkice</h2>
                <ul className="chapter-plan__list">
                  {filtered.drafts.map((root) => (
                    <li key={root.chapter.id} className="chapter-plan__branch">
                      <ul className="chapter-plan__list">
                        <SynopsisRow
                          chapter={root.chapter}
                          isActive={Number(activeId) === Number(root.chapter.id)}
                          isContext={root.isContext}
                          number=""
                          onSelect={onSelect}
                        />
                      </ul>
                      {root.children.length > 0 && (
                        <ul className="chapter-plan__list chapter-plan__children">
                          {root.children.map((child) => (
                            <SynopsisRow
                              key={child.chapter.id}
                              chapter={child.chapter}
                              isActive={Number(activeId) === Number(child.chapter.id)}
                              number=""
                              onSelect={onSelect}
                            />
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
