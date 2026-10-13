import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildInteractionHighlight,
  filterGraphData,
  graphEndpointId,
  listCharacterGroups,
  listRelationTypes,
} from './relationshipGraphData';

function findRelationshipBetween(links, firstNodeId, secondNodeId) {
  if (firstNodeId === null || secondNodeId === null || firstNodeId === secondNodeId) return null;
  return links.find((link) => {
    const sourceId = graphEndpointId(link.source);
    const targetId = graphEndpointId(link.target);
    return (sourceId === firstNodeId && targetId === secondNodeId)
      || (sourceId === secondNodeId && targetId === firstNodeId);
  }) || null;
}

export default function useRelationshipGraphController({
  isRelationshipEditDirty = false,
  onBeginRelationship,
  onCancelRelationshipEdit,
  sourceGraphData,
  onClearSelection,
  onSelectRelationshipTarget,
  onSelectRelationship,
}) {
  const canvasRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [selectedRelationTypes, setSelectedRelationTypes] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [hoveredLinkId, setHoveredLinkId] = useState(null);
  const [panelMode, setPanelMode] = useState('closed');
  const [isExpanded, setIsExpanded] = useState(false);
  const [fitRequest, setFitRequest] = useState(0);
  const [relationshipCreationStage, setRelationshipCreationStage] = useState('idle');
  const [relationshipSourceNodeId, setRelationshipSourceNodeId] = useState(null);
  const [relationshipTargetNodeId, setRelationshipTargetNodeId] = useState(null);
  const [expandedRelationshipId, setExpandedRelationshipId] = useState(null);

  const nodeById = useMemo(() => new Map(
    sourceGraphData.nodes.map((node) => [node.id, node]),
  ), [sourceGraphData.nodes]);
  const relationTypes = useMemo(
    () => listRelationTypes(sourceGraphData.links),
    [sourceGraphData.links],
  );
  const validSelectedRelationTypes = useMemo(() => {
    const existingTypeKeys = new Set(relationTypes.map((type) => type.key));
    return selectedRelationTypes.filter((typeKey) => existingTypeKeys.has(typeKey));
  }, [relationTypes, selectedRelationTypes]);
  const groups = useMemo(
    () => listCharacterGroups(sourceGraphData.nodes),
    [sourceGraphData.nodes],
  );
  const hasUngroupedCharacters = useMemo(
    () => sourceGraphData.nodes.some((node) => !node.groupName),
    [sourceGraphData.nodes],
  );
  const effectiveViewMode = viewMode === 'neighbors' && nodeById.has(selectedNodeId)
    ? 'neighbors'
    : 'all';
  const neighborFocusId = effectiveViewMode === 'neighbors' ? selectedNodeId : null;
  const graphDataBeforeTypeFilter = useMemo(() => filterGraphData(sourceGraphData, {
    group: groupFilter,
    relationTypes: [],
    neighborId: neighborFocusId,
  }), [groupFilter, neighborFocusId, sourceGraphData]);
  const availableRelationTypes = useMemo(() => {
    const availableTypeKeys = new Set(
      graphDataBeforeTypeFilter.links.map((link) => link.typeKey),
    );
    return relationTypes.filter((type) => (
      availableTypeKeys.has(type.key) || validSelectedRelationTypes.includes(type.key)
    ));
  }, [graphDataBeforeTypeFilter.links, relationTypes, validSelectedRelationTypes]);
  const visibleGraphData = useMemo(() => filterGraphData(sourceGraphData, {
    group: groupFilter,
    relationTypes: validSelectedRelationTypes,
    neighborId: neighborFocusId,
  }), [groupFilter, neighborFocusId, validSelectedRelationTypes, sourceGraphData]);

  const selectedNode = selectedNodeId === null ? null : nodeById.get(selectedNodeId) || null;
  const selectedLink = useMemo(() => sourceGraphData.links.find((link) => (
    String(link.id) === String(selectedLinkId)
  )) || null, [selectedLinkId, sourceGraphData.links]);
  const isRelationshipFormActive = relationshipCreationStage === 'form'
    || Boolean(expandedRelationshipId !== null && selectedLink && !selectedLink.synthetic);
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

  const draftTargetNodeId = relationshipCreationStage === 'form'
    ? relationshipTargetNodeId
    : (relationshipTargetNodeId ?? hoveredNodeId);
  const draftTargetNode = draftTargetNodeId === null
    ? null
    : nodeById.get(draftTargetNodeId) || null;
  const duplicateRelationship = useMemo(() => findRelationshipBetween(
    sourceGraphData.links,
    relationshipSourceNodeId,
    draftTargetNodeId,
  ), [draftTargetNodeId, relationshipSourceNodeId, sourceGraphData.links]);
  const draftRelationship = relationshipCreationStage !== 'idle'
    && relationshipSourceNode
    && draftTargetNode
    && relationshipSourceNode.id !== draftTargetNode.id
    && !duplicateRelationship
    ? { source: relationshipSourceNode, target: draftTargetNode }
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
    {
      hoveredLinkId,
      hoveredNodeId,
      selectedLinkId: duplicateRelationship?.id ?? selectedLinkId,
      selectedNodeId: relationshipCreationStage === 'idle' ? selectedNodeId : null,
    },
  ), [
    duplicateRelationship,
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
    if (relationshipCreationStage === 'form' || isRelationshipEditDirty) return;
    if (resetFilters) {
      setSelectedRelationTypes([]);
      setGroupFilter('');
      setViewMode('all');
    }
    resetRelationshipCreation();
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    setExpandedRelationshipId(null);
    setSearchQuery(node.name);
    setPanelMode('character');
    onClearSelection?.();

    if (center) window.requestAnimationFrame(() => canvasRef.current?.centerNode(node));
  }, [isRelationshipEditDirty, onClearSelection, relationshipCreationStage, resetRelationshipCreation]);

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
    setExpandedRelationshipId(null);
    setSearchQuery(node.name);
    setPanelMode('selecting-target');
    onBeginRelationship?.(node);
  }, [onBeginRelationship]);

  const cancelTargetSelection = useCallback(() => {
    setRelationshipCreationStage('idle');
    setRelationshipSourceNodeId(null);
    setRelationshipTargetNodeId(null);
    setSelectedLinkId(null);
    setExpandedRelationshipId(null);
    setPanelMode('character');
    onClearSelection?.();
  }, [onClearSelection]);

  const returnToTargetSelection = useCallback(() => {
    if (!relationshipSourceNode) return;
    setRelationshipCreationStage('selecting-target');
    setRelationshipTargetNodeId(null);
    setSelectedLinkId(null);
    setExpandedRelationshipId(null);
    setPanelMode('selecting-target');
    onBeginRelationship?.(relationshipSourceNode);
  }, [onBeginRelationship, relationshipSourceNode]);

  const completeRelationshipCreation = useCallback(() => {
    setRelationshipCreationStage('idle');
    setRelationshipSourceNodeId(null);
    setRelationshipTargetNodeId(null);
    setPanelMode('character');
  }, []);

  const handleNodeClick = useCallback((node) => {
    if (isRelationshipEditDirty) return;
    if (relationshipCreationStage === 'selecting-target') {
      if (node.id === relationshipSourceNodeId) {
        cancelTargetSelection();
        return;
      }
      if (!relationshipSourceNode || node.synthetic) return;

      const existingRelationship = findRelationshipBetween(
        sourceGraphData.links,
        relationshipSourceNode.id,
        node.id,
      );
      if (existingRelationship) {
        setRelationshipTargetNodeId(node.id);
        return;
      }

      setRelationshipCreationStage('form');
      setRelationshipTargetNodeId(node.id);
      setPanelMode('form');
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
    isRelationshipEditDirty,
    onSelectRelationshipTarget,
    relationshipCreationStage,
    relationshipSourceNode,
    relationshipSourceNodeId,
    selectNode,
    selectedNodeId,
    sourceGraphData.links,
  ]);

  const clearSelection = useCallback(() => {
    resetRelationshipCreation();
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setExpandedRelationshipId(null);
    setHoveredNodeId(null);
    setHoveredLinkId(null);
    setSearchQuery('');
    setViewMode('all');
    setPanelMode('closed');
    onClearSelection?.();
  }, [onClearSelection, resetRelationshipCreation]);

  const openRelationshipCard = useCallback((link, nextPanelMode = 'relationship', { center = false } = {}) => {
    if (relationshipCreationStage === 'form') return;
    if (String(expandedRelationshipId) === String(link.id)) return;
    if (isRelationshipEditDirty && String(expandedRelationshipId) !== String(link.id)) return;
    if (!link.synthetic && onSelectRelationship?.(link) === false) return;
    resetRelationshipCreation();
    if (nextPanelMode !== 'character') {
      setSelectedNodeId(null);
      setViewMode('all');
    }
    setSelectedLinkId(link.id);
    setExpandedRelationshipId(link.id);
    setSearchQuery('');
    setPanelMode(nextPanelMode);
    if (center) window.requestAnimationFrame(() => canvasRef.current?.centerLink(link, nodeById));
  }, [
    expandedRelationshipId,
    isRelationshipEditDirty,
    nodeById,
    onSelectRelationship,
    relationshipCreationStage,
    resetRelationshipCreation,
  ]);

  const selectRelationship = useCallback((link, options = {}) => {
    openRelationshipCard(link, 'relationship', options);
  }, [openRelationshipCard]);

  const collapseRelationshipCard = useCallback(() => {
    onCancelRelationshipEdit?.();
    setExpandedRelationshipId(null);
    if (panelMode !== 'relationship') setSelectedLinkId(null);
  }, [onCancelRelationshipEdit, panelMode]);

  const completeRelationshipDeletion = useCallback(() => {
    onCancelRelationshipEdit?.();
    setExpandedRelationshipId(null);
    setSelectedLinkId(null);
    if (panelMode === 'relationship') setPanelMode('list');
  }, [onCancelRelationshipEdit, panelMode]);

  const selectLinkById = useCallback((linkId, options = {}) => {
    const link = sourceGraphData.links.find((candidate) => (
      String(candidate.id) === String(linkId)
    ));
    if (!link) return;
    setSelectedRelationTypes([]);
    setGroupFilter('');
    setViewMode('all');
    openRelationshipCard(
      link,
      options.panelMode || 'relationship',
      { center: options.center ?? true },
    );
  }, [openRelationshipCard, sourceGraphData.links]);

  const clearFilters = () => {
    if (relationshipCreationStage === 'form') return;
    setSelectedRelationTypes([]);
    setGroupFilter('');
    setSearchQuery('');
    setViewMode('all');
  };

  const toggleRelationType = useCallback((typeKey) => {
    if (isRelationshipFormActive) return;
    const existingTypeKeys = new Set(relationTypes.map((type) => type.key));
    setSelectedRelationTypes((currentTypes) => {
      const validCurrentTypes = currentTypes.filter((key) => existingTypeKeys.has(key));
      return validCurrentTypes.includes(typeKey)
        ? validCurrentTypes.filter((key) => key !== typeKey)
        : [...validCurrentTypes, typeKey];
    });
  }, [isRelationshipFormActive, relationTypes]);

  const showNeighbors = () => {
    if (!selectedNode) return;
    setViewMode('neighbors');
    requestFitAfterLayout();
  };

  const closePanel = useCallback(() => {
    if (isRelationshipEditDirty) return;
    if (relationshipCreationStage !== 'idle') {
      resetRelationshipCreation();
      setSelectedLinkId(null);
      onClearSelection?.();
    }
    if (expandedRelationshipId !== null) {
      setExpandedRelationshipId(null);
      onCancelRelationshipEdit?.();
    }
    setPanelMode('closed');
  }, [
    expandedRelationshipId,
    isRelationshipEditDirty,
    onCancelRelationshipEdit,
    onClearSelection,
    relationshipCreationStage,
    resetRelationshipCreation,
  ]);

  const showRelationshipList = useCallback(() => {
    if (isRelationshipFormActive) return;
    resetRelationshipCreation();
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setExpandedRelationshipId(null);
    setViewMode('all');
    setPanelMode('list');
    onClearSelection?.();
  }, [isRelationshipFormActive, onClearSelection, resetRelationshipCreation]);

  const togglePanel = () => {
    if (isRelationshipEditDirty) return;
    if (panelMode !== 'closed') {
      closePanel();
      return;
    }
    if (selectedLinkId !== null) setPanelMode('relationship');
    else if (selectedNodeId !== null) setPanelMode('character');
    else setPanelMode('list');
  };

  const handleNodeHover = (node) => {
    setHoveredNodeId(node?.id ?? null);
    if (node) setHoveredLinkId(null);
    if (relationshipCreationStage === 'selecting-target' && node) {
      setRelationshipTargetNodeId(null);
    }
  };

  const handleLinkHover = (link) => {
    setHoveredLinkId(link?.id ?? null);
    if (link) setHoveredNodeId(null);
  };

  const handleBackgroundClick = () => {
    if (relationshipCreationStage === 'form' || isRelationshipEditDirty) return;
    clearSelection();
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isExpanded) document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      if (relationshipCreationStage === 'form') {
        returnToTargetSelection();
      } else if (relationshipCreationStage === 'selecting-target') {
        cancelTargetSelection();
      } else if (expandedRelationshipId !== null) {
        collapseRelationshipCard();
      } else if (selectedNodeId !== null || selectedLinkId !== null) {
        clearSelection();
      } else if (panelMode === 'list') {
        closePanel();
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
    closePanel,
    collapseRelationshipCard,
    expandedRelationshipId,
    isExpanded,
    panelMode,
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
    availableRelationTypes,
    searchQuery,
    setSearchQuery,
    viewMode: effectiveViewMode,
    setViewMode,
    selectedRelationTypes: validSelectedRelationTypes,
    toggleRelationType,
    groupFilter,
    setGroupFilter,
    selectedNodeId,
    selectedNode,
    selectedLinkId,
    selectedLink,
    expandedRelationshipId,
    selectedLinkSource,
    selectedLinkTarget,
    relationshipCreationStage,
    relationshipSourceNodeId,
    relationshipSourceNode,
    relationshipTargetNodeId,
    relationshipTargetNode,
    hoveredNodeId,
    hoveredLinkId,
    setHoveredLinkId,
    hoveredLink,
    hoveredLinkSource,
    hoveredLinkTarget,
    interactionHighlight,
    panelMode,
    isPanelOpen: panelMode !== 'closed',
    isRelationshipFormActive,
    isRelationshipEditDirty,
    isExpanded,
    setIsExpanded,
    fitRequest,
    draftRelationship,
    draftTargetNode,
    duplicateRelationship,
    activeFilterCount: Number(Boolean(searchQuery))
      + validSelectedRelationTypes.length
      + Number(Boolean(groupFilter))
      + Number(effectiveViewMode !== 'all'),
    hasActiveFilters: Boolean(
      searchQuery
      || validSelectedRelationTypes.length > 0
      || groupFilter
      || effectiveViewMode !== 'all'
    ),
    selectNode,
    showNode,
    handleNodeClick,
    handleNodeHover,
    handleLinkHover,
    handleBackgroundClick,
    cancelTargetSelection,
    returnToTargetSelection,
    completeRelationshipCreation,
    clearSelection,
    selectRelationship,
    openRelationshipCard,
    collapseRelationshipCard,
    completeRelationshipDeletion,
    selectLinkById,
    clearFilters,
    showNeighbors,
    showRelationshipList,
    togglePanel,
  };
}
