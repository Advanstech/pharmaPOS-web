/**
 * PharmaPOS Pro brand tokens — single source of truth
 * Inlined from packages/ui — no workspace dependency at deploy time
 * Use CSS custom properties in components, never hardcode hex in JS
 */

export const BRAND = {
  teal: {
    primary: '#006D77',
    dark: '#004E57',
    light: '#C8E6EA',
  },
  gold: {
    accent: '#E8A838',
    surface: '#FDF3DC',
  },
} as const;

export type BrandColor = typeof BRAND;
