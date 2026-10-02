import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GRAPH_CAMERA, GRAPH_RENDERING } from './relationshipConstants';
import { graphEndpointId } from './relationshipGraphData';
import {
  drawLinkLabel,
  drawLinkPointerArea,
  drawNode,
  drawNodePointerArea,
} from './relationshipGraphDrawing';

const RelationshipCanvas = forwardRef(function RelationshipCanvas({ controller, loadState }, ref) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const didDragRef = useRef(false);
  const fitPendingRef = useRef(false);
  const previousFitRequestRef = useRef(controller.fitRequest);
  const [dimensions, setDimensions] = useState({ width: 720, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      setDimensions({
        width: Math.max(GRAPH_RENDERING.minimumWidth, Math.floor(containerRef.current.clientWidth)),
        height: Math.max(GRAPH_RENDERING.minimumHeight, Math.floor(containerRef.current.clientHeight)),
      });
    };
    updateDimensions();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Obrazy są tworzone raz na URL; callback jedynie odświeża canvas po zakończeniu ładowania.
    controller.sourceGraphData.nodes.forEach((node) => {
      if (!node.imageUrl || imageCacheRef.current.has(node.imageUrl)) return;
      const image = new Image();
      const cacheEntry = { image, status: 'loading' };
      imageCacheRef.current.set(node.imageUrl, cacheEntry);
      image.onload = () => {
        cacheEntry.status = 'loaded';
        graphRef.current?.refresh();
      };
      image.onerror = () => {
        cacheEntry.status = 'error';
        graphRef.current?.refresh();
      };
      image.src = node.imageUrl;
    });
  }, [controller.sourceGraphData.nodes]);

  const fitGraph = useCallback(() => {
    if (controller.visibleGraphData.nodes.length === 0) return;
    graphRef.current?.zoomToFit(GRAPH_CAMERA.fitAnimationMs, GRAPH_CAMERA.fitPadding);
    fitPendingRef.current = false;
  }, [controller.visibleGraphData.nodes.length]);

  useEffect(() => {
    if (previousFitRequestRef.current === controller.fitRequest) return undefined;
    previousFitRequestRef.current = controller.fitRequest;
    fitPendingRef.current = true;

    // Pierwszy kadr daje szybką reakcję, a drugi jest zabezpieczeniem po ustabilizowaniu fizyki.
    const preview = window.setTimeout(() => {
      if (fitPendingRef.current) {
        graphRef.current?.zoomToFit(GRAPH_CAMERA.fitAnimationMs, GRAPH_CAMERA.fitPadding);
      }
    }, GRAPH_CAMERA.fitPreviewDelayMs);
    const fallback = window.setTimeout(() => {
      if (fitPendingRef.current) fitGraph();
    }, GRAPH_CAMERA.fitFallbackDelayMs);
    return () => {
      window.clearTimeout(preview);
      window.clearTimeout(fallback);
    };
  }, [controller.fitRequest, dimensions, fitGraph]);

  useImperativeHandle(ref, () => ({
    centerNode(node) {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
      graphRef.current?.centerAt(node.x, node.y, GRAPH_CAMERA.animationMs);
      const currentZoom = graphRef.current?.zoom() || 1;
      graphRef.current?.zoom(Math.max(currentZoom, GRAPH_CAMERA.nodeZoom), GRAPH_CAMERA.animationMs);
    },
    centerLink(link, nodeById) {
      const source = nodeById.get(graphEndpointId(link.source));
      const target = nodeById.get(graphEndpointId(link.target));
      if (!source || !target) return;
      if (![source.x, source.y, target.x, target.y].every(Number.isFinite)) return;
      graphRef.current?.centerAt(
        (source.x + target.x) / 2,
        (source.y + target.y) / 2,
        GRAPH_CAMERA.animationMs,
      );
      const currentZoom = graphRef.current?.zoom() || 1;
      graphRef.current?.zoom(Math.max(currentZoom, GRAPH_CAMERA.linkZoom), GRAPH_CAMERA.animationMs);
    },
  }), []);

  const paintNode = useCallback((node, context, globalScale) => drawNode(
    node,
    context,
    globalScale,
    {
      hoveredNodeId: controller.hoveredNodeId,
      selectedNodeId: controller.selectedNodeId,
      interactionHighlight: controller.interactionHighlight,
      imageCache: imageCacheRef.current,
      visibleNodeCount: controller.visibleGraphData.nodes.length,
    },
  ), [
    controller.hoveredNodeId,
    controller.interactionHighlight,
    controller.selectedNodeId,
    controller.visibleGraphData.nodes.length,
  ]);
  const paintLinkLabel = useCallback((link, context, globalScale) => drawLinkLabel(
    link,
    context,
    globalScale,
    link.id === controller.hoveredLinkId || link.id === controller.selectedLinkId,
  ), [controller.hoveredLinkId, controller.selectedLinkId]);

  return (
    <div ref={containerRef} className="relationship-graph__canvas">
      {loadState.status === 'loading' ? <GraphMessage>Ładowanie grafu...</GraphMessage> : null}
      {loadState.status === 'error' ? (
        <GraphMessage role="alert">
          {loadState.error}
          <button type="button" className="relationship-graph__retry" onClick={loadState.retry}>
            Spróbuj ponownie
          </button>
        </GraphMessage>
      ) : null}
      {loadState.status === 'ready' && controller.sourceGraphData.nodes.length === 0 ? (
        <GraphMessage>Dodaj postacie, aby zobaczyć graf relacji.</GraphMessage>
      ) : null}
      {loadState.status === 'ready'
        && controller.sourceGraphData.nodes.length > 0
        && controller.visibleGraphData.nodes.length === 0 ? (
          <GraphMessage>Brak postaci i relacji pasujących do wybranych filtrów.</GraphMessage>
        ) : null}

      {loadState.status === 'ready' && controller.visibleGraphData.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={controller.visibleGraphData}
          backgroundColor="#f9fafb"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={drawNodePointerArea}
          nodeLabel={(node) => node.name}
          onNodeHover={(node) => {
            controller.setHoveredNodeId(node?.id ?? null);
            if (node) controller.setHoveredLinkId(null);
          }}
          onNodeDrag={() => {
            // Flaga zapobiega potraktowaniu końca przeciągania jako kliknięcia węzła.
            didDragRef.current = true;
          }}
          onNodeDragEnd={() => {
            window.setTimeout(() => {
              didDragRef.current = false;
            }, 0);
          }}
          onNodeClick={(node) => {
            if (!didDragRef.current) controller.selectNode(node);
          }}
          onLinkHover={(link) => {
            controller.setHoveredLinkId(link?.id ?? null);
            if (link) controller.setHoveredNodeId(null);
          }}
          onLinkClick={controller.selectRelationship}
          onBackgroundClick={controller.clearSelection}
          linkColor={(link) => (
            controller.interactionHighlight.active
              && !controller.interactionHighlight.linkIds.has(link.id)
              ? 'rgba(156, 163, 175, 0.18)'
              : link.color
          )}
          linkWidth={(link) => (
            link.id === controller.hoveredLinkId
              ? 4
              : (link.id === controller.selectedLinkId
                || controller.interactionHighlight.linkIds.has(link.id) ? 2.75 : 1.5)
          )}
          linkLabel={(link) => {
            const source = controller.nodeById.get(graphEndpointId(link.source));
            const target = controller.nodeById.get(graphEndpointId(link.target));
            return `${source?.name || 'Nieznana postać'} — ${link.label} — ${target?.name || 'Nieznana postać'}`;
          }}
          linkHoverPrecision={GRAPH_RENDERING.linkHitWidth}
          linkPointerAreaPaint={drawLinkPointerArea}
          linkCanvasObject={paintLinkLabel}
          linkCanvasObjectMode={() => 'after'}
          showPointerCursor
          cooldownTicks={GRAPH_RENDERING.cooldownTicks}
          onEngineStop={() => {
            if (fitPendingRef.current) fitGraph();
          }}
        />
      ) : null}
    </div>
  );
});

function GraphMessage({ children, role }) {
  return <div className="relationship-graph__message" role={role}>{children}</div>;
}

export default RelationshipCanvas;
