import { forwardRef, useImperativeHandle } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import RelationshipCanvas from './RelationshipCanvas';
import RelationshipLegend from './RelationshipLegend';
import RelationshipSidebar from './RelationshipSidebar';
import RelationshipToolbar from './RelationshipToolbar';
import { DEV_SCENARIO_KEYS, SCENARIO_PARAM } from './relationshipConstants';
import useRelationshipGraphController from './useRelationshipGraphController';
import useRelationshipGraphData from './useRelationshipGraphData';
import useGraphLayoutPersistence from './useGraphLayoutPersistence';
import './styles/relationshipWorkspace.css';
import './styles/relationshipGraph.css';

const RelationshipWorkspace = forwardRef(function RelationshipWorkspace(props, ref) {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedScenario = import.meta.env.DEV
    ? searchParams.get(SCENARIO_PARAM) || ''
    : '';
  const scenarioKey = import.meta.env.DEV && DEV_SCENARIO_KEYS.has(requestedScenario)
    ? requestedScenario
    : '';

  const handleScenarioChange = (event) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (event.target.value) nextSearchParams.set(SCENARIO_PARAM, event.target.value);
    else nextSearchParams.delete(SCENARIO_PARAM);
    setSearchParams(nextSearchParams, { replace: true });
  };

  return (
    <RelationshipWorkspaceContent
      key={`${props.userId}-${projectId}-${props.dataRevision}-${scenarioKey}`}
      ref={ref}
      {...props}
      projectId={projectId}
      scenarioKey={scenarioKey}
      onScenarioChange={handleScenarioChange}
    />
  );
});

const RelationshipWorkspaceContent = forwardRef(function RelationshipWorkspaceContent({
  dataRevision = 0,
  onClearSelection,
  onSelectRelationship,
  onScenarioChange,
  projectId,
  scenarioKey,
  sidebarContent,
  userId,
}, ref) {
  const loadState = useRelationshipGraphData(projectId, dataRevision, scenarioKey);
  const controller = useRelationshipGraphController({
    sourceGraphData: loadState.graphData,
    onClearSelection,
    onSelectRelationship,
  });
  const layoutPersistence = useGraphLayoutPersistence({
    canvasRef: controller.canvasRef,
    nodes: loadState.graphData.nodes,
    projectId,
    scenarioKey,
    userId,
  });

  useImperativeHandle(ref, () => ({
    selectLink: controller.selectLinkById,
  }), [controller.selectLinkById]);

  return (
    <section
      className={`relationship-workspace${controller.isExpanded ? ' relationship-workspace--expanded' : ''}${controller.isPanelOpen ? '' : ' relationship-workspace--panel-closed'}`}
      aria-label="Przestrzeń robocza relacji postaci"
    >
      <RelationshipSidebar
        controller={controller}
        layoutPersistence={layoutPersistence}
        projectId={projectId}
      >
        {sidebarContent}
      </RelationshipSidebar>

      <div className="relationship-graph">
        <RelationshipToolbar
          controller={controller}
          scenarioKey={scenarioKey}
          onScenarioChange={onScenarioChange}
        />
        <RelationshipLegend relationTypes={controller.visibleRelationTypes} />
        <RelationshipCanvas
          ref={controller.canvasRef}
          controller={controller}
          layoutPersistence={layoutPersistence}
          loadState={loadState}
        />
      </div>
    </section>
  );
});

export default RelationshipWorkspace;
