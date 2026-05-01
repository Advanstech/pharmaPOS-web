'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { HorizontalSwipableTicker } from '@/components/ui/horizontal-swipable-ticker';
import { PHARMA_NEWS_FALLBACK } from '@/lib/pharma-news/fallback-headlines';
import { stripHtmlNewsTitle } from '@/lib/pharma-news/sanitize-news-item';
import { useAuthStore } from '@/lib/store/auth.store';

type NewsItem = { title: string; url?: string };

interface ApiResponse {
  items: NewsItem[];
}

function buildTickerSegments(items: NewsItem[]): NewsItem[] {
  const clean = items
    .map((i) => ({ title: stripHtmlNewsTitle(i.title).replace(/\s+/g, ' ').trim(), url: i.url }))
    .filter((i) => i.title);
  if (clean.length === 0) return PHARMA_NEWS_FALLBACK;
  return clean;
}

export function PharmaNewsTicker() {
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuthStore();
  const [segments, setSegments] = useState<NewsItem[]>(() => PHARMA_NEWS_FALLBACK);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pharma-news', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;
        if (cancelled || !Array.isArray(data.items) || data.items.length === 0) return;
        setSegments(buildTickerSegments(data.items));
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showTicker = mounted && segments.length > 0;

  return (
    <div
      className="relative flex-1 min-w-0 max-w-2xl lg:max-w-none mx-2 lg:mx-6 hidden md:flex items-center gap-2 rounded-xl border px-3 py-1.5 overflow-hidden"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--surface-border)',
        boxShadow: 'var(--shadow-card)',
      }}
      aria-label="Pharmacy and public health news headlines for staff awareness"
    >
      <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: 'rgba(0,109,119,0.1)' }} aria-hidden>
        <Newspaper className="w-3.5 h-3.5" style={{ color: 'var(--color-teal)' }} strokeWidth={2} />
      </span>

      {showTicker ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <HorizontalSwipableTicker
            items={segments}
            variant="landing"
            reducedMotion={!!prefersReducedMotion}
            pauseOnHover
            className="min-w-0"
            renderItem={(item) => (
              <Link
                href={user ? `/dashboard/market-intelligence?article=${encodeURIComponent(item.title)}` : '/login'}
                className="text-[11px] sm:text-xs font-medium pr-1 hover:underline"
                style={{ color: 'var(--text-secondary)' }}
                aria-label={`Read: ${item.title} (login required)`}
                title={`Read: ${item.title}`}
              >
                {item.title}
              </Link>
            )}
            separator={
              <span className="text-[11px] sm:text-xs px-3 opacity-40" style={{ color: 'var(--color-teal)' }} aria-hidden>
                |
              </span>
            }
          />
        </div>
      ) : (
        <Link
          href={user ? `/dashboard/market-intelligence?article=${encodeURIComponent(segments[0]?.title || '')}` : '/login'}
          className="min-w-0 flex-1 text-[11px] sm:text-xs font-medium leading-snug line-clamp-2 hover:underline"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Open market intelligence (login required)"
          title="Open market intelligence"
        >
          {segments[0]?.title ?? PHARMA_NEWS_FALLBACK[0].title}
        </Link>
      )}

      <span className="sr-only">
        Headlines refresh periodically from WHO and BBC Health RSS when available, plus Azzay Pharmacy awareness tips.
      </span>
    </div>
  );
}
