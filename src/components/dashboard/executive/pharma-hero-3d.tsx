'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';

const PharmaHeroScene = dynamic(() => import('./pharma-hero-scene'), { ssr: false });

interface PharmaHero3DProps {
  className?: string;
}

/** Lightweight WebGL accent — pharmacy “capsule” motif for executive dashboards. */
export function PharmaHero3D({ className = '' }: PharmaHero3DProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div
        className={`flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-teal/20 bg-gradient-to-br from-teal/15 to-amber-500/10 ${className}`}
        aria-hidden
      >
        <div
          className="h-16 w-28 rounded-full opacity-80"
          style={{
            background: 'linear-gradient(135deg, #0d9488, #115e59)',
            boxShadow: '0 20px 40px rgba(13,148,136,0.35)',
            transform: 'rotateX(12deg)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-[140px] overflow-hidden rounded-2xl border border-teal/20 bg-gradient-to-b from-teal/10 via-transparent to-amber-500/5 ${className}`}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(45,212,191,0.12),transparent_55%)]" />
      <Suspense fallback={null}>
        <PharmaHeroScene />
      </Suspense>
    </div>
  );
}
