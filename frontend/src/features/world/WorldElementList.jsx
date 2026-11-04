import { backendUrl } from '../../api';

export default function WorldElementList({ elements }) {
  return (
    <div className="world-element-grid" aria-label="Elementy wybranej kategorii">
      {elements.map((element) => {
        const imageUrl = element.image_path
          ? backendUrl(`/storage/${element.image_path.replace(/^\/+/, '')}`)
          : null;

        return (
          <article key={element.id} className="world-element-card">
            {imageUrl && (
              <img src={imageUrl} alt={`Obraz elementu: ${element.name}`} />
            )}
            <div className="world-element-card__body">
              <h3 title={element.name}>{element.name}</h3>
              {element.description
                ? <p>{element.description}</p>
                : <p className="world-element-card__empty">Brak opisu</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
