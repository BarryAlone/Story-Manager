import { useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import RelationshipForm from './RelationshipForm';
import RelationshipListPanel from './RelationshipListPanel';
import RelationshipWorkspace from './RelationshipWorkspace';
import { DEV_SCENARIO_KEYS, SCENARIO_PARAM } from './relationshipConstants';
import useRelationshipCrud from './useRelationshipCrud';

export default function RelationshipsPage() {
  const { projectId } = useParams();
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

  const sidebarContent = isTestMode ? (
    <section className="relationship-workspace__section">
      <h2>Relacje</h2>
      <p className="relationship-workspace__notice">
        Dane scenariusza są tylko do odczytu. Formularz nie wysyła żądań do API.
      </p>
    </section>
  ) : (
    <>
      <RelationshipForm crud={crud} firstCharacterRef={firstCharacterRef} />
      <RelationshipListPanel crud={crud} onSelect={selectRelationshipFromList} />
    </>
  );

  return (
    <div className="relationship-page">
      <h1>Relacje postaci</h1>
      <RelationshipWorkspace
        ref={workspaceRef}
        dataRevision={crud.graphRevision}
        onClearSelection={crud.resetForm}
        onSelectRelationship={crud.selectFromGraph}
        sidebarContent={sidebarContent}
      />
    </div>
  );
}
