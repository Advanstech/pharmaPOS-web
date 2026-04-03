import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Numeric part only (two decimals) — pair with {@link GhsMoney} or {@link formatGhs} for display */
export function formatGhsAmount(amount: number): string {
  return amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Plain-text GHS label for aria-labels and non-React contexts.
 * Avoids Intl `currency: GHS` which often renders an oversized ₵ glyph.
 */
export function formatGhs(amount: number): string {
  return `GH¢${formatGhsAmount(amount)}`;
}

/** Normalize API-formatted currency text to compact GH¢ rendering. */
export function compactGhsLabel(value: string): string {
  return value.replace(/GH₵/g, 'GH¢');
}

/** Format a date in Africa/Accra timezone */
export function formatAccraDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra' });
}
