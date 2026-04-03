/** Curated Unsplash pharmacy / medication imagery (editorial use). */
/** Working Unsplash slugs; older IDs have been removed after CDN 404s. */
export const PHARMA_STOCK_PHOTOS = [
  'photo-1587854692152-cbe660dbde88',
  'photo-1584308666744-24d5c474f2ae',
  'photo-1576091160399-112ba8d25d1d',
  'photo-1582719478250-c89cae4dc85b',
  'photo-1587854692152-cbe660dbde88',
  'photo-1584308666744-24d5c474f2ae',
  'photo-1576091160399-112ba8d25d1d',
  'photo-1582719478250-c89cae4dc85b',
] as const;

export function photoIndexForProduct(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % PHARMA_STOCK_PHOTOS.length;
}

export function pharmaStockPhotoUrl(seed: string, w = 160): string {
  const id = PHARMA_STOCK_PHOTOS[photoIndexForProduct(seed)];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${w}&q=80`;
}

/**
 * Stable seed for POS/dashboard when no uploaded image exists.
 * Uses id when available, then name + generic + category so different products get distinct stock art.
 */
export function productImageFallbackSeed(parts: {
  productId?: string;
  productName: string;
  genericName?: string | null;
  categoryName?: string | null;
}): string {
  const { productId, productName, genericName, categoryName } = parts;
  return [productId ?? '', productName, genericName ?? '', categoryName ?? ''].join('\u241e');
}
