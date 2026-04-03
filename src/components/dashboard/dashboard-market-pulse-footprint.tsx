'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, Newspaper, Sparkles } from 'lucide-react';
import { HorizontalSwipableTicker } from '@/components/ui/horizontal-swipable-ticker';
import { PHARMA_MARKET_FALLBACK, PHARMA_NEWS_FALLBACK } from '@/lib/pharma-news/fallback-headlines';
import { stripHtmlNewsTitle } from '@/lib/pharma-news/sanitize-news-item';
import type { PharmaNewsItem } from '@/lib/pharma-news/types';

const HUB_HREF = '/dashboard/market-intelligence';

function dedupeLocal(items: PharmaNewsItem[]): PharmaNewsItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = it.title.toLowerCase().slice(0, 100);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const LOCAL_FALLBACK: PharmaNewsItem[] = dedupeLocal([
  ...PHARMA_MARKET_FALLBACK,
  ...PHARMA_NEWS_FALLBACK,
]);

/**
 * Compact “live wire” for dashboard overviews: linked marquee + rotating spotlight + CTA to the full hub.
 * Replaces the tall `PharmaMarketPulse` feature layout on role home screens.
 */
export function DashboardMarketPulseFootprint() {
  const prefersReduced = useReducedMotion();
  const [items, setItems] = useState<PharmaNewsItem[]>(LOCAL_FALLBACK);
  const [spotlight, setSpotlight] = useState(0);
  const [pauseMarquee, setPauseMarquee] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pharma-news?limit=22', { cache: 'no-store' });
        if (!res.ok) throw new Error('bad');
        const data = (await res.json()) as { items?: PharmaNewsItem[] };
        if (cancelled || !Array.isArray(data.items) || data.items.length === 0) return;
        const next = data.items
          .filter((i) => i.title?.trim())
          .map((i) => ({ ...i, title: stripHtmlNewsTitle(i.title) }));
        if (next.length > 0) setItems(next);
      } catch {
        if (!cancelled) setItems(LOCAL_FALLBACK);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prefersReduced || items.length <= 1) return;
    const t = setInterval(() => {
      setSpotlight((i) => (i + 1) % items.length);
    }, 9_000);
    return () => clearInterval(t);
  }, [items.length, prefersReduced]);

  const current = items[spotlight] ?? items[0];
  const showMarquee = items.length > 0;

  const onPickSpotlight = useCallback((index: number) => {
    setSpotlight(index);
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border shadow-[0_8px_32px_rgba(0,109,119,0.07)]"
      style={{
        borderColor: 'var(--surface-border)',
        background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(0,109,119,0.04) 45%, rgba(232,168,56,0.05) 100%)',
      }}
      aria-label="Market and health intelligence snapshot"
    >
      <div
        className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(0,109,119,0.2) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(232,168,56,0.18) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col gap-2.5 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
              style={{
                borderColor: 'rgba(0,109,119,0.2)',
                background: 'rgba(0,109,119,0.08)',
                color: 'var(--color-teal)',
              }}
            >
              <Newspaper className="h-4 w-4" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-content-primary">Market &amp; health intelligence</p>
              <p className="truncate text-[10px] font-medium text-content-muted">WHO · BBC Health · industry — tap a headline or open the hub</p>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200 sm:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <Link
            href={HUB_HREF}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-transform hover:opacity-95 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
          >
            <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
            Intelligence hub
            <ExternalLink className="h-3 w-3 opacity-80" aria-hidden />
          </Link>
        </div>

        <div
          className="overflow-hidden rounded-xl border py-2.5"
          style={{
            borderColor: 'var(--surface-border)',
            background: 'var(--surface-base)',
          }}
          onMouseEnter={() => setPauseMarquee(true)}
          onMouseLeave={() => setPauseMarquee(false)}
        >
          {showMarquee ? (
            <div className="min-w-0">
              <HorizontalSwipableTicker
                items={items}
                variant="dashboard"
                reducedMotion={!!prefersReduced}
                pauseAuto={pauseMarquee}
                renderItem={(item) =>
                  item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[min(100vw,28rem)] truncate px-1 text-sm font-semibold text-content-primary underline-offset-2 hover:text-teal hover:underline sm:max-w-none"
                    >
                      {item.title}
                    </a>
                  ) : (
                    <span className="px-1 text-sm font-semibold text-content-secondary">{item.title}</span>
                  )
                }
                separator={
                  <span className="px-4 text-sm font-light opacity-25" style={{ color: 'var(--color-teal)' }} aria-hidden>
                    |
                  </span>
                }
              />
            </div>
          ) : (
            <p className="px-3 text-sm font-medium leading-snug text-content-secondary">
              {items[0]?.title ?? 'Pharma awareness headlines load here.'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-dashed pt-2" style={{ borderColor: 'var(--surface-border)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal">Spotlight</span>
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.title.slice(0, 80)}
                  initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <p className="min-w-0 flex-1 text-xs font-semibold leading-snug text-content-primary sm:text-[13px]">
                    {current.title}
                  </p>
                  {current.url ? (
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-teal hover:bg-teal/10"
                    >
                      Source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth">
            {items.slice(0, 8).map((item, i) => (
              <button
                key={`${i}-${item.title.slice(0, 20)}`}
                type="button"
                onClick={() => onPickSpotlight(i)}
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  i === spotlight ? 'bg-teal/15 text-teal' : 'bg-surface-hover text-content-muted hover:text-content-secondary'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
