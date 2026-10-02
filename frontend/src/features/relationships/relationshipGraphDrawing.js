import { GRAPH_RENDERING } from './relationshipConstants';
import { relationColor } from './relationshipGraphData';

export function drawNode(node, context, globalScale, options) {
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

  const {
    hoveredNodeId,
    selectedNodeId,
    interactionHighlight,
    imageCache,
    visibleNodeCount,
  } = options;
  const isHovered = node.id === hoveredNodeId;
  const isSelected = node.id === selectedNodeId;
  const isRelated = interactionHighlight.nodeIds.has(node.id);
  const isDimmed = interactionHighlight.active && !isRelated;
  const baseRadius = GRAPH_RENDERING.nodeRadius;
  const radius = isHovered ? 11 : (isSelected ? 10.5 : (isRelated ? 9.75 : baseRadius));
  const cachedImage = node.imageUrl ? imageCache.get(node.imageUrl) : null;

  context.save();
  context.globalAlpha = isDimmed ? 0.22 : 1;
  if (isHovered || isSelected) {
    context.shadowColor = isSelected ? 'rgba(37, 99, 235, 0.8)' : 'rgba(17, 24, 39, 0.55)';
    context.shadowBlur = 12;
  }
  context.beginPath();
  context.arc(node.x, node.y, radius, 0, Math.PI * 2);
  context.clip();

  if (cachedImage?.status === 'loaded') {
    context.drawImage(cachedImage.image, node.x - radius, node.y - radius, radius * 2, radius * 2);
  } else {
    context.fillStyle = relationColor(`character-${node.id}`);
    context.fillRect(node.x - radius, node.y - radius, radius * 2, radius * 2);
    context.fillStyle = '#ffffff';
    context.font = '700 7px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(node.initials, node.x, node.y + 0.5);
  }

  context.restore();
  context.save();
  context.globalAlpha = isDimmed ? 0.22 : 1;
  context.beginPath();
  context.arc(node.x, node.y, radius, 0, Math.PI * 2);
  context.strokeStyle = isSelected ? '#2563eb' : (isHovered ? '#111827' : '#ffffff');
  context.lineWidth = isSelected || isHovered ? 2.5 : 1.5;
  context.stroke();

  const showLabel = isSelected
    || isHovered
    || (isRelated && interactionHighlight.active)
    || visibleNodeCount <= 30
    || globalScale >= 1.2
    || (globalScale >= 0.55 && node.labelPriority);

  if (showLabel) {
    const fontSize = 12 / globalScale;
    const labelY = node.y + radius + (9 / globalScale);
    const padding = 3 / globalScale;
    context.font = `600 ${fontSize}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const labelWidth = context.measureText(node.name).width;
    context.fillStyle = 'rgba(255, 255, 255, 0.88)';
    context.fillRect(
      node.x - (labelWidth / 2) - padding,
      labelY - (fontSize / 2) - padding,
      labelWidth + (padding * 2),
      fontSize + (padding * 2),
    );
    context.fillStyle = '#1f2937';
    context.fillText(node.name, node.x, labelY);
  }
  context.restore();
}

export function drawNodePointerArea(node, color, context) {
  context.beginPath();
  context.arc(node.x, node.y, GRAPH_RENDERING.nodeHitRadius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

export function drawLinkPointerArea(link, color, context) {
  if (typeof link.source !== 'object' || typeof link.target !== 'object') return;
  context.beginPath();
  context.moveTo(link.source.x, link.source.y);
  context.lineTo(link.target.x, link.target.y);
  context.strokeStyle = color;
  context.lineWidth = GRAPH_RENDERING.linkHitWidth;
  context.stroke();
}

export function drawLinkLabel(link, context, globalScale, isActive) {
  if (!isActive && globalScale < 1.55) return;
  if (typeof link.source !== 'object' || typeof link.target !== 'object') return;
  if (!Number.isFinite(link.source.x) || !Number.isFinite(link.target.x)) return;

  const x = (link.source.x + link.target.x) / 2;
  const y = (link.source.y + link.target.y) / 2;
  const fontSize = 10 / globalScale;
  const padding = 2 / globalScale;
  context.font = `600 ${fontSize}px sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const labelWidth = context.measureText(link.label).width;
  context.fillStyle = 'rgba(249, 250, 251, 0.92)';
  context.fillRect(
    x - (labelWidth / 2) - padding,
    y - (fontSize / 2) - padding,
    labelWidth + (padding * 2),
    fontSize + (padding * 2),
  );
  context.fillStyle = link.color;
  context.fillText(link.label, x, y);
}
