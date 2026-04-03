/**
 * POS / product search: show on-hand vs a simple capacity hint (reorder × 2, at least reorder, never below on-hand).
 * Example: reorder 20 → total 40 → "13/40"; overstock 50 → "50/50".
 */
export function stockCurrentOverCapacity(qty: number, reorderLevel: number): { current: number; total: number } {
  const reorder = Math.max(1, reorderLevel);
  const baseline = Math.max(reorder * 2, reorder);
  const total = Math.max(baseline, qty);
  return { current: qty, total };
}

/**
 * `naturalTotal` from {@link stockCurrentOverCapacity} drops when qty drops (e.g. 500/500 → 499/499).
 * Pass `sessionPeakTotal` from the POS inventory sync store (highest natural total seen this session)
 * so the denominator stays stable after sales (499/500) until restock pushes it up again.
 */
export function formatStockFraction(
  qty: number,
  reorderLevel: number,
  sessionPeakTotal?: number,
): string {
  const { current, total: naturalTotal } = stockCurrentOverCapacity(qty, reorderLevel);
  const total =
    sessionPeakTotal === undefined
      ? naturalTotal
      : Math.max(sessionPeakTotal, naturalTotal);
  return `${current}/${total}`;
}
