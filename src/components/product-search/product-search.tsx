'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNestedLenis } from '@/lib/lenis/use-nested-lenis';
import { useProductSearch } from '@/hooks/use-product-search';
import { useNetworkStatus } from '@/hooks/use-network-status';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatStockFraction } from '@/lib/stock-display';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import {
  canOpenInventoryFromPos,
  canOpenSuppliersFromPos,
  inventoryProductHref,
  suppliersPageHref,
} from '@/lib/auth/pos-dashboard-links';
import type { UserRole } from '@/types';
import { SearchInput } from './search-input';
import { ProductGrid } from './product-grid';
import { ProductDetailPanel } from './product-detail-panel';
import { NoResults } from './no-results';
import type { Product } from '@/types';

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

function getStockStatus(product: Product): { status: StockStatus; qty: number; reorder: number } {
  const qty = product.inventory?.quantityOnHand ?? 0;
  const reorder = product.inventory?.reorderLevel ?? 10;
  if (qty <= 0) return { status: 'out', qty, reorder };
  if (qty <= Math.max(1, Math.floor(reorder * 0.2))) return { status: 'critical', qty, reorder };
  if (qty <= reorder) return { status: 'low', qty, reorder };
  return { status: 'ok', qty, reorder };
}

export function ProductSearch() {
  const shouldReduceMotion = useReducedMotion();
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const resultsInnerRef = useRef<HTMLDivElement>(null);
  const { isOnline } = useNetworkStatus();
  const { user } = useAuthStore();
  const branchId = user?.branch_id ?? '';
  const role = user?.role as UserRole | undefined;
  const canProductDash = canOpenInventoryFromPos(role);
  const canSupplierDash = canOpenSuppliersFromPos(role);

  const { query, setQuery, results, loading, isBarcodeScan } = useProductSearch({ branchId, isOnline });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const showResults   = query.length >= 2;
  const showNoResults = showResults && !loading && results.length === 0;
  const normalizedQuery = query.trim().toLowerCase();
  const quickMatch = results.find((p) =>
    p.name.toLowerCase() === normalizedQuery ||
    (p.genericName ?? '').toLowerCase() === normalizedQuery ||
    (p.barcode ?? '').toLowerCase() === normalizedQuery,
  ) ?? results[0];
  const quickStock = quickMatch ? getStockStatus(quickMatch) : null;
  const quickSessionPeak = useInventorySyncStore((s) =>
    branchId && quickMatch
      ? s.displayCaps[stockSnapshotKey(branchId, quickMatch.id)]
      : undefined,
  );

  useNestedLenis(resultsScrollRef, resultsInnerRef, {
    enabled: !shouldReduceMotion,
    layoutKey: `${query.length}-${results.length}-${loading ? 1 : 0}`,
    syncTouch: true,
  });

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: 'var(--surface-base)' }}>
      {/* Search bar */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ background: '#ffffff', borderBottom: '1px solid var(--surface-border)' }}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          loading={loading}
          isBarcodeScan={isBarcodeScan}
        />
        {/* Hint row */}
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {showResults
              ? loading
                ? 'Searching…'
                : `${results.length} product${results.length !== 1 ? 's' : ''} found`
              : 'Type 2+ characters or scan barcode'}
          </p>
          {isBarcodeScan && (
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal)' }}
            >
              Barcode scan
            </span>
          )}
        </div>
        {showResults && !loading && quickMatch && quickStock && (
          <div
            className="mt-3 rounded-xl px-4 py-2.5 text-sm"
            style={{
              background:
                quickStock.status === 'ok'
                  ? 'rgba(22,163,74,0.08)'
                  : quickStock.status === 'low'
                    ? 'rgba(217,119,6,0.08)'
                    : 'rgba(220,38,38,0.08)',
              border:
                quickStock.status === 'ok'
                  ? '1px solid rgba(22,163,74,0.2)'
                  : quickStock.status === 'low'
                    ? '1px solid rgba(217,119,6,0.25)'
                    : '1px solid rgba(220,38,38,0.25)',
              color:
                quickStock.status === 'ok'
                  ? '#15803d'
                  : quickStock.status === 'low'
                    ? '#92400e'
                    : '#b91c1c',
            }}
          >
            {canProductDash ? (
              <Link
                href={inventoryProductHref(quickMatch.id)}
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: 'inherit' }}
              >
                {quickMatch.name}
              </Link>
            ) : (
              <span className="font-semibold">{quickMatch.name}</span>
            )}
            <span>: </span>
            {quickStock.status === 'ok'
              ? `In stock (${formatStockFraction(quickStock.qty, quickStock.reorder, quickSessionPeak)}).`
              : quickStock.status === 'low'
                ? `Low stock (${formatStockFraction(quickStock.qty, quickStock.reorder, quickSessionPeak)}); reorder at ${quickStock.reorder}.`
                : quickStock.status === 'critical'
                  ? `Critical stock (${formatStockFraction(quickStock.qty, quickStock.reorder, quickSessionPeak)}).`
                  : `Out of stock (${formatStockFraction(quickStock.qty, quickStock.reorder, quickSessionPeak)}).`}
            {quickMatch.supplier?.name ? (
              <>
                {' '}
                Supplier:{' '}
                {canSupplierDash && quickMatch.supplier.id ? (
                  <Link
                    href={suppliersPageHref(quickMatch.supplier.id)}
                    className="font-semibold underline-offset-2 hover:underline"
                    style={{ color: 'inherit' }}
                  >
                    {quickMatch.supplier.name}
                  </Link>
                ) : (
                  <span className="font-semibold">{quickMatch.supplier.name}</span>
                )}
                .
              </>
            ) : null}
            {quickStock.status !== 'ok' ? ' Inform manager to reorder now.' : ''}
          </div>
        )}
      </div>

      {/* Results area — nested Lenis: smooth wheel + touch swipe on tablet / POS */}
      <div
        ref={resultsScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth p-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div ref={resultsInnerRef}>
          {/* aria-live for barcode scan announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isBarcodeScan && results[0] ? `Scanned: ${results[0].name}` : ''}
          </div>

          <AnimatePresence mode="wait">
            {showNoResults ? (
              <NoResults key="no-results" query={query} />
            ) : (
              <ProductGrid
                key="grid"
                products={results}
                loading={loading}
                onSelect={setSelectedProduct}
                shouldReduceMotion={shouldReduceMotion ?? false}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Detail panel overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailPanel
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            shouldReduceMotion={shouldReduceMotion ?? false}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
