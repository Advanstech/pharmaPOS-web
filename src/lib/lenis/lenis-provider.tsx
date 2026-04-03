'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from 'framer-motion';

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Respect prefers-reduced-motion — disable smooth scroll if requested
    if (shouldReduceMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      /** Nested `useNestedLenis` regions (dashboard main, sidebar, POS) handle their own wheel + touch */
      allowNestedScroll: true,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    }
    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [shouldReduceMotion]);

  return <>{children}</>;
}
