'use client';

import { useEffect, type RefObject } from 'react';
import Lenis from 'lenis';

const DEFAULT_EASING = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export type UseNestedLenisOptions = {
  enabled: boolean;
  /** Recreate Lenis when layout changes (route, list length, nav count, etc.) */
  layoutKey?: number | string;
  /**
   * Smooth finger momentum on touch / tablet / POS scroll regions.
   * Wheel smoothing uses `smoothWheel` regardless.
   */
  syncTouch?: boolean;
};

/**
 * Lenis on a custom overflow container (dashboard main, sidebar nav, POS panels).
 * Use with `wrapper` = scrollable element (`overflow-y-auto`, `min-h-0`) and
 * `content` = direct child that wraps the growing content.
 */
export function useNestedLenis(
  wrapperRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  { enabled, layoutKey = 0, syncTouch = true }: UseNestedLenisOptions,
): void {
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
      syncTouchLerp: 0.085,
      duration: 1.2,
      easing: DEFAULT_EASING,
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, [enabled, layoutKey, syncTouch, wrapperRef, contentRef]);
}
