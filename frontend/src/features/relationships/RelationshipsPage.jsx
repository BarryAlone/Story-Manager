import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import useAuth from '../../useAuth';
import RelationshipForm from './RelationshipForm';
import RelationshipListPanel from './RelationshipListPanel';
import RelationshipWorkspace from './RelationshipWorkspace';
import SelectionDetails from './SelectionDetails';
import { DEV_SCENARIO_KEYS, SCENARIO_PARAM } from './relationshipConstants';
import useRelationshipCrud from './useRelationshipCrud';

export default function RelationshipsPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const workspaceRef = useRef(null);
  const isTestMode = import.meta.env.DEV
    && DEV_SCENARIO_KEYS.has(searchParams.get(SCENARIO_PARAM));
  const crud = useRelationshipCrud(projectId, isTestMode);

  const saveRelationship = async (event) => {
    const wasEditing = crud.editingRelationshipId !== null;
    const saved = await crud.save(event);
    if (!saved) return;
    if (wasEditing) workspaceRef.current?.collapseRelationshipEdit();
    else workspaceRef.current?.completeRelationshipCreation();
  };

  const deleteRelationship = async (relationshipId) => {
    const removed = await crud.remove(relationshipId);
    if (removed) workspaceRef.current?.completeRelationshipDeletion();
  };

  const cancelRelationshipEdit = () => {
    workspaceRef.current?.collapseRelationshipEdit();
  };

  const sidebarContent = (controller) => {
    if (controller.panelMode === 'list') {
      return (
        <RelationshipListPanel
          controller={controller}
          crud={crud}
          isReadOnly={isTestMode}
          onCancelEdit={cancelRelationshipEdit}
          onDelete={deleteRelationship}
          onSave={saveRelationship}
          showHeading={false}
        />
      );
    }

    if (controller.panelMode === 'form') {
      return (
        <RelationshipForm
          crud={crud}
          isGraphCreation
          onCancel={controller.returnToTargetSelection}
          onSubmit={saveRelationship}
          showHeading={false}
        />
      );
    }

    if (['character', 'selecting-target', 'relationship'].includes(controller.panelMode)) {
      return (
        <SelectionDetails
          controller={controller}
          crud={crud}
          isReadOnly={isTestMode}
          onCancelEdit={cancelRelationshipEdit}
          onDelete={deleteRelationship}
          onSave={saveRelationship}
          projectId={projectId}
        />
      );
    }

    return null;
  };

  return (
    <div className="relationship-page">
      <h1>Relacje postaci</h1>
      <RelationshipWorkspace
        ref={workspaceRef}
        dataRevision={crud.graphRevision}
        isRelationshipEditDirty={crud.hasUnsavedChanges}
        onBeginRelationship={crud.beginFromGraph}
        onCancelRelationshipEdit={crud.resetForm}
        onClearSelection={crud.resetForm}
        onSelectRelationshipTarget={crud.beginFromGraph}
        onSelectRelationship={crud.selectFromGraph}
        sidebarContent={sidebarContent}
        userId={user.id}
      />
    </div>
  );
}
