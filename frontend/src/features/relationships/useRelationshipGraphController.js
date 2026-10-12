import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInteractionHighlight,
  filterGraphData,
  graphEndpointId,
  listCharacterGroups,
  listRelationTypes,
} from './relationshipGraphData';

export default function useRelationshipGraphController({
  onBeginRelationship,
  sourceGraphData,
  onClearSelection,
  onSelectRelationshipTarget,
  onSelectRelationship,
}) {
  const canvasRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [relationTypeFilter, setRelationTypeFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [hoveredLinkId, setHoveredLinkId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [relationshipCreationStage, setRelationshipCreationStage] = useState('idle');
  const [relationshipSourceNodeId, setRelationshipSourceNodeId] = useState(null);
  const [relationshipTargetNodeId, setRelationshipTargetNodeId] = useState(null);

  const nodeById = useMemo(() => new Map(
    sourceGraphData.nodes.map((node) => [node.id, node]),
  ), [sourceGraphData.nodes]);
  const relationTypes = useMemo(
    () => listRelationTypes(sourceGraphData.links),
    [sourceGraphData.links],
  );
  const groups = useMemo(
    () => listCharacterGroups(sourceGraphData.nodes),
    [sourceGraphData.nodes],
  );
  const hasUngroupedCharacters = useMemo(
    () => sourceGraphData.nodes.some((node) => !node.groupName),
    [sourceGraphData.nodes],
  );
  const neighborFocusId = viewMode === 'neighbors' ? selectedNodeId : null;
  const visibleGraphData = useMemo(() => filterGraphData(sourceGraphData, {
    group: groupFilter,
    relationType: relationTypeFilter,
    neighborId: neighborFocusId,
  }), [groupFilter, neighborFocusId, relationTypeFilter, sourceGraphData]);
  const visibleRelationTypes = useMemo(() => {
    const visibleKeys = new Set(visibleGraphData.links.map((link) => link.typeKey));
    return relationTypes.filter((type) => visibleKeys.has(type.key));
  }, [relationTypes, visibleGraphData.links]);

  const selectedNode = selectedNodeId === null ? null : nodeById.get(selectedNodeId) || null;
  const selectedLink = useMemo(() => sourceGraphData.links.find((link) => (
    link.id === selectedLinkId
  )) || null, [selectedLinkId, sourceGraphData.links]);

  const selectedLinkSource = selectedLink
    ? nodeById.get(graphEndpointId(selectedLink.source)) || null
    : null;

  const selectedLinkTarget = selectedLink
    ? nodeById.get(graphEndpointId(selectedLink.target)) || null
    : null;

  const relationshipSourceNode = relationshipSourceNodeId === null
    ? null
    : nodeById.get(relationshipSourceNodeId) || null;
  const relationshipTargetNode = relationshipTargetNodeId === null
    ? null
    : nodeById.get(relationshipTargetNodeId) || null;

  const hoveredLink = hoveredLinkId === null
    ? null
    : visibleGraphData.links.find((link) => link.id === hoveredLinkId) || null;

  const hoveredLinkSource = hoveredLink
    ? nodeById.get(graphEndpointId(hoveredLink.source)) || null
    : null;

  const hoveredLinkTarget = hoveredLink
    ? nodeById.get(graphEndpointId(hoveredLink.target)) || null
    : null;

  const interactionHighlight = useMemo(() => buildInteractionHighlight(
    visibleGraphData.links,
    {
      hoveredLinkId,
      hoveredNodeId,
      selectedLinkId,
      selectedNodeId: relationshipCreationStage === 'idle' ? selectedNodeId : null,
    },
  ), [
    hoveredLinkId,
    hoveredNodeId,
    relationshipCreationStage,
    selectedLinkId,
    selectedNodeId,
    visibleGraphData.links,
  ]);

  const requestFitAfterLayout = useCallback(() => {
    setFitRequest((value) => value + 1);
  }, []);

  const resetRelationshipCreation = useCallback(() => {
    setRelationshipCreationStage('idle');
    setRelationshipSourceNodeId(null);
    setRelationshipTargetNodeId(null);
  }, []);

  const selectNode = useCallback((node, { center = false, resetFilters = false } = {}) => {
    if (resetFilters) {
      setRelationTypeFilter('');
      setGroupFilter('');
      setViewMode('all');
    }
    resetRelationshipCreation();
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    setSearchQuery(node.name);
    setIsPanelOpen(true);
    onClearSelection?.();

    if (center) window.requestAnimationFrame(() => canvasRef.current?.centerNode(node));
  }, [onClearSelection, resetRelationshipCreation]);

  const showNode = useCallback((node, options = {}) => {
    selectNode(node, { ...options, center: true });
  }, [selectNode]);

  const beginRelationshipCreation = useCallback((node) => {
    if (!node || node.synthetic) return;
    setRelationshipCreationStage('selecting-target');
    setRelationshipSourceNodeId(node.id);
    setRelationshipTargetNodeId(null);
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    setSearchQuery(node.name);
    setIsPanelOpen(true);
    onBeginRelationship?.(node);
  }, [onBeginRelationship]);

  const cancelTargetSelection = useCallback(() => {
    setRelationshipCreationStage('idle');
    setRelationshipSourceNodeId(null);
    setRelationshipTargetNodeId(null);
    onClearSelection?.();
  }, [onClearSelection]);

  const returnToTargetSelection = useCallback(() => {
    if (!relationshipSourceNode) return;
    setRelationshipCreationStage('selecting-target');
    setRelationshipTargetNodeId(null);
    onBeginRelationship?.(relationshipSourceNode);
  }, [onBeginRelationship, relationshipSourceNode]);

  const completeRelationshipCreation = useCallback(() => {
    setRelationshipCreationStage('idle');
    setRelationshipSourceNodeId(null);
    setRelationshipTargetNodeId(null);
  }, []);

  const handleNodeClick = useCallback((node) => {
    if (relationshipCreationStage === 'selecting-target') {
      if (node.id === relationshipSourceNodeId) {
        cancelTargetSelection();
        return;
      }
      if (!relationshipSourceNode || node.synthetic) return;

      setRelationshipCreationStage('form');
      setRelationshipTargetNodeId(node.id);
      setIsPanelOpen(true);
      onSelectRelationshipTarget?.(relationshipSourceNode, node);
      return;
    }

    if (relationshipCreationStage === 'form') return;

    if (selectedNodeId === node.id) {
      beginRelationshipCreation(node);
      return;
    }

    selectNode(node);
  }, [
    beginRelationshipCreation,
    cancelTargetSelection,
    onSelectRelationshipTarget,
    relationshipCreationStage,
    relationshipSourceNode,
    relationshipSourceNodeId,
    selectNode,
    selectedNodeId,
  ]);

  const clearSelection = useCallback(() => {
    resetRelationshipCreation();
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setHoveredNodeId(null);
    setHoveredLinkId(null);
    setSearchQuery('');
    setViewMode('all');
    onClearSelection?.();
  }, [onClearSelection, resetRelationshipCreation]);

  const selectRelationship = useCallback((link) => {
    resetRelationshipCreation();
    setSelectedNodeId(null);
    setSelectedLinkId(link.id);
    setSearchQuery('');
    setIsPanelOpen(true);
    window.requestAnimationFrame(() => canvasRef.current?.centerLink(link, nodeById));
    onSelectRelationship?.(link);
  }, [nodeById, onSelectRelationship, resetRelationshipCreation]);

  const selectLinkById = useCallback((linkId) => {
    const link = sourceGraphData.links.find((candidate) => candidate.id === linkId);
    if (!link) return;
    setRelationTypeFilter('');
    setGroupFilter('');
    setViewMode('all');
    selectRelationship(link);
  }, [selectRelationship, sourceGraphData.links]);

  const clearFilters = () => {
    setRelationTypeFilter('');
    setGroupFilter('');
    clearSelection();
  };

  const showNeighbors = () => {
    if (!selectedNode) return;
    setViewMode('neighbors');
    requestFitAfterLayout();
  };

  const togglePanel = () => setIsPanelOpen((open) => !open);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isExpanded) document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      if (relationshipCreationStage === 'form') {
        returnToTargetSelection();
      } else if (relationshipCreationStage === 'selecting-target') {
        cancelTargetSelection();
      } else if (selectedNodeId !== null || selectedLinkId !== null) {
        clearSelection();
      } else if (isExpanded && isPanelOpen) {
        setIsPanelOpen(false);
      } else if (isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [
    cancelTargetSelection,
    clearSelection,
    isExpanded,
    isPanelOpen,
    relationshipCreationStage,
    returnToTargetSelection,
    selectedLinkId,
    selectedNodeId,
  ]);

  return {
    canvasRef,
    sourceGraphData,
    visibleGraphData,
    nodeById,
    relationTypes,
    groups,
    hasUngroupedCharacters,
    visibleRelationTypes,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    relationTypeFilter,
    setRelationTypeFilter,
    groupFilter,
    setGroupFilter,
    selectedNodeId,
    selectedNode,
    selectedLinkId,
    selectedLink,
    selectedLinkSource,
    selectedLinkTarget,
    relationshipCreationStage,
    relationshipSourceNodeId,
    relationshipSourceNode,
    relationshipTargetNodeId,
    relationshipTargetNode,
    hoveredNodeId,
    setHoveredNodeId,
    hoveredLinkId,
    setHoveredLinkId,
    hoveredLink,
    hoveredLinkSource,
    hoveredLinkTarget,
    interactionHighlight,
    isPanelOpen,
    isExpanded,
    setIsExpanded,
    fitRequest,
    hasActiveFilters: Boolean(
      searchQuery || relationTypeFilter || groupFilter || viewMode !== 'all'
    ),
    selectNode,
    showNode,
    handleNodeClick,
    cancelTargetSelection,
    returnToTargetSelection,
    completeRelationshipCreation,
    clearSelection,
    selectRelationship,
    selectLinkById,
    clearFilters,
    showNeighbors,
    togglePanel,
  };
}
