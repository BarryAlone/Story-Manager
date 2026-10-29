import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const TRANSITION_MS = 200;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function geometryFromRect(rect) {
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  };
}

export default function useInspirationCardExpansion({ isExpanded, layoutKey, onClosed }) {
  const slotRef = useRef(null);
  const overlayRef = useRef(null);
  const originRectRef = useRef(null);
  const originImageHeightRef = useRef(null);
  const isPositionedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const frameRef = useRef(null);
  const timerRef = useRef(null);
  const imageWaitTimerRef = useRef(null);

  const clearScheduledWork = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (imageWaitTimerRef.current) window.clearTimeout(imageWaitTimerRef.current);
    frameRef.current = null;
    timerRef.current = null;
    imageWaitTimerRef.current = null;
  }, []);

  const applyGeometry = useCallback((element, geometry) => {
    element.style.top = `${geometry.top}px`;
    element.style.left = `${geometry.left}px`;
    element.style.width = `${geometry.width}px`;
    element.style.height = `${geometry.height}px`;
  }, []);

  const imageElements = useCallback((element) => ({
    image: element.querySelector('.inspiration-card__image-wrap > img'),
    wrapper: element.querySelector('.inspiration-card__image-wrap'),
  }), []);

  const clearImageGeometry = useCallback((element) => {
    const { image, wrapper } = imageElements(element);
    if (wrapper) {
      wrapper.style.height = '';
      wrapper.style.transition = 'none';
    }
    if (image) image.style.height = '';
  }, [imageElements]);

  const setImageHeight = useCallback((element, height) => {
    const { image, wrapper } = imageElements(element);
    if (!wrapper || height === null) return;
    wrapper.style.height = `${height}px`;
    if (image) image.style.height = '100%';
  }, [imageElements]);

  const measureTarget = useCallback((element) => {
    const viewportPadding = window.innerWidth <= 680 ? 10 : 26;
    const width = Math.min(720, window.innerWidth - (viewportPadding * 2));
    const maxHeight = window.innerHeight - (viewportPadding * 2);

    element.style.transition = 'none';
    element.style.visibility = 'hidden';
    element.style.overflowY = 'auto';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = `${width}px`;
    element.style.height = 'auto';
    element.style.maxHeight = `${maxHeight}px`;
    clearImageGeometry(element);

    const scrollbarGutter = Math.max(0, element.offsetWidth - element.clientWidth);
    element.style.setProperty('--inspiration-scrollbar-gutter', `${scrollbarGutter}px`);

    const imageWrapper = element.querySelector('.inspiration-card__image-wrap');
    const imageHeight = imageWrapper?.getBoundingClientRect().height ?? null;
    const height = Math.min(maxHeight, Math.max(120, element.scrollHeight));

    return {
      geometry: {
        height,
        left: Math.max(viewportPadding, (window.innerWidth - width) / 2),
        top: Math.max(viewportPadding, (window.innerHeight - height) / 2),
        width,
      },
      imageHeight,
    };
  }, [clearImageGeometry]);

  const finishTransition = useCallback((element) => {
    isTransitioningRef.current = false;
    element.style.transition = 'none';
    element.style.overflowY = 'auto';
    clearImageGeometry(element);

    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      const target = measureTarget(element);
      applyGeometry(element, target.geometry);
      element.style.visibility = 'visible';
    }
  }, [applyGeometry, clearImageGeometry, measureTarget]);

  const animateGeometry = useCallback((element, from, to, fromImageHeight, toImageHeight, onFinish) => {
    clearScheduledWork();
    isTransitioningRef.current = true;
    element.style.transition = 'none';
    element.style.overflowY = 'hidden';
    applyGeometry(element, from);
    setImageHeight(element, fromImageHeight);
    element.style.visibility = 'visible';
    element.getBoundingClientRect();

    if (reducedMotion()) {
      applyGeometry(element, to);
      setImageHeight(element, toImageHeight);
      isTransitioningRef.current = false;
      onFinish?.();
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      element.style.transition = [
        `top ${TRANSITION_MS}ms ease`,
        `left ${TRANSITION_MS}ms ease`,
        `width ${TRANSITION_MS}ms ease`,
        `height ${TRANSITION_MS}ms ease`,
      ].join(', ');

      const imageWrapper = element.querySelector('.inspiration-card__image-wrap');
      if (imageWrapper) imageWrapper.style.transition = `height ${TRANSITION_MS}ms ease`;

      applyGeometry(element, to);
      setImageHeight(element, toImageHeight);

      timerRef.current = window.setTimeout(() => {
        onFinish?.();
      }, TRANSITION_MS + 35);
    });
  }, [applyGeometry, clearScheduledWork, setImageHeight]);

  const fitOverlay = useCallback((animate = false) => {
    const element = overlayRef.current;
    if (!element) return;
    if (isTransitioningRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    const current = geometryFromRect(element.getBoundingClientRect());
    const currentImageHeight = element.querySelector('.inspiration-card__image-wrap')?.getBoundingClientRect().height ?? null;
    const target = measureTarget(element);

    if (!animate || reducedMotion()) {
      applyGeometry(element, target.geometry);
      element.style.visibility = 'visible';
      clearImageGeometry(element);
      return;
    }

    animateGeometry(
      element,
      current,
      target.geometry,
      currentImageHeight,
      target.imageHeight,
      () => finishTransition(element),
    );
  }, [animateGeometry, applyGeometry, clearImageGeometry, finishTransition, measureTarget]);

  const startOpening = useCallback(() => {
    const element = overlayRef.current;
    const origin = originRectRef.current;
    if (!element || !origin) return;

    const target = measureTarget(element);
    animateGeometry(
      element,
      geometryFromRect(origin),
      target.geometry,
      originImageHeightRef.current,
      target.imageHeight,
      () => finishTransition(element),
    );
  }, [animateGeometry, finishTransition, measureTarget]);

  const waitForImagesAndOpen = useCallback(() => {
    const element = overlayRef.current;
    if (!element) return;

    const pendingImages = [...element.querySelectorAll('img')].filter((image) => !image.complete);
    if (pendingImages.length === 0) {
      startOpening();
      return;
    }

    let remaining = pendingImages.length;
    let started = false;
    const openOnce = () => {
      if (started) return;
      started = true;
      startOpening();
    };
    const imageReady = () => {
      remaining -= 1;
      if (remaining === 0) openOnce();
    };

    pendingImages.forEach((image) => {
      image.addEventListener('load', imageReady, { once: true });
      image.addEventListener('error', imageReady, { once: true });
    });
    imageWaitTimerRef.current = window.setTimeout(openOnce, 300);
  }, [startOpening]);

  const openFromSlot = useCallback((open) => {
    if (isTransitioningRef.current || !slotRef.current) return;

    const origin = slotRef.current.getBoundingClientRect();
    const originImage = slotRef.current.querySelector('.inspiration-card__image-wrap');
    originRectRef.current = origin;
    originImageHeightRef.current = originImage?.getBoundingClientRect().height ?? null;
    slotRef.current.style.height = `${origin.height}px`;
    isPositionedRef.current = false;
    isTransitioningRef.current = true;
    open();
  }, []);

  const closeToSlot = useCallback(() => {
    const element = overlayRef.current;
    const slot = slotRef.current;
    if (!element || !slot || isTransitioningRef.current) return;

    const current = geometryFromRect(element.getBoundingClientRect());
    const destination = geometryFromRect(slot.getBoundingClientRect());
    const currentImageHeight = element.querySelector('.inspiration-card__image-wrap')?.getBoundingClientRect().height ?? null;
    let destinationImageHeight = originImageHeightRef.current;
    const image = element.querySelector('.inspiration-card__image-wrap > img');

    if (image?.naturalWidth && image.naturalHeight) {
      destinationImageHeight = Math.min(300, destination.width * (image.naturalHeight / image.naturalWidth));
    }

    animateGeometry(
      element,
      current,
      destination,
      currentImageHeight,
      destinationImageHeight,
      () => {
        isTransitioningRef.current = false;
        onClosed();
      },
    );
  }, [animateGeometry, onClosed]);

  useLayoutEffect(() => {
    if (!isExpanded || !overlayRef.current) return;

    if (!isPositionedRef.current) {
      isPositionedRef.current = true;
      waitForImagesAndOpen();
      return;
    }

    if (!isTransitioningRef.current) fitOverlay(true);
  }, [fitOverlay, isExpanded, layoutKey, waitForImagesAndOpen]);

  useEffect(() => {
    if (!isExpanded) {
      isPositionedRef.current = false;
      isTransitioningRef.current = false;
      pendingRefreshRef.current = false;
      if (slotRef.current) slotRef.current.style.height = '';
      return undefined;
    }

    const handleResize = () => fitOverlay(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitOverlay, isExpanded]);

  useEffect(() => () => clearScheduledWork(), [clearScheduledWork]);

  return {
    closeToSlot,
    fitOverlay,
    isTransitioningRef,
    openFromSlot,
    overlayRef,
    slotRef,
  };
}
