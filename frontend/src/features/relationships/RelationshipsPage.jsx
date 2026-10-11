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

  const sidebarContent = (controller) => {
    if (isTestMode) {
      return (
        <section className="relationship-workspace__section">
          <h2>Relacje</h2>
          <p className="relationship-workspace__notice">
            Dane scenariusza są tylko do odczytu. Formularz nie wysyła żądań do API.
          </p>
        </section>
      );
    }

    const showForm = crud.editingRelationshipId !== null
      || controller.relationshipCreationStage === 'form';

    return (
      <>
        {showForm ? (
          <RelationshipForm
            crud={crud}
            firstCharacterRef={firstCharacterRef}
            isGraphCreation={controller.relationshipCreationStage === 'form'}
            onCancel={controller.returnToTargetSelection}
            onSubmit={saveRelationship}
          />
        ) : null}
        <RelationshipListPanel crud={crud} onSelect={selectRelationshipFromList} />
      </>
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
