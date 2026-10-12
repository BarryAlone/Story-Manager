import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import useAuth from '../../useAuth';
import RelationshipForm from './RelationshipForm';
import RelationshipListPanel from './RelationshipListPanel';
import RelationshipWorkspace from './RelationshipWorkspace';
import { DEV_SCENARIO_KEYS, SCENARIO_PARAM } from './relationshipConstants';
import useRelationshipCrud from './useRelationshipCrud';

export default function RelationshipsPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const workspaceRef = useRef(null);
  const firstCharacterRef = useRef(null);
  const isTestMode = import.meta.env.DEV
    && DEV_SCENARIO_KEYS.has(searchParams.get(SCENARIO_PARAM));
  const crud = useRelationshipCrud(projectId, isTestMode, firstCharacterRef);

  const selectRelationshipFromList = (relationship) => {
    crud.beginEdit(relationship);
    workspaceRef.current?.selectLink(relationship.id);
  };

  const saveRelationship = async (event) => {
    const saved = await crud.save(event);
    if (saved) workspaceRef.current?.completeRelationshipCreation();
  };

  const deleteRelationship = async (relationshipId) => {
    const removed = await crud.remove(relationshipId);
    if (removed) workspaceRef.current?.clearSelection();
  };

  const sidebarContent = (controller) => {
    if (controller.panelMode === 'list') {
      return (
        <RelationshipListPanel
          controller={controller}
          crud={crud}
          isReadOnly={isTestMode}
          onSelect={selectRelationshipFromList}
          showHeading={false}
        />
      );
    }

    if (isTestMode) return null;

    const showForm = controller.panelMode === 'form'
      || (controller.panelMode === 'relationship' && crud.editingRelationshipId !== null);

    if (!showForm) return null;
    return (
      <RelationshipForm
        crud={crud}
        firstCharacterRef={firstCharacterRef}
        isGraphCreation={controller.panelMode === 'form'}
        onCancel={controller.returnToTargetSelection}
        onDelete={deleteRelationship}
        onSubmit={saveRelationship}
        showHeading={false}
      />
    );
  };

  return (
    <div className="relationship-page">
      <h1>Relacje postaci</h1>
      <RelationshipWorkspace
        ref={workspaceRef}
        dataRevision={crud.graphRevision}
        onBeginRelationship={crud.beginFromGraph}
        onClearSelection={crud.resetForm}
        onSelectRelationshipTarget={crud.beginFromGraph}
        onSelectRelationship={crud.selectFromGraph}
        sidebarContent={sidebarContent}
        userId={user.id}
      />
    </div>
  );
}
