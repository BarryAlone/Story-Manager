import { backendUrl } from '../../api';
import { RELATION_COLORS, UNGROUPED_FILTER } from './relationshipConstants';

export function stableHash(value) {
  return Array.from(String(value)).reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
}

export function normalizeRelationType(value) {
  const label = String(value || '').trim() || 'Powiązanie';
  return { key: label.toLocaleLowerCase('pl-PL'), label };
}

export function relationColor(typeKey) {
  return RELATION_COLORS[stableHash(typeKey) % RELATION_COLORS.length];
}

export function characterInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  const initials = parts.length === 1
    ? parts[0].slice(0, 2)
    : `${parts[0][0]}${parts.at(-1)[0]}`;
  return initials.toLocaleUpperCase('pl-PL');
}

export function graphEndpointId(endpoint) {
  return typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint;
}

export function resolveCharacterImageUrl(path) {
  if (!path) return null;

  const normalizedPath = String(path);
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;
  return backendUrl(`/storage/${normalizedPath.replace(/^\/+/, '')}`);
}

export function buildRelationshipGraphData(characters, relationships, { synthetic = false } = {}) {
  const nodes = characters.map((character, index) => ({
    id: character.id,
    name: String(character.name || `Postać ${index + 1}`),
    groupName: String(character.group_name || '').trim(),
    description: String(character.description || '').trim(),
    imageUrl: resolveCharacterImageUrl(character.character_image),
    initials: characterInitials(character.name),
    labelPriority: stableHash(character.id) % 4 === 0,
    synthetic,
    x: Number.isFinite(character.x) ? character.x : undefined,
    y: Number.isFinite(character.y) ? character.y : undefined,
    val: 20,
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = relationships
    .filter((relationship) => (
      nodeIds.has(relationship.character_1_id)
      && nodeIds.has(relationship.character_2_id)
    ))
    .map((relationship, index) => {
      const type = normalizeRelationType(relationship.relation_name);
      return {
        id: relationship.id ?? `relationship-${index}`,
        source: relationship.character_1_id,
        target: relationship.character_2_id,
        label: type.label,
        typeKey: type.key,
        color: relationColor(type.key),
        synthetic,
      };
    });

  return { nodes, links };
}

export function listRelationTypes(links) {
  const types = new Map();
  links.forEach((link) => {
    if (!types.has(link.typeKey)) {
      types.set(link.typeKey, { key: link.typeKey, label: link.label, color: link.color });
    }
  });
  return Array.from(types.values()).sort((first, second) => (
    first.label.localeCompare(second.label, 'pl-PL')
  ));
}

export function listCharacterGroups(nodes) {
  return Array.from(new Set(nodes.map((node) => node.groupName).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, 'pl-PL'));
}

export function filterGraphData(sourceGraphData, filters) {
  const { group, relationType, neighborId } = filters;
  let nodes = sourceGraphData.nodes;

  if (group === UNGROUPED_FILTER) nodes = nodes.filter((node) => !node.groupName);
  else if (group) nodes = nodes.filter((node) => node.groupName === group);

  let visibleNodeIds = new Set(nodes.map((node) => node.id));
  let links = sourceGraphData.links.filter((link) => (
    visibleNodeIds.has(graphEndpointId(link.source))
    && visibleNodeIds.has(graphEndpointId(link.target))
  ));

  if (relationType) {
    links = links.filter((link) => link.typeKey === relationType);
    visibleNodeIds = new Set(links.flatMap((link) => [
      graphEndpointId(link.source),
      graphEndpointId(link.target),
    ]));
    nodes = nodes.filter((node) => visibleNodeIds.has(node.id));
  }

  if (neighborId !== null) {
    if (!nodes.some((node) => node.id === neighborId)) return { nodes: [], links: [] };
    links = links.filter((link) => (
      graphEndpointId(link.source) === neighborId
      || graphEndpointId(link.target) === neighborId
    ));
    visibleNodeIds = new Set([neighborId]);
    links.forEach((link) => {
      visibleNodeIds.add(graphEndpointId(link.source));
      visibleNodeIds.add(graphEndpointId(link.target));
    });
    nodes = nodes.filter((node) => visibleNodeIds.has(node.id));
  }

  return { nodes, links };
}

export function buildInteractionHighlight(links, selection) {
  const nodeIds = new Set();
  const linkIds = new Set();
  const activeLinkId = selection.hoveredLinkId ?? selection.selectedLinkId;
  const activeNodeId = selection.hoveredNodeId
    ?? (activeLinkId === null ? selection.selectedNodeId : null);

  if (activeLinkId !== null) {
    const link = links.find((candidate) => candidate.id === activeLinkId);
    if (link) {
      linkIds.add(link.id);
      nodeIds.add(graphEndpointId(link.source));
      nodeIds.add(graphEndpointId(link.target));
    }
  } else if (activeNodeId !== null) {
    nodeIds.add(activeNodeId);
    links.forEach((link) => {
      const sourceId = graphEndpointId(link.source);
      const targetId = graphEndpointId(link.target);
      if (sourceId === activeNodeId || targetId === activeNodeId) {
        linkIds.add(link.id);
        nodeIds.add(sourceId);
        nodeIds.add(targetId);
      }
    });
  }

  return { active: nodeIds.size > 0 || linkIds.size > 0, nodeIds, linkIds };
}
