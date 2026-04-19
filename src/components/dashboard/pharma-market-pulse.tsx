'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Building2,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { PHARMA_MARKET_FALLBACK, PHARMA_NEWS_FALLBACK } from '@/lib/pharma-news/fallback-headlines';
import { stripHtmlNewsTitle } from '@/lib/pharma-news/sanitize-news-item';
import type { NewsCategory, PharmaNewsItem } from '@/lib/pharma-news/types';

const LOCAL_FALLBACK: PharmaNewsItem[] = dedupeLocal([
  ...PHARMA_MARKET_FALLBACK,
  ...PHARMA_NEWS_FALLBACK,
]);

function dedupeLocal(items: PharmaNewsItem[]): PharmaNewsItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = it.title.toLowerCase().slice(0, 100);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const CATEGORY_META: Record<
  NewsCategory,
  { label: string; Icon: typeof HeartPulse; chip: string; gradientOverlay: string }
> = {
  health: {
    label: 'Public health',
    Icon: HeartPulse,
    chip: 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25',
    gradientOverlay: 'from-emerald-500/18 via-teal-500/5 to-transparent',
  },
  industry: {
    label: 'Industry',
    Icon: Building2,
    chip: 'bg-violet-500/12 text-violet-800 dark:text-violet-200 border-violet-500/25',
    gradientOverlay: 'from-violet-500/18 via-fuchsia-500/5 to-transparent',
  },
  awareness: {
    label: 'Branch tips',
    Icon: GraduationCap,
    chip: 'bg-amber-500/12 text-amber-900 dark:text-amber-100 border-amber-500/25',
    gradientOverlay: 'from-amber-500/18 via-orange-500/5 to-transparent',
  },
};

interface ApiPayload {
  items: PharmaNewsItem[];
  updatedAt?: string;
}

function normalizeItem(raw: { title?: string; url?: string; category?: string }): PharmaNewsItem | null {
  const title = raw.title?.trim();
  if (!title) return null;
  const c = raw.category === 'industry' || raw.category === 'awareness' ? raw.category : 'health';
  return { title: stripHtmlNewsTitle(title), url: raw.url, category: c };
}

interface PharmaMarketPulseProps {
  /** `compact` = single-band ticker for executive command center (less vertical scroll). */
  layout?: 'feature' | 'compact';
  /** Optional initial article title to highlight on mount */
  initialArticle?: string | null;
}

export function PharmaMarketPulse({ layout = 'feature', initialArticle }: PharmaMarketPulseProps) {
  const prefersReduced = useReducedMotion();
  const [items, setItems] = useState<PharmaNewsItem[]>(LOCAL_FALLBACK);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [spotlight, setSpotlight] = useState(0);
  const [pauseRotate, setPauseRotate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pharma-news?limit=14', { cache: 'no-store' });
        if (!res.ok) throw new Error('bad status');
        const data = (await res.json()) as ApiPayload;
        if (cancelled || !Array.isArray(data.items)) return;
        const next = data.items.map(normalizeItem).filter(Boolean) as PharmaNewsItem[];
        if (next.length > 0) {
          setItems(next);
          setUpdatedAt(data.updatedAt ?? null);
          // If initialArticle is provided, find and highlight the matching article
          if (initialArticle) {
            const matchIndex = next.findIndex(
              (item) => item.title.toLowerCase() === decodeURIComponent(initialArticle).toLowerCase()
            );
            if (matchIndex !== -1) {
              setSpotlight(matchIndex);
              setPauseRotate(true);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setItems(LOCAL_FALLBACK);
          // Also check fallback for initialArticle
          if (initialArticle) {
            const matchIndex = LOCAL_FALLBACK.findIndex(
              (item) => item.title.toLowerCase() === decodeURIComponent(initialArticle).toLowerCase()
            );
            if (matchIndex !== -1) {
              setSpotlight(matchIndex);
              setPauseRotate(true);
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialArticle]);

  useEffect(() => {
    if (prefersReduced || items.length <= 1 || pauseRotate) return;
    const t = setInterval(() => {
      setSpotlight((i) => (i + 1) % items.length);
    }, 11_000);
    return () => clearInterval(t);
  }, [items.length, prefersReduced, pauseRotate]);

  const current = items[spotlight] ?? items[0];

  const onPickSide = useCallback((globalIndex: number) => {
    setSpotlight(globalIndex);
    setPauseRotate(true);
  }, []);

  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  if (layout === 'compact') {
    return (
      <motion.section
        className="relative overflow-hidden rounded-2xl border border-surface-border shadow-[0_8px_32px_rgba(0,109,119,0.06)]"
        style={{ background: 'var(--surface-card)' }}
        initial={prefersReduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        aria-labelledby="market-pulse-compact-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              'radial-gradient(ellipse 80% 120% at 10% 0%, rgba(0,109,119,0.12), transparent), radial-gradient(ellipse 60% 80% at 100% 100%, rgba(232,168,56,0.1), transparent)',
          }}
        />
        <div className="relative z-10 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-teal" aria-hidden />
              <h2 id="market-pulse-compact-heading" className="text-xs font-bold uppercase tracking-wider text-content-primary">
                Market &amp; health pulse
              </h2>
            </div>
            {formattedTime && (
              <p className="text-[10px] font-semibold text-content-muted">{formattedTime}</p>
            )}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth">
            {loading
              ? [0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-7 w-28 shrink-0 rounded-full" />)
              : items.slice(0, 14).map((item, i) => {
                  const meta = CATEGORY_META[item.category];
                  const CatIcon = meta.Icon;
                  const isActive = i === spotlight;
                  return (
                    <button
                      key={`${i}-${item.title.slice(0, 24)}`}
                      type="button"
                      onClick={() => onPickSide(i)}
                      className={`inline-flex max-w-[200px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-[11px] font-semibold transition-all ${
                        isActive
                          ? 'border-teal/40 bg-teal/10 text-content-primary shadow-sm'
                          : 'border-surface-border bg-surface-base text-content-secondary hover:border-teal/25'
                      }`}
                    >
                      <CatIcon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <span className="truncate">{item.title}</span>
                    </button>
                  );
                })}
          </div>
          {current && (
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-content-primary">
              {current.title}
              {current.url ? (
                <a
                  href={current.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 text-teal hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </p>
          )}
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      className="relative overflow-hidden rounded-[28px] border border-surface-border shadow-[0_12px_48px_rgba(0,109,119,0.08)]"
      style={{ background: 'var(--surface-card)' }}
      initial={prefersReduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      aria-labelledby="market-pulse-heading"
    >
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full blur-3xl opacity-70"
        style={{ background: 'radial-gradient(circle, rgba(0,109,119,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full blur-3xl opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(232,168,56,0.2) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner"
              style={{
                background: 'linear-gradient(135deg, rgba(0,109,119,0.2) 0%, rgba(232,168,56,0.15) 100%)',
                border: '1px solid rgba(0,109,119,0.2)',
              }}
            >
              <Sparkles className="h-6 w-6 text-teal" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="market-pulse-heading" className="text-xl font-bold tracking-tight text-content-primary">
                  Market &amp; health pulse
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Live brief
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm font-medium text-content-secondary">
                WHO · BBC Health · industry signals — stay current before you counsel customers or negotiate with suppliers.
              </p>
            </div>
          </div>
          {formattedTime && (
            <p className="text-xs font-semibold text-content-muted sm:text-right">
              Refreshed {formattedTime}
              <span className="hidden sm:inline"> · Accra</span>
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="skeleton h-56 rounded-3xl lg:col-span-5" />
            <div className="space-y-3 lg:col-span-7">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-16 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <div
              className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl border border-surface-border p-6 lg:col-span-5"
              style={{ background: 'var(--surface-base)' }}
              onMouseEnter={() => setPauseRotate(true)}
              onMouseLeave={() => setPauseRotate(false)}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-95 ${
                  current ? CATEGORY_META[current.category].gradientOverlay : ''
                }`}
              />
              <div className="relative z-10">
                {current && (() => {
                  const meta = CATEGORY_META[current.category];
                  const CatIcon = meta.Icon;
                  return (
                    <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}>
                      <CatIcon className="h-3.5 w-3.5" aria-hidden />
                      {meta.label}
                    </div>
                  );
                })()}
                <AnimatePresence mode="wait">
                  {current && (
                    <motion.div
                      key={current.title.slice(0, 80)}
                      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="text-lg font-bold leading-snug text-content-primary sm:text-xl">{current.title}</p>
                      {current.url && (
                        <a
                          href={current.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal hover:underline"
                        >
                          Read source
                          <ExternalLink className="h-4 w-4" aria-hidden />
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="relative z-10 mt-6 text-[11px] font-medium text-content-muted">
                Spotlight rotates automatically — hover to pause. Not financial or medical advice.
              </p>
            </div>

            <div className="lg:col-span-7">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-content-muted">More headlines</p>
              <ul className="max-h-[min(340px,52vh)] space-y-2 overflow-y-auto pr-1">
                {items.map((item, i) => {
                  const meta = CATEGORY_META[item.category];
                  const CatIcon = meta.Icon;
                  const isActive = i === spotlight;
                  return (
                    <li key={`${i}-${item.title.slice(0, 40)}`}>
                      <div
                        className={`flex w-full items-stretch gap-0 overflow-hidden rounded-2xl border transition-all ${
                          isActive
                            ? 'border-teal/40 bg-teal/5 shadow-sm'
                            : 'border-surface-border bg-surface-base hover:border-teal/25 hover:bg-surface-hover'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onPickSide(i)}
                          className="flex min-w-0 flex-1 items-start gap-3 p-3.5 text-left"
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${meta.chip}`}
                          >
                            <CatIcon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="line-clamp-2 text-sm font-semibold text-content-primary">{item.title}</span>
                        </button>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex shrink-0 items-center border-l border-surface-border px-3 text-teal hover:bg-surface-hover"
                            aria-label="Open article in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
