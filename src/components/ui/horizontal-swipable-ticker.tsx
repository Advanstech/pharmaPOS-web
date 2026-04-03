'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Hidden scrollbar, horizontal touch pan, no vertical scroll bleed */
const SCROLL_STRIP =
  'overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x overscroll-x-contain';

const PX_PER_FRAME: Record<'landing' | 'dashboard', number> = {
  landing: 0.38,
  dashboard: 0.3,
};

export interface HorizontalSwipableTickerProps<T> {
  items: T[];
  renderItem: (item: T, indexInSource: number) => React.ReactNode;
  separator?: React.ReactNode;
  variant?: 'landing' | 'dashboard';
  /** External pause (e.g. parent hover) */
  pauseAuto?: boolean;
  /** No auto-advance; horizontal swipe/scroll still works */
  reducedMotion?: boolean;
  className?: string;
  trackClassName?: string;
  /** Pause auto-scroll while hovering (desktop) */
  pauseOnHover?: boolean;
}

/**
 * Horizontally scrollable news strip: auto-scrolls like a marquee, but users can swipe/drag
 * or use shift+wheel to explore. Duplicates items for a seamless wrap.
 */
export function HorizontalSwipableTicker<T>({
  items,
  renderItem,
  separator,
  variant = 'landing',
  pauseAuto = false,
  reducedMotion = false,
  className,
  trackClassName,
  pauseOnHover = false,
}: HorizontalSwipableTickerProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoverPause, setHoverPause] = useState(false);
  const userPauseUntilRef = useRef(0);
  const rafRef = useRef(0);
  const dragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startScroll: 0,
  });
  const maxDragRef = useRef(0);

  const speed = PX_PER_FRAME[variant];

  const bumpUserPause = useCallback(() => {
    userPauseUntilRef.current = Date.now() + 4500;
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    if (half <= 0) return;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };
    maxDragRef.current = 0;
    bumpUserPause();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    maxDragRef.current = Math.max(maxDragRef.current, Math.abs(dx));
    el.scrollLeft = dragRef.current.startScroll - dx;
    const half = el.scrollWidth / 2;
    if (half > 0) {
      if (el.scrollLeft >= half - 1) el.scrollLeft -= half;
      if (el.scrollLeft < 0) el.scrollLeft += half;
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || e.pointerId !== dragRef.current.pointerId) return;
    const el = scrollRef.current;
    try {
      if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = { active: false, pointerId: null, startX: 0, startScroll: 0 };
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = () => bumpUserPause();
    const onTouchStart = () => bumpUserPause();
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
    };
  }, [bumpUserPause]);

  useEffect(() => {
    if (reducedMotion || items.length === 0) return;

    const loop = () => {
      const el = scrollRef.current;
      if (!el) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const autoPaused =
        pauseAuto ||
        (pauseOnHover && hoverPause) ||
        Date.now() < userPauseUntilRef.current;

      if (!autoPaused) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          el.scrollLeft += speed;
          if (el.scrollLeft >= half - 1) el.scrollLeft -= half;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion, items.length, speed, pauseAuto, hoverPause, pauseOnHover]);

  if (items.length === 0) return null;

  const doubled: T[] = [...items, ...items];

  return (
    <div
      ref={scrollRef}
      className={cn(SCROLL_STRIP, 'cursor-grab active:cursor-grabbing', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={() => pauseOnHover && setHoverPause(true)}
      onMouseLeave={() => pauseOnHover && setHoverPause(false)}
      onClickCapture={(e) => {
        if (maxDragRef.current > 10 && (e.target as HTMLElement).closest('a[href]')) {
          e.preventDefault();
        }
        maxDragRef.current = 0;
      }}
    >
      <div className={cn('flex w-max min-w-max whitespace-nowrap', trackClassName)}>
        {doubled.map((item, i) => (
          <span key={`tick-${i}`} className="inline-flex shrink-0 items-center">
            {renderItem(item, i % items.length)}
            {separator}
          </span>
        ))}
      </div>
    </div>
  );
}
