function sourceUrl(source) {
  if (!source) return null;

  try {
    const url = new URL(source);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function InspirationSource({ expanded, source }) {
  const url = sourceUrl(source);
  const className = `inspiration-card__source${expanded ? ' inspiration-card__source--expanded' : ''}`;

  if (url) {
    return (
      <a
        className={className}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={source}
        onClick={(event) => event.stopPropagation()}
      >
        {source}
      </a>
    );
  }

  return <span className={className} title={source}>{source}</span>;
}

export default function InspirationCardPreview({ error, expanded, imageUrl, inspiration, onImageLoad }) {
  return (
    <div className="inspiration-card__preview">
      {imageUrl && (
        <div className="inspiration-card__image-wrap">
          <img
            src={imageUrl}
            alt={inspiration.title ? `Obraz inspiracji: ${inspiration.title}` : 'Obraz inspiracji'}
            onLoad={onImageLoad}
          />
          {inspiration.source && <InspirationSource source={inspiration.source} expanded={expanded} />}
        </div>
      )}
      {(inspiration.title || inspiration.content) && (
        <div className="inspiration-card__body">
          {inspiration.title && <h2>{inspiration.title}</h2>}
          {inspiration.content && <p>{inspiration.content}</p>}
        </div>
      )}
      {!imageUrl && inspiration.source && (
        <div className="inspiration-card__source-row">
          <InspirationSource source={inspiration.source} expanded={expanded} />
        </div>
      )}
      {error && <p className="inspiration-form__error" role="alert">{error}</p>}
    </div>
  );
}
