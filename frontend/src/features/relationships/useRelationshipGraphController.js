import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInteractionHighlight,
  filterGraphData,
  graphEndpointId,
  listCharacterGroups,
  listRelationTypes,
} from './relationshipGraphData';

export default function useRelationshipGraphController({
  sourceGraphData,
  onClearSelection,
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
    { hoveredLinkId, hoveredNodeId, selectedLinkId, selectedNodeId },
  ), [hoveredLinkId, hoveredNodeId, selectedLinkId, selectedNodeId, visibleGraphData.links]);

  useEffect(() => {
    if (!isExpanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (isPanelOpen) setIsPanelOpen(false);
      else setIsExpanded(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded, isPanelOpen]);

  const requestFitAfterLayout = useCallback(() => {
    setFitRequest((value) => value + 1);
  }, []);

  const selectNode = useCallback((node, { resetFilters = false } = {}) => {
    if (resetFilters) {
      setRelationTypeFilter('');
      setGroupFilter('');
      setViewMode('all');
    }
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    setSearchQuery(node.name);
    setIsPanelOpen(true);
    onClearSelection?.();

    if (!resetFilters && viewMode === 'neighbors') requestFitAfterLayout();
    else window.requestAnimationFrame(() => canvasRef.current?.centerNode(node));
  }, [onClearSelection, requestFitAfterLayout, viewMode]);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setHoveredNodeId(null);
    setHoveredLinkId(null);
    setSearchQuery('');
    setViewMode('all');
    onClearSelection?.();
  }, [onClearSelection]);

  const selectRelationship = useCallback((link) => {
    setSelectedNodeId(null);
    setSelectedLinkId(link.id);
    setSearchQuery('');
    setIsPanelOpen(true);
    window.requestAnimationFrame(() => canvasRef.current?.centerLink(link, nodeById));
    onSelectRelationship?.(link);
  }, [nodeById, onSelectRelationship]);

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

  const togglePanel = () => {
    if (viewMode === 'neighbors') requestFitAfterLayout();
    setIsPanelOpen((open) => !open);
  };

  const closePanel = () => {
    if (viewMode === 'neighbors') requestFitAfterLayout();
    setIsPanelOpen(false);
  };

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
    clearSelection,
    selectRelationship,
    selectLinkById,
    clearFilters,
    showNeighbors,
    togglePanel,
    closePanel,
  };
}
