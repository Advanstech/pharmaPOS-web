/**
 * RSS feeds sometimes put HTML (e.g. `<a href="...">title</a>`) inside `<title>`.
 * Strip that to plain text, resolve relative hrefs against the feed URL, and avoid
 * showing raw markup or relying on nested anchors in the UI.
 */

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripTagsToText(html: string): string {
  const noTags = html.replace(/<[^>]+>/g, ' ');
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim();
}

function firstAnchorInTitle(title: string): { href: string; inner: string } | null {
  const m = title.match(/<a\s[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if (!m) return null;
  return { href: m[1].trim(), inner: m[2] ?? '' };
}

function resolveHref(href: string, feedBaseUrl: string): string | undefined {
  const h = href.trim();
  if (!h) return undefined;
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('//')) return `https:${h}`;
  try {
    const base = new URL(feedBaseUrl);
    if (h.startsWith('/')) return `${base.origin}${h}`;
    return new URL(h, `${base.origin}/`).href;
  } catch {
    return undefined;
  }
}

/** Plain text for display — strips embedded `<a>` and other tags without resolving URLs (client-safe). */
export function stripHtmlNewsTitle(title: string): string {
  const anchor = firstAnchorInTitle(title);
  if (anchor) {
    const plain = stripTagsToText(anchor.inner);
    return plain || stripTagsToText(title);
  }
  return stripTagsToText(title);
}

export function sanitizeNewsItem(
  item: { title: string; url?: string },
  feedBaseUrl: string,
): { title: string; url?: string } {
  const anchor = firstAnchorInTitle(item.title);
  const fallbackUrl = item.url?.startsWith('http') ? item.url : undefined;

  if (anchor) {
    const plain = stripTagsToText(anchor.inner);
    const resolved = resolveHref(anchor.href, feedBaseUrl);
    return {
      title: plain || stripTagsToText(item.title),
      url: resolved ?? fallbackUrl,
    };
  }

  return {
    title: stripTagsToText(item.title),
    url: fallbackUrl,
  };
}
