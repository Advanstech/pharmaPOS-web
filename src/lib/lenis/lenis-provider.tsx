'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from 'framer-motion';

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  // Increment this to force Lenis recreation after zoom change
  const [lenisKey, setLenisKey] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      allowNestedScroll: true,
      // Touch momentum — critical for POS touch screens
      syncTouch: true,
      syncTouchLerp: 0.075,
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
  }, [shouldReduceMotion, lenisKey]);

  // Listen for zoom changes and recreate Lenis so it measures correct dimensions
  useEffect(() => {
    const handleZoomChange = () => {
      // Small delay to let the browser finish painting the zoomed layout
      setTimeout(() => {
        setLenisKey(k => k + 1);
      }, 100);
    };

    window.addEventListener('pharmapos-zoom-changed', handleZoomChange);
    return () => window.removeEventListener('pharmapos-zoom-changed', handleZoomChange);
  }, []);

  return <>{children}</>;
}
