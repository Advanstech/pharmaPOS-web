'use client';

import { useEffect, useState, type RefObject } from 'react';
import Lenis from 'lenis';

const DEFAULT_EASING = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export type UseNestedLenisOptions = {
  enabled: boolean;
  layoutKey?: number | string;
  syncTouch?: boolean;
};

/**
 * Lenis on a custom overflow container (dashboard main, sidebar nav, POS panels).
 * Automatically reinitializes when zoom changes so scroll dimensions are correct.
 */
export function useNestedLenis(
  wrapperRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  { enabled, layoutKey = 0, syncTouch = true }: UseNestedLenisOptions,
): void {
  const [zoomKey, setZoomKey] = useState(0);

  // Listen for zoom changes and reinitialize
  useEffect(() => {
    const handleZoomChange = () => {
      setTimeout(() => setZoomKey(k => k + 1), 120);
    };
    window.addEventListener('pharmapos-zoom-changed', handleZoomChange);
    return () => window.removeEventListener('pharmapos-zoom-changed', handleZoomChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      smoothWheel: true,
      allowNestedScroll: true,
      syncTouch,
      syncTouchLerp: 0.075,
      duration: 1.2,
      easing: DEFAULT_EASING,
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, [enabled, layoutKey, zoomKey, syncTouch, wrapperRef, contentRef]);
}
