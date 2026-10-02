import { useState } from 'react';
import { Link } from 'react-router-dom';
import { relationColor } from './relationshipGraphData';

function CharacterAvatar({ node }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (node.imageUrl && !imageFailed) {
    return (
      <img
        className="relationship-graph__panel-avatar"
        src={node.imageUrl}
        alt=""
        onError={() => setImageFailed(true)}
      />
    );
  }
  return (
    <span
      className="relationship-graph__panel-avatar relationship-graph__panel-avatar--fallback"
      style={{ backgroundColor: relationColor(`character-${node.id}`) }}
      aria-hidden="true"
    >
      {node.initials}
    </span>
  );
}

export default function SelectionDetails({ controller, projectId }) {
  if (controller.selectedNode) {
    const node = controller.selectedNode;
    return (
      <section className="relationship-workspace__section relationship-graph__details" aria-label="Wybrana postać">
        <CharacterAvatar key={`${node.id}-${node.imageUrl}`} node={node} />
        <div className="relationship-graph__details-content">
          <span className="relationship-graph__details-eyebrow">Wybrana postać</span>
          <strong>{node.name}</strong>
          <span>{node.groupName || 'Bez przypisanej grupy'}</span>
          {node.description ? <p>{node.description}</p> : null}
        </div>
        <div className="relationship-graph__details-actions">
          {node.synthetic ? (
            <span className="relationship-graph__readonly">Dane testowe — tylko odczyt</span>
          ) : (
            <Link to={`/project/${projectId}/characters/${node.id}`}>Edytuj postać</Link>
          )}
          <button type="button" onClick={controller.clearSelection}>Wyczyść wybór</button>
        </div>
      </section>
    );
  }

  if (controller.selectedLink && controller.selectedLinkSource && controller.selectedLinkTarget) {
    const link = controller.selectedLink;
    return (
      <section className="relationship-workspace__section relationship-graph__details" aria-label="Wybrana relacja">
        <span className="relationship-graph__details-eyebrow">Wybrana relacja</span>
        <div className="relationship-graph__selected-relation">
          <span className="relationship-graph__details-relation" style={{ backgroundColor: link.color }} aria-hidden="true" />
          <div className="relationship-graph__details-content">
            <strong>{link.label}</strong>
            <span>{controller.selectedLinkSource.name} ↔ {controller.selectedLinkTarget.name}</span>
          </div>
        </div>
        <span className="relationship-graph__readonly">
          {link.synthetic
            ? 'Dane testowe — tylko odczyt'
            : 'Relacja jest wczytana do formularza poniżej.'}
        </span>
        <div className="relationship-graph__details-actions">
          <button type="button" onClick={controller.clearSelection}>Wyczyść wybór</button>
        </div>
      </section>
    );
  }

  return null;
}
