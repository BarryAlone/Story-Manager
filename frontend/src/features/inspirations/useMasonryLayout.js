import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const GAP = 20;

function columnCountForWidth(width) {
  if (width < 520) return 1;
  if (width < 800) return 2;
  if (width < 1080) return 3;

  return Math.max(4, Math.floor((width + GAP) / (240 + GAP)));
}

export default function useMasonryLayout() {
  const containerRef = useRef(null);
  const [containerVersion, setContainerVersion] = useState(0);
  const frameRef = useRef(null);
  const observedItemsRef = useRef(new Set());
  const lastContainerWidthRef = useRef(null);

  const attachContainer = useCallback((element) => {
    containerRef.current = element;
    setContainerVersion((version) => version + 1);
  }, []);

  const layout = useCallback(() => {
    frameRef.current = null;

    const container = containerRef.current;
    if (!container) return;

    const items = [...container.querySelectorAll('[data-masonry-item]')];
    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    const columnCount = columnCountForWidth(containerWidth);
    const itemWidth = (containerWidth - (GAP * (columnCount - 1))) / columnCount;
    const columnHeights = Array(columnCount).fill(0);

    items.forEach((item) => {
      item.style.width = `${itemWidth}px`;
    });

    items.forEach((item) => {
      const shortestColumnHeight = Math.min(...columnHeights);
      const columnIndex = columnHeights.indexOf(shortestColumnHeight);

      item.style.left = `${columnIndex * (itemWidth + GAP)}px`;
      item.style.top = `${shortestColumnHeight}px`;
      item.dataset.masonryPositioned = 'true';
      columnHeights[columnIndex] += item.getBoundingClientRect().height + GAP;
    });

    const contentHeight = items.length > 0 ? Math.max(...columnHeights) - GAP : 0;
    container.style.height = `${Math.max(0, contentHeight)}px`;
    container.dataset.masonryReady = 'true';
  }, []);

  const scheduleLayout = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(layout);
  }, [layout]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const resizeObserver = new ResizeObserver((entries) => {
      const shouldLayout = entries.some((entry) => {
        if (entry.target !== container) return true;

        const width = entry.contentRect.width;
        if (width === lastContainerWidthRef.current) return false;

        lastContainerWidthRef.current = width;
        return true;
      });

      if (shouldLayout) scheduleLayout();
    });

    const observeCurrentItems = () => {
      const currentItems = new Set(container.querySelectorAll('[data-masonry-item]'));

      observedItemsRef.current.forEach((item) => {
        if (!currentItems.has(item)) resizeObserver.unobserve(item);
      });

      currentItems.forEach((item) => {
        if (!observedItemsRef.current.has(item)) resizeObserver.observe(item);
      });

      observedItemsRef.current = currentItems;
      scheduleLayout();
    };

    resizeObserver.observe(container);
    const mutationObserver = new MutationObserver(observeCurrentItems);
    mutationObserver.observe(container, { childList: true });
    observeCurrentItems();

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      observedItemsRef.current.clear();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [containerVersion, scheduleLayout]);

  return attachContainer;
}
