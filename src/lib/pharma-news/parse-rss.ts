function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Minimal RSS 2.0 item extraction — no XML dependency (titles + links only).
 */
export function parseRssItems(xml: string, limit: number): Array<{ title: string; url?: string }> {
  const items: Array<{ title: string; url?: string }> = [];
  const blocks = xml.split(/<item\b[^>]*>/i);

  for (let i = 1; i < blocks.length && items.length < limit; i++) {
    const block = blocks[i].split(/<\/item>/i)[0] ?? '';
    const titleRaw =
      block.match(/<title[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/title>/i)?.[1] ??
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const linkRaw = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];

    const title = decodeEntities(titleRaw?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? '');
    const url = linkRaw?.trim();
    if (title.length < 8) continue;
    items.push({ title, url: url && url.startsWith('http') ? url : undefined });
  }

  return items;
}
