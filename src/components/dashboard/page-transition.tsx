'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

/**
 * Premium page transition for Azzay Pharmacy dashboard.
 *
 * Behaviour:
 * - Navigating deeper (longer path): slide in from right
 * - Navigating back (shorter path): slide in from left
 * - Same depth: crossfade with subtle scale
 *
 * Tuned for POS touch screens — fast (200ms), smooth, no jank.
 * Respects prefers-reduced-motion.
 */

const VARIANTS = {
  // Entering from the right (going deeper)
  enterRight: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  // Entering from the left (going back)
  enterLeft: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  // Same depth — crossfade with scale
  crossfade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

const SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.8,
};

const EASE_OUT = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number], // ease-out-expo
};

function getDepth(path: string): number {
  return path.split('/').filter(Boolean).length;
}

function getVariant(prev: string, next: string) {
  const prevDepth = getDepth(prev);
  const nextDepth = getDepth(next);
  if (nextDepth > prevDepth) return VARIANTS.enterRight;
  if (nextDepth < prevDepth) return VARIANTS.enterLeft;
  return VARIANTS.crossfade;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const reduce = useReducedMotion();
  const prevPathRef = useRef(pathname);

  const variant = getVariant(prevPathRef.current, pathname);
  // Update ref after computing variant
  if (prevPathRef.current !== pathname) {
    prevPathRef.current = pathname;
  }

  if (reduce) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={EASE_OUT}
        style={{ minHeight: '100%', willChange: 'opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
