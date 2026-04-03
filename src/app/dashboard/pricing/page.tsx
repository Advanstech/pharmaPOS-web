'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { DollarSign, History } from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { useAuthStore } from '@/lib/store/auth.store';
import type { Product } from '@/types';
import { SEARCH_PRODUCTS_QUERY } from '@/lib/graphql/products.queries';
import {
  LATEST_PRODUCT_COSTS,
  PRODUCT_PRICE_HISTORY,
} from '@/lib/graphql/pricing.queries';
import {
  BULK_UPDATE_PRODUCT_PRICES,
  UPDATE_PRODUCT_PRICE,
} from '@/lib/graphql/pricing.mutations';
import { GhsMoney } from '@/components/ui/ghs-money';
import { Pagination } from '@/components/ui/pagination';

type PriceHistoryRow = {
  id: string;
  oldPriceGhsPesewas: number;
  newPriceGhsPesewas: number;
  reason?: string | null;
  changedByName: string;
  changedAt: string;
};

type ProductCostSnapshot = {
  productId: string;
  latestCostPesewas: number;
  latestCostFormatted: string;
  sourceType: string;
  observedAt: string;
};

function toPesewas(ghs: number): number {
  return Math.max(1, Math.round(ghs * 100));
}

export default function PricingPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [defaultMarginPct, setDefaultMarginPct] = useState(25);
  const [costByProduct, setCostByProduct] = useState<Record<string, string>>({});
  const [marginByProduct, setMarginByProduct] = useState<Record<string, string>>({});
  const [manualSellByProduct, setManualSellByProduct] = useState<Record<string, string>>(
    {},
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const canManagePricing = user
    ? ['owner', 'se_admin', 'manager'].includes(user.role)
    : false;
  const branchId = user?.branch_id ?? '';

  const {
    data: searchData,
    loading: searchLoading,
    refetch: refetchProducts,
  } = useQuery<{ searchProducts: Product[] }>(SEARCH_PRODUCTS_QUERY, {
    variables: { query, branchId, limit: 50 },
    skip: !canManagePricing || !branchId || query.trim().length < 2,
    fetchPolicy: 'cache-and-network',
  });

  const { data: historyData, loading: historyLoading } = useQuery<{
    productPriceHistory: PriceHistoryRow[];
  }>(PRODUCT_PRICE_HISTORY, {
    variables: { productId: selectedProductId ?? '', limit: 12 },
    skip: !selectedProductId,
    fetchPolicy: 'network-only',
  });

  const [updateProductPrice, { loading: updatingOne }] = useMutation(
    UPDATE_PRODUCT_PRICE,
  );
  const [bulkUpdateProductPrices, { loading: updatingBulk }] = useMutation(
    BULK_UPDATE_PRODUCT_PRICES,
  );

  const products = searchData?.searchProducts ?? [];
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: latestCostData } = useQuery<{ latestProductCosts: ProductCostSnapshot[] }>(
    LATEST_PRODUCT_COSTS,
    {
      variables: { productIds },
      skip: !canManagePricing || productIds.length === 0,
      fetchPolicy: 'cache-and-network',
    },
  );

  useEffect(() => {
    const snapshots = latestCostData?.latestProductCosts ?? [];
    if (snapshots.length === 0) return;
    setCostByProduct((prev) => {
      const next = { ...prev };
      for (const snap of snapshots) {
        if (next[snap.productId] == null || next[snap.productId] === '') {
          next[snap.productId] = (snap.latestCostPesewas / 100).toFixed(2);
        }
      }
      return next;
    });
  }, [latestCostData]);

  const rows = useMemo(() => {
    return products.map((p) => {
      const costInput = costByProduct[p.id];
      const marginInput = marginByProduct[p.id];
      const marginPct =
        marginInput === undefined || marginInput === ''
          ? defaultMarginPct
          : Number(marginInput);
      const costGhs =
        costInput === undefined || costInput === ''
          ? null
          : Number(costInput);

      const currentSellGhs = p.unitPrice / 100;
      const manualSellInput = manualSellByProduct[p.id];
      const manualSellGhs =
        manualSellInput === undefined || manualSellInput === ''
          ? null
          : Number(manualSellInput);
      const suggestedSellGhs =
        costGhs !== null && Number.isFinite(costGhs)
          ? Math.max(0.01, Number((costGhs * (1 + marginPct / 100)).toFixed(2)))
          : currentSellGhs;

      return {
        product: p,
        costGhs,
        marginPct: Number.isFinite(marginPct) ? marginPct : defaultMarginPct,
        currentSellGhs,
        suggestedSellGhs,
        manualSellGhs:
          manualSellGhs !== null && Number.isFinite(manualSellGhs) && manualSellGhs > 0
            ? manualSellGhs
            : null,
      };
    });
  }, [products, costByProduct, marginByProduct, manualSellByProduct, defaultMarginPct]);

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const paginatedRows = rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when query changes
  useMemo(() => {
    setCurrentPage(1);
  }, [query]);

  async function applySinglePrice(row: (typeof rows)[number]): Promise<void> {
    setError(null);
    if (row.costGhs === null || !Number.isFinite(row.costGhs) || row.costGhs <= 0) {
      setError(`Enter supplier cost for ${row.product.name} first.`);
      return;
    }
    try {
      await updateProductPrice({
        variables: {
          input: {
            productId: row.product.id,
            unitPriceGhsPesewas: toPesewas(row.suggestedSellGhs),
            reason: `Cost-based margin pricing: cost GH¢${row.costGhs.toFixed(
              2,
            )}, margin ${row.marginPct.toFixed(1)}%`,
          },
        },
      });
      await refetchProducts();
      setSelectedProductId(row.product.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update price.');
    }
  }

  async function applyBulkPricing(): Promise<void> {
    setError(null);
    const updates = rows
      .filter((r) => r.costGhs !== null && Number.isFinite(r.costGhs) && (r.costGhs ?? 0) > 0)
      .map((r) => ({
        productId: r.product.id,
        unitPriceGhsPesewas: toPesewas(r.suggestedSellGhs),
        reason: `Bulk cost-margin update: cost GH¢${(r.costGhs as number).toFixed(
          2,
        )}, margin ${r.marginPct.toFixed(1)}%`,
      }));

    if (updates.length === 0) {
      setError('No products with supplier cost entered for bulk apply.');
      return;
    }

    try {
      await bulkUpdateProductPrices({ variables: { input: { updates } } });
      await refetchProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk pricing update failed.');
    }
  }

  async function applyManualPrice(row: (typeof rows)[number]): Promise<void> {
    setError(null);
    if (row.manualSellGhs === null) {
      setError(`Enter a manual selling price for ${row.product.name}.`);
      return;
    }
    try {
      await updateProductPrice({
        variables: {
          input: {
            productId: row.product.id,
            unitPriceGhsPesewas: toPesewas(row.manualSellGhs),
            reason: `Manager override price set to GH¢${row.manualSellGhs.toFixed(2)}`,
          },
        },
      });
      await refetchProducts();
      setSelectedProductId(row.product.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply manual price.');
    }
  }

  if (!canManagePricing) {
    return (
      <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#b91c1c' }}
        >
          You do not have access to pricing controls.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Pricing Control</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          Auto-prefilled supplier costs from GRN, margin-based pricing, plus manual manager overrides per product.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_200px]">
        <SearchFieldWithClear
          wrapperClassName="min-w-0"
          value={query}
          onValueChange={setQuery}
          iconSize={15}
          placeholder="Search product name, generic or barcode..."
          className="w-full rounded-lg py-2 pl-9 pr-10 text-sm outline-none"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
          }}
        />
        <label className="rounded-lg px-3 py-2" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Default margin %</p>
          <input
            type="number"
            min={0}
            step="0.5"
            value={defaultMarginPct}
            onChange={(e) => setDefaultMarginPct(Number(e.target.value || 0))}
            className="mt-0.5 w-full bg-transparent text-sm font-semibold outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </label>
        <button
          type="button"
          onClick={() => void applyBulkPricing()}
          disabled={updatingBulk || updatingOne}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'var(--color-teal)' }}
        >
          <DollarSign size={15} />
          {updatingBulk ? 'Applying...' : 'Apply To Filtered'}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div
          className="overflow-x-auto rounded-xl"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr
                className="text-left text-xs font-medium uppercase tracking-wide"
                style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-muted)' }}
              >
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Current</th>
                <th className="px-3 py-3">Supplier cost</th>
                <th className="px-3 py-3">Margin %</th>
                <th className="px-3 py-3">Suggested</th>
                <th className="px-3 py-3">Manual sell</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr key={row.product.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedProductId(row.product.id)}
                      className="text-left"
                    >
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.product.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {row.product.supplier?.name ?? 'No supplier linked'}
                      </p>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <GhsMoney amount={row.currentSellGhs} className="font-mono text-sm" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={costByProduct[row.product.id] ?? ''}
                      onChange={(e) =>
                        setCostByProduct((prev) => ({ ...prev, [row.product.id]: e.target.value }))
                      }
                      className="w-[110px] rounded-md px-2 py-1 text-xs outline-none"
                      style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                      placeholder="Auto from GRN"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={marginByProduct[row.product.id] ?? ''}
                      onChange={(e) =>
                        setMarginByProduct((prev) => ({ ...prev, [row.product.id]: e.target.value }))
                      }
                      className="w-[90px] rounded-md px-2 py-1 text-xs outline-none"
                      style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                      placeholder={String(defaultMarginPct)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <GhsMoney amount={row.suggestedSellGhs} className="font-mono text-sm font-semibold" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={manualSellByProduct[row.product.id] ?? ''}
                      onChange={(e) =>
                        setManualSellByProduct((prev) => ({ ...prev, [row.product.id]: e.target.value }))
                      }
                      className="w-[110px] rounded-md px-2 py-1 text-xs outline-none"
                      style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                      placeholder="Optional"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void applySinglePrice(row)}
                        disabled={updatingOne || updatingBulk}
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        style={{ background: 'var(--color-teal)' }}
                      >
                        Apply margin
                      </button>
                      <button
                        type="button"
                        onClick={() => void applyManualPrice(row)}
                        disabled={updatingOne || updatingBulk}
                        className="rounded-md px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60"
                        style={{
                          border: '1px solid var(--surface-border)',
                          color: 'var(--text-secondary)',
                          background: 'var(--surface-base)',
                        }}
                      >
                        Manual set
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {query.trim().length < 2 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Type at least 2 characters to manage product pricing.
                  </td>
                </tr>
              )}
              {query.trim().length >= 2 && !searchLoading && paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No products found for this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {rows.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={rows.length}
              itemsPerPage={itemsPerPage}
            />
          )}
        </div>

        <div
          className="rounded-xl p-4"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <History size={15} style={{ color: 'var(--text-secondary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Price history</h2>
          </div>
          {!selectedProductId && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Select a product to view recent pricing actions.
            </p>
          )}
          {selectedProductId && historyLoading && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading history...</p>
          )}
          {selectedProductId && !historyLoading && (
            <div className="space-y-2">
              {(historyData?.productPriceHistory ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg p-3"
                  style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(entry.changedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-mono">GH¢{(entry.oldPriceGhsPesewas / 100).toFixed(2)}</span>
                    {' '}→{' '}
                    <span className="font-mono">GH¢{(entry.newPriceGhsPesewas / 100).toFixed(2)}</span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {entry.reason || 'No reason recorded'} · by {entry.changedByName}
                  </p>
                </div>
              ))}
              {(historyData?.productPriceHistory ?? []).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No history for this product yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
