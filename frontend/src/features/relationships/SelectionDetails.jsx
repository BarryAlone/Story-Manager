import { useState } from 'react';
import { Link } from 'react-router-dom';
import RelationshipCard from './RelationshipCard';
import { graphEndpointId, relationColor } from './relationshipGraphData';

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

export default function SelectionDetails({
  controller,
  crud,
  isReadOnly,
  onCancelEdit,
  onDelete,
  onSave,
  projectId,
}) {
  if (controller.selectedNode) {
    const node = controller.selectedNode;
    const isSelectingTarget = controller.relationshipCreationStage === 'selecting-target';
    const isCompletingForm = controller.relationshipCreationStage === 'form';
    return (
      <section className="relationship-workspace__section relationship-graph__details" aria-label="Wybrana postać">
        <div className="relationship-graph__character-header">
          <CharacterAvatar key={`${node.id}-${node.imageUrl}`} node={node} />
          <div className="relationship-graph__details-content">
            <strong>{node.name}</strong>
            {node.groupName ? <span>{node.groupName}</span> : null}
          </div>
        </div>
        {isSelectingTarget ? (
          <p className="relationship-workspace__notice" aria-live="polite">
            Wybierz postać, którą chcesz powiązać z {node.name}.
          </p>
        ) : null}
        {isSelectingTarget && controller.duplicateRelationship ? (
          <p className="relationship-workspace__notice relationship-workspace__notice--warning" role="status">
            Relacja z {controller.draftTargetNode?.name || 'tą postacią'} już istnieje.
            Istniejąca linia została wyróżniona na grafie.
          </p>
        ) : null}
        {isCompletingForm && controller.relationshipTargetNode ? (
          <p className="relationship-workspace__notice" aria-live="polite">
            Wybrano {controller.relationshipTargetNode.name}. Uzupełnij typ relacji i zatwierdź formularz.
          </p>
        ) : null}
        {!node.synthetic && controller.relationshipCreationStage === 'idle' ? (
          <p className="relationship-graph__hint">
            Kliknij postać ponownie, aby utworzyć relację.
          </p>
        ) : null}
        {controller.relationshipCreationStage === 'idle' ? (
          <CharacterRelationships
            controller={controller}
            crud={crud}
            isReadOnly={isReadOnly}
            node={node}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onSave={onSave}
          />
        ) : null}
        <div className="relationship-graph__details-actions">
          {node.synthetic ? (
            <span className="relationship-graph__readonly">Dane testowe — tylko odczyt</span>
          ) : (
            <Link
              to={`/project/${projectId}/characters/${node.id}`}
              aria-disabled={controller.isRelationshipEditDirty}
              onClick={(event) => {
                if (controller.isRelationshipEditDirty) event.preventDefault();
              }}
            >
              Edytuj postać
            </Link>
          )}
          {isSelectingTarget ? (
            <button type="button" onClick={controller.cancelTargetSelection}>Anuluj wybór relacji</button>
          ) : null}
          {!isCompletingForm ? (
            <button
              type="button"
              disabled={controller.isRelationshipEditDirty}
              onClick={controller.clearSelection}
            >
              Wyczyść wybór
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (controller.selectedLink && controller.selectedLinkSource && controller.selectedLinkTarget) {
    const link = controller.selectedLink;
    return (
      <section className="relationship-workspace__section" aria-label="Wybrana relacja">
        <RelationshipCard
          relationship={link}
          source={controller.selectedLinkSource}
          target={controller.selectedLinkTarget}
          fieldError={crud.fieldErrors.relation_name?.[0]}
          formError={crud.formError}
          isDeleting={crud.isDeleting}
          isExpanded={controller.expandedRelationshipId !== null}
          isReadOnly={link.synthetic}
          isSaving={crud.isSaving}
          nameDraft={crud.relationshipType}
          onExpand={() => controller.openRelationshipCard(link, 'relationship')}
          onNameChange={crud.setRelationshipType}
          onCancel={onCancelEdit}
          onDelete={() => onDelete(link.id)}
          onSave={onSave}
        />
      </section>
    );
  }

  return null;
}

function CharacterRelationships({
  controller,
  crud,
  isReadOnly,
  node,
  onCancelEdit,
  onDelete,
  onSave,
}) {
  const relationships = controller.sourceGraphData.links.filter((link) => (
    graphEndpointId(link.source) === node.id || graphEndpointId(link.target) === node.id
  ));

  return (
    <div className="relationship-graph__character-relations">
      <h3>Relacje postaci</h3>
      {relationships.length === 0 ? (
        <p className="relationship-workspace__empty">Ta postać nie ma jeszcze relacji.</p>
      ) : (
        <ul className="relationship-workspace__relationship-list">
          {relationships.map((relationship) => {
            const sourceId = graphEndpointId(relationship.source);
            const sourceNode = controller.nodeById.get(sourceId);
            const targetNode = controller.nodeById.get(graphEndpointId(relationship.target));
            const isExpanded = String(relationship.id) === String(controller.expandedRelationshipId);
            return (
              <li key={relationship.id}>
                <RelationshipCard
                  relationship={relationship}
                  source={sourceNode}
                  target={targetNode}
                  contextCharacterId={node.id}
                  disabled={controller.isRelationshipEditDirty && !isExpanded}
                  fieldError={crud.fieldErrors.relation_name?.[0]}
                  formError={crud.formError}
                  isDeleting={crud.isDeleting}
                  isExpanded={isExpanded}
                  isReadOnly={isReadOnly}
                  isSaving={crud.isSaving}
                  nameDraft={crud.relationshipType}
                  onExpand={() => controller.openRelationshipCard(relationship, 'character')}
                  onNameChange={crud.setRelationshipType}
                  onCancel={onCancelEdit}
                  onDelete={() => onDelete(relationship.id)}
                  onSave={onSave}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
