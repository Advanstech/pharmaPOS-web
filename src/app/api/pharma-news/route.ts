import { NextResponse } from 'next/server';
import { parseRssItems } from '@/lib/pharma-news/parse-rss';
import { sanitizeNewsItem } from '@/lib/pharma-news/sanitize-news-item';
import { PHARMA_MARKET_FALLBACK, PHARMA_NEWS_FALLBACK } from '@/lib/pharma-news/fallback-headlines';
import type { PharmaNewsItem } from '@/lib/pharma-news/types';

const WHO_NEWS_RSS = 'https://www.who.int/rss-feeds/news-english.xml';
const BBC_HEALTH_RSS = 'https://feeds.bbci.co.uk/news/health/rss.xml';
/** Industry / commercial pharma — may occasionally block bots; fallbacks cover gaps. */
const FIERCE_PHARMA_RSS = 'https://www.fiercepharma.com/rss/xml';

async function fetchFeed(url: string, limit: number): Promise<Array<{ title: string; url?: string }>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Azzay Pharmacy-Pro/1.0 (staff-awareness-ticker)',
      },
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const raw = parseRssItems(xml, limit);
    return raw.map((i) => sanitizeNewsItem(i, url));
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

function tag(
  items: Array<{ title: string; url?: string }>,
  category: PharmaNewsItem['category'],
): PharmaNewsItem[] {
  return items.map((i) => ({ title: i.title, url: i.url, category }));
}

function dedupeByTitle(items: PharmaNewsItem[]): PharmaNewsItem[] {
  const seen = new Set<string>();
  const out: PharmaNewsItem[] = [];
  for (const it of items) {
    const key = it.title.toLowerCase().slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/**
 * Public JSON — WHO + BBC Health + industry RSS, merged with operational fallbacks.
 * Query: `limit` (6–24, default 18). Optional env: `PHARMA_NEWS_EXTRA_RSS_URL` (tagged as health).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(24, Math.max(6, parseInt(searchParams.get('limit') ?? '18', 10) || 18));

  const extra = process.env.PHARMA_NEWS_EXTRA_RSS_URL?.trim();

  const [who, bbc, fierce, extraFeed] = await Promise.all([
    fetchFeed(WHO_NEWS_RSS, 8),
    fetchFeed(BBC_HEALTH_RSS, 8),
    fetchFeed(FIERCE_PHARMA_RSS, 6),
    extra ? fetchFeed(extra, 6) : Promise.resolve([]),
  ]);

  let merged = dedupeByTitle([
    ...tag(who, 'health'),
    ...tag(bbc, 'health'),
    ...tag(fierce, 'industry'),
    ...tag(extraFeed, 'health'),
  ]);

  if (merged.filter((i) => i.category === 'industry').length < 2) {
    merged = dedupeByTitle([...merged, ...PHARMA_MARKET_FALLBACK]);
  }

  if (merged.length < 6) {
    merged = dedupeByTitle([...merged, ...PHARMA_NEWS_FALLBACK]);
  }

  merged = merged.slice(0, limit);

  const fromRss = who.length + bbc.length + fierce.length + extraFeed.length > 0;

  return NextResponse.json(
    {
      items: merged,
      source: fromRss ? 'rss+fallback' : 'fallback',
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    },
  );
}
