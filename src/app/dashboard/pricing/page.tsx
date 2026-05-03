'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  DollarSign, History, TrendingUp, TrendingDown, Search, ArrowLeft,
  AlertTriangle, CheckCircle, Percent, Tag, ArrowRight, Filter, X,
  Building2, Package, ChevronDown, Truck, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth.store';
import type { Product } from '@/types';
import { SEARCH_PRODUCTS_QUERY } from '@/lib/graphql/products.queries';
import { SUPPLIERS_LIST_QUERY } from '@/lib/graphql/suppliers.queries';
import { LATEST_PRODUCT_COSTS, PRODUCT_PRICE_HISTORY } from '@/lib/graphql/pricing.queries';
import { UPDATE_PRODUCT_PRICE, BULK_UPDATE_PRODUCT_PRICES } from '@/lib/graphql/pricing.mutations';
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

function fmt(pesewas: number) { return 'GH\u20B5' + (pesewas / 100).toFixed(2); }
function toPesewas(ghs: number) { return Math.max(1, Math.round(ghs * 100)); }

export default function PricingPage() {
  const { user } = useAuthStore();
  const canManage = user ? ['owner', 'se_admin', 'manager'].includes(user.role) : false;
  const branchId = user?.branch_id ?? '';

  const [query, setQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [defaultMargin, setDefaultMargin] = useState(25);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editReason, setEditReason] = useState('');
  const [reasonFocused, setReasonFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Fetch suppliers for dropdown filter
  const { data: suppliersData } = useQuery<{ suppliers: Array<{ id: string; name: string; isActive: boolean }> }>(
    SUPPLIERS_LIST_QUERY,
    { skip: !canManage, fetchPolicy: 'cache-and-network' },
  );
  const suppliers = suppliersData?.suppliers?.filter(s => s.isActive) ?? [];
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Search products (show all with empty query by using a space)
  const searchQuery = query.trim().length >= 2 ? query : 'a'; // Default search to show products
  const { data: searchData, loading: searchLoading, refetch } = useQuery<{ searchProducts: Product[] }>(
    SEARCH_PRODUCTS_QUERY,
    { variables: { query: searchQuery, branchId, limit: 200 }, skip: !canManage || !branchId, fetchPolicy: 'cache-and-network' },
  );

  const products = searchData?.searchProducts ?? [];
  const productIds = useMemo(() => products.map(p => p.id), [products]);

  // Get latest supplier costs
  const { data: costData } = useQuery<{ latestProductCosts: ProductCostSnapshot[] }>(
    LATEST_PRODUCT_COSTS,
    { variables: { productIds }, skip: productIds.length === 0, fetchPolicy: 'cache-and-network' },
  );
  const costMap = useMemo(() => {
    const m = new Map<string, ProductCostSnapshot>();
    for (const c of costData?.latestProductCosts ?? []) m.set(c.productId, c);
    return m;
  }, [costData]);

  // Price history for selected product
  const { data: historyData, loading: historyLoading } = useQuery<{ productPriceHistory: PriceHistoryRow[] }>(
    PRODUCT_PRICE_HISTORY,
    { variables: { productId: selectedId ?? '', limit: 20 }, skip: !selectedId, fetchPolicy: 'network-only' },
  );

  const [updatePrice, { loading: updating }] = useMutation(UPDATE_PRODUCT_PRICE);
  const [bulkUpdate, { loading: bulkUpdating }] = useMutation(BULK_UPDATE_PRODUCT_PRICES);

  // Build rows with margin calculations
  const rows = useMemo(() => {
    return products.map(p => {
      const cost = costMap.get(p.id);
      const costPesewas = cost?.latestCostPesewas ?? 0;
      const sellPesewas = p.unitPrice;
      const marginPesewas = sellPesewas - costPesewas;
      const marginPct = costPesewas > 0 ? (marginPesewas / costPesewas) * 100 : 0;
      const suggestedSell = costPesewas > 0 ? Math.round(costPesewas * (1 + defaultMargin / 100)) : sellPesewas;
      const priceDiff = suggestedSell - sellPesewas;

      return {
        product: p,
        costPesewas,
        costFormatted: cost?.latestCostFormatted ?? '\u2014',
        sellPesewas,
        marginPesewas,
        marginPct,
        suggestedSell,
        priceDiff,
        hasCost: costPesewas > 0,
        marginHealth: costPesewas > 0 ? (marginPct >= 20 ? 'good' : marginPct >= 10 ? 'low' : marginPct > 0 ? 'thin' : 'loss') : 'unknown',
      };
    });
  }, [products, costMap, defaultMargin]);

  // Filter by search and supplier
  const filtered = useMemo(() => {
    let result = rows;
    // Filter by supplier first
    if (selectedSupplierId) {
      result = result.filter(r => r.product.supplier?.id === selectedSupplierId);
    }
    // Then filter by search query
    if (query.trim().length >= 2) {
      const q = query.toLowerCase();
      result = result.filter(r =>
        r.product.name.toLowerCase().includes(q) ||
        r.product.supplier?.name?.toLowerCase().includes(q) ||
        r.product.barcode?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, query, selectedSupplierId]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [query, selectedSupplierId]);

  // Stats - overall and filtered for selected supplier
  const stats = useMemo(() => {
    const targetRows = selectedSupplierId ? rows.filter(r => r.product.supplier?.id === selectedSupplierId) : rows;
    let withCost = 0, belowMargin = 0, atLoss = 0, totalValue = 0, totalCostValue = 0;
    for (const r of targetRows) {
      if (r.hasCost) {
        withCost++;
        totalCostValue += r.costPesewas;
        totalValue += r.sellPesewas;
      }
      if (r.hasCost && r.marginPct < 20) belowMargin++;
      if (r.hasCost && r.marginPct <= 0) atLoss++;
    }
    const avgMargin = totalCostValue > 0 ? Math.round(((totalValue - totalCostValue) / totalCostValue) * 100) : 0;
    return { total: targetRows.length, withCost, belowMargin, atLoss, avgMargin };
  }, [rows, selectedSupplierId]);

  const handleSavePrice = async (productId: string) => {
    setError(null); setSuccess(null);
    const pp = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(pp) || pp <= 0) { setError('Enter a valid price'); return; }
    try {
      await updatePrice({ variables: { input: { productId, unitPriceGhsPesewas: pp, reason: editReason.trim() || 'Price update' } } });
      setEditingId(null); setEditPrice(''); setEditReason('');
      setSuccess('Price updated'); setSelectedId(productId);
      setTimeout(() => setSuccess(null), 3000);
      refetch();
    } catch (e: any) { setError(e?.message || 'Failed to update price'); }
  };

  const handleBulkApply = async () => {
    setError(null); setSuccess(null);
    const updates = rows.filter(r => r.hasCost && Math.abs(r.priceDiff) > 0).map(r => ({
      productId: r.product.id,
      unitPriceGhsPesewas: r.suggestedSell,
      reason: 'Bulk margin update: ' + defaultMargin + '% on cost ' + r.costFormatted,
    }));
    if (updates.length === 0) { setError('No products with cost data to update'); return; }
    try {
      await bulkUpdate({ variables: { input: { updates } } });
      setSuccess(updates.length + ' prices updated'); refetch();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e?.message || 'Bulk update failed'); }
  };

  if (!canManage) {
    return (
      <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="rounded-lg px-4 py-3 text-sm" style={{ border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#b91c1c' }}>
          Pricing control is restricted to managers and owners.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(245,158,11,0.05) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-4 md:px-6">
          <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Dashboard</Link>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Pricing Control</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cost-based margin pricing, manual overrides, and price history</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowBulkPanel(v => !v)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
              >
                <DollarSign size={13} /> Set Prices by Margin
              </button>
            </div>
          </div>

          {/* KPI strip - shows supplier-specific stats when filtered */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MiniKpi
              label={selectedSupplierId ? 'Supplier Products' : 'Products'}
              value={String(stats.total)}
              color="#0d9488"
              icon={<Package size={12} />}
            />
            <MiniKpi
              label="With Cost Data"
              value={String(stats.withCost)}
              color="#3b82f6"
              icon={<DollarSign size={12} />}
            />
            <MiniKpi
              label="Avg Margin"
              value={`${stats.avgMargin}%`}
              color={stats.avgMargin >= 25 ? '#16a34a' : stats.avgMargin >= 15 ? '#f59e0b' : '#dc2626'}
              icon={<TrendingUp size={12} />}
            />
            <MiniKpi
              label="Below 20% Margin"
              value={String(stats.belowMargin)}
              color={stats.belowMargin > 0 ? '#f59e0b' : '#16a34a'}
              icon={<AlertTriangle size={12} />}
            />
            <MiniKpi
              label="At Loss"
              value={String(stats.atLoss)}
              color={stats.atLoss > 0 ? '#dc2626' : '#16a34a'}
              icon={<TrendingDown size={12} />}
            />
          </div>

          {/* Bulk margin panel - respects supplier filter */}
          {showBulkPanel && (
            <BulkMarginPanel
              defaultMargin={defaultMargin}
              onMarginChange={setDefaultMargin}
              selectedSupplierName={selectedSupplier?.name}
              affectedCount={filtered.filter(r => r.hasCost && Math.abs(r.priceDiff) > 0).length}
              totalWithCost={filtered.filter(r => r.hasCost).length}
              previewRows={filtered.filter(r => r.hasCost && Math.abs(r.priceDiff) > 0).slice(0, 4)}
              loading={bulkUpdating}
              onApply={() => { void handleBulkApply(); setShowBulkPanel(false); }}
              onClose={() => setShowBulkPanel(false)}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6">
        {/* Messages */}
        {error && <div className="mb-4 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>{error}</div>}
        {success && <div className="mb-4 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'rgba(22,163,74,0.07)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}><CheckCircle size={14} className="inline mr-1" />{success}</div>}

        {/* Filter Bar - Search + Supplier */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Product Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search product or barcode..."
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/20"
              style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Supplier Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all hover:bg-[var(--surface-hover)]"
              style={{
                background: selectedSupplierId ? 'rgba(13,148,136,0.08)' : 'var(--surface-card)',
                borderColor: selectedSupplierId ? 'rgba(13,148,136,0.3)' : 'var(--surface-border)',
                color: selectedSupplierId ? '#0d9488' : 'var(--text-primary)',
              }}
            >
              <Truck size={14} />
              <span className="max-w-[140px] truncate">
                {selectedSupplier ? selectedSupplier.name : 'Filter by Supplier'}
              </span>
              <ChevronDown size={14} className={`transition-transform ${showSupplierDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Supplier Dropdown Menu */}
            {showSupplierDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSupplierDropdown(false)}
                />
                <div
                  className="absolute left-0 top-full mt-1 z-50 w-72 max-h-80 overflow-y-auto rounded-xl border shadow-lg"
                  style={{
                    background: 'var(--surface-card)',
                    borderColor: 'var(--surface-border)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  }}
                >
                  <div className="sticky top-0 bg-[var(--surface-card)] border-b p-2" style={{ borderColor: 'var(--surface-border)' }}>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      <Building2 size={12} />
                      {suppliers.length} Active Suppliers
                    </div>
                  </div>

                  {/* Show All Option */}
                  <button
                    onClick={() => { setSelectedSupplierId(null); setShowSupplierDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ background: !selectedSupplierId ? 'rgba(13,148,136,0.08)' : undefined }}
                  >
                    <Package size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="flex-1 text-left" style={{ color: !selectedSupplierId ? '#0d9488' : 'var(--text-primary)' }}>All Products</span>
                    {!selectedSupplierId && <CheckCircle size={14} style={{ color: '#0d9488' }} />}
                  </button>

                  {/* Supplier List */}
                  {suppliers.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No suppliers found</div>
                  ) : (
                    suppliers.map(supplier => {
                      const productCount = rows.filter(r => r.product.supplier?.id === supplier.id).length;
                      return (
                        <button
                          key={supplier.id}
                          onClick={() => { setSelectedSupplierId(supplier.id); setShowSupplierDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)] border-t"
                          style={{ borderColor: 'var(--surface-border)', background: selectedSupplierId === supplier.id ? 'rgba(13,148,136,0.08)' : undefined }}
                        >
                          <Truck size={14} style={{ color: 'var(--text-muted)' }} />
                          <span className="flex-1 text-left truncate" style={{ color: selectedSupplierId === supplier.id ? '#0d9488' : 'var(--text-primary)' }}>
                            {supplier.name}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
                            {productCount}
                          </span>
                          {selectedSupplierId === supplier.id && <CheckCircle size={14} style={{ color: '#0d9488' }} />}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Clear Filters */}
          {(selectedSupplierId || query) && (
            <button
              onClick={() => { setSelectedSupplierId(null); setQuery(''); }}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors hover:bg-red-50"
              style={{ color: '#dc2626' }}
            >
              <X size={12} />
              Clear filters
            </button>
          )}

          {/* Product Count Badge */}
          <div className="flex items-center gap-2 ml-auto">
            {selectedSupplierId && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(13,148,136,0.08)', color: '#0d9488' }}>
                <Truck size={10} className="inline mr-1" />
                {selectedSupplier?.name}
              </span>
            )}
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
          {/* Product pricing table */}
          <div className="rounded-2xl overflow-x-auto" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            {/* Header */}
            <div className="hidden lg:grid items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.02)', gridTemplateColumns: '1fr 90px 90px 90px 70px 120px' }}>
              <span>Product</span><span>Cost</span><span>Sell Price</span><span>Suggested</span><span>Margin</span><span className="text-right">Action</span>
            </div>

            {searchLoading && products.length === 0 && <div className="p-8 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" /></div>}

            {paginated.map(row => {
              const isEditing = editingId === row.product.id;
              const mColor = row.marginHealth === 'good' ? '#16a34a' : row.marginHealth === 'low' ? '#f59e0b' : row.marginHealth === 'thin' ? '#dc2626' : row.marginHealth === 'loss' ? '#dc2626' : 'var(--text-muted)';

              return (
                <div key={row.product.id} className="border-b transition-colors hover:bg-[rgba(0,0,0,0.015)]" style={{ borderColor: 'var(--surface-border)' }}>
                  <div className="lg:grid items-center gap-2 px-4 py-3" style={{ gridTemplateColumns: '1fr 90px 90px 90px 70px 120px' }}>
                    {/* Product */}
                    <button onClick={() => setSelectedId(row.product.id)} className="text-left min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{row.product.name}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{row.product.supplier?.name || 'No supplier'}</p>
                    </button>
                    {/* Cost */}
                    <span className="text-xs font-mono" style={{ color: row.hasCost ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{row.hasCost ? row.costFormatted : '\u2014'}</span>
                    {/* Sell Price */}
                    <span className="text-xs font-mono font-bold" style={{ color: '#0d9488' }}>{fmt(row.sellPesewas)}</span>
                    {/* Suggested */}
                    <span className="text-xs font-mono" style={{ color: row.hasCost && row.priceDiff !== 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                      {row.hasCost ? fmt(row.suggestedSell) : '\u2014'}
                    </span>
                    {/* Margin */}
                    <span className="text-[11px] font-bold" style={{ color: mColor }}>
                      {row.hasCost ? row.marginPct.toFixed(0) + '%' : '\u2014'}
                    </span>
                    {/* Action */}
                    <div className="flex justify-end">
                      <button onClick={() => { setEditingId(row.product.id); setEditPrice((row.sellPesewas / 100).toFixed(2)); setEditReason(''); }}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all hover:scale-[1.02]"
                        style={{ background: 'rgba(13,148,136,0.08)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.15)' }}>
                        Edit Price
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div className="px-4 pb-3 space-y-2" style={{ background: 'rgba(13,148,136,0.03)' }}>
                      <div className="flex items-end gap-3">
                        <div className="flex-1 max-w-[140px]">
                          <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>New Price (GHS)</label>
                          <input type="number" step="0.01" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                            className="w-full rounded-lg border px-2.5 py-1.5 text-sm font-mono font-bold"
                            style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Reason</label>
                          <input
                            value={editReason}
                            onChange={e => setEditReason(e.target.value)}
                            onFocus={() => setReasonFocused(true)}
                            onBlur={() => setTimeout(() => setReasonFocused(false), 150)}
                            placeholder="e.g. Supplier price increase"
                            className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                            style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <button onClick={() => handleSavePrice(row.product.id)} disabled={updating}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" style={{ background: '#0d9488' }}>
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                          style={{ border: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>Cancel</button>
                      </div>
                      {/* Reason suggestion chips — only visible when reason field is focused */}
                      {reasonFocused && (
                        <PriceReasonSuggestions
                          current={editReason}
                          onSelect={r => { setEditReason(r); setReasonFocused(false); }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !searchLoading && (
              <div className="p-12 text-center">
                <Tag className="mx-auto mb-3 h-8 w-8 opacity-20" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No products found</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="rounded px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30" style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="rounded px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30" style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>Next</button>
                </div>
              </div>
            )}
          </div>

          {/* Price History Sidebar */}
          <PriceHistorySidebar selectedId={selectedId} historyData={historyData?.productPriceHistory ?? []} historyLoading={historyLoading} />
        </div>
      </div>
    </div>
  );
}

const PRICE_REASONS = [
  'Supplier price increase',
  'Supplier price decrease',
  'Annual price review',
  'Promotional discount',
  'Seasonal adjustment',
  'Exchange rate change',
  'New supplier — lower cost',
  'Bulk purchase discount',
  'Expiry clearance',
  'Market price alignment',
  'GRA/VAT adjustment',
  'NHIS tariff update',
];

function PriceReasonSuggestions({ current, onSelect }: { current: string; onSelect: (r: string) => void }) {
  const suggestions = current.trim().length === 0
    ? PRICE_REASONS
    : PRICE_REASONS.filter(r => r.toLowerCase().includes(current.toLowerCase()) && r.toLowerCase() !== current.toLowerCase());

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {suggestions.slice(0, 6).map(reason => (
        <button
          key={reason}
          type="button"
          onMouseDown={e => e.preventDefault()} // prevent input blur before click fires
          onClick={() => onSelect(reason)}
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all hover:opacity-80 active:scale-95"
          style={{
            background: current === reason ? 'rgba(13,148,136,0.15)' : 'var(--surface-base)',
            border: `1px solid ${current === reason ? 'rgba(13,148,136,0.4)' : 'var(--surface-border)'}`,
            color: current === reason ? '#0d9488' : 'var(--text-secondary)',
          }}
        >
          {reason}
        </button>
      ))}
    </div>
  );
}

function BulkMarginPanel({
  defaultMargin, onMarginChange, selectedSupplierName, affectedCount, totalWithCost,
  previewRows, loading, onApply, onClose,
}: {
  defaultMargin: number;
  onMarginChange: (v: number) => void;
  selectedSupplierName?: string;
  affectedCount: number;
  totalWithCost: number;
  previewRows: Array<{ product: { name: string }; costFormatted: string; sellPesewas: number; suggestedSell: number }>;
  loading: boolean;
  onApply: () => void;
  onClose: () => void;
}) {
  const PRESETS = [15, 20, 25, 30, 40, 50];

  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid rgba(13,148,136,0.25)', boxShadow: '0 4px 24px rgba(13,148,136,0.1)' }}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            💰 Set Selling Prices by Profit Margin
            {selectedSupplierName && (
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.15)', color: '#0d9488' }}>
                <Truck size={10} className="inline mr-1" />
                {selectedSupplierName}
              </span>
            )}
          </h3>
          <p className="text-xs mt-1 max-w-xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {selectedSupplierName
              ? `This will update prices only for products from ${selectedSupplierName}. Choose your desired profit margin and the selling prices will be calculated automatically based on cost.`
              : 'This tool automatically calculates the right selling price for each product so you always make a profit. You choose how much profit you want (e.g. 25%), and it updates all your prices at once.'}
          </p>
        </div>
        <button onClick={onClose} className="ml-4 shrink-0 text-xs font-bold rounded-lg px-2.5 py-1.5 hover:bg-surface-hover"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
          Close
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Step 1 — choose margin */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Step 1 — Choose your profit margin
          </p>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Margin is how much profit you make on top of what you paid for the product.
            For example, if a product costs <strong>GH₵10</strong> and you set <strong>25% margin</strong>, the selling price becomes <strong>GH₵12.50</strong>.
          </p>

          {/* Preset chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => onMarginChange(p)}
                className="rounded-full px-3 py-1.5 text-xs font-bold transition-all"
                style={
                  defaultMargin === p
                    ? { background: '#0d9488', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }
                    : { background: 'var(--surface-base)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }
                }
              >
                {p}%
                {p === 25 && <span className="ml-1 text-[9px] opacity-70">recommended</span>}
              </button>
            ))}
            {/* Custom input */}
            <div className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
              style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Custom:</span>
              <input
                type="number" min={1} max={200} value={defaultMargin}
                onChange={e => onMarginChange(Math.max(1, Number(e.target.value) || 25))}
                className="w-10 bg-transparent text-center font-bold outline-none text-xs"
                style={{ color: 'var(--text-primary)' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>

          {/* Live example */}
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Example: </span>
            <span style={{ color: 'var(--text-primary)' }}>
              Product costs <strong>GH₵10.00</strong> → selling price at <strong>{defaultMargin}% margin</strong> = <strong style={{ color: '#0d9488' }}>GH₵{(10 * (1 + defaultMargin / 100)).toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Step 2 — preview */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Step 2 — Preview what will change
          </p>
          {totalWithCost === 0 ? (
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.2)', color: '#b45309' }}>
              ⚠️ No products have supplier cost data yet. Receive stock from a supplier invoice first — the system will record the cost automatically.
            </div>
          ) : affectedCount === 0 ? (
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', color: '#15803d' }}>
              ✓ All {totalWithCost} products with cost data are already priced at {defaultMargin}% margin or above. No changes needed.
            </div>
          ) : (
            <>
              <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{affectedCount} product{affectedCount !== 1 ? 's' : ''}</strong> will have their prices updated:
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--surface-border)' }}>
                <div className="grid px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ gridTemplateColumns: '1fr 80px 80px 80px', background: 'var(--surface-base)', color: 'var(--text-muted)', borderBottom: '1px solid var(--surface-border)' }}>
                  <span>Product</span><span>Cost</span><span>Old price</span><span>New price</span>
                </div>
                {previewRows.map(r => (
                  <div key={r.product.name} className="grid px-3 py-2 text-xs items-center"
                    style={{ gridTemplateColumns: '1fr 80px 80px 80px', borderTop: '1px solid var(--surface-border)' }}>
                    <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{r.product.name}</span>
                    <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{r.costFormatted}</span>
                    <span className="font-mono line-through" style={{ color: 'var(--text-muted)' }}>{fmt(r.sellPesewas)}</span>
                    <span className="font-mono font-bold" style={{ color: '#0d9488' }}>{fmt(r.suggestedSell)}</span>
                  </div>
                ))}
                {affectedCount > 4 && (
                  <div className="px-3 py-2 text-[10px]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                    + {affectedCount - 4} more products
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Step 3 — confirm */}
        {affectedCount > 0 && (
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onApply}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}
            >
              <DollarSign size={15} />
              {loading ? 'Updating prices…' : `Update ${affectedCount} price${affectedCount !== 1 ? 's' : ''} now`}
            </button>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              All changes are saved to price history and can be reviewed anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniKpi({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: color + '08', border: '1px solid ' + color + '18' }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && <span style={{ color }}>{icon}</span>}
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <p className="text-xl font-bold font-mono mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

function PriceHistorySidebar({ selectedId, historyData, historyLoading }: {
  selectedId: string | null; historyData: PriceHistoryRow[]; historyLoading: boolean;
}) {
  const [hPage, setHPage] = useState(1);
  const hPerPage = 5;

  // Reset page when product changes
  useEffect(() => { setHPage(1); }, [selectedId]);

  const totalHPages = Math.ceil(historyData.length / hPerPage);
  const paginatedHistory = historyData.slice((hPage - 1) * hPerPage, hPage * hPerPage);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <div className="flex items-center gap-2">
          <History size={14} style={{ color: '#0d9488' }} />
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Price History</h3>
        </div>
        {selectedId && historyData.length > 0 && (
          <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>{historyData.length} changes</span>
        )}
      </div>

      {!selectedId && (
        <div className="p-6 text-center">
          <History className="mx-auto mb-2 h-8 w-8 opacity-15" />
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click a product to view price changes</p>
        </div>
      )}

      {selectedId && historyLoading && (
        <div className="p-6 text-center"><div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent" /></div>
      )}

      {selectedId && !historyLoading && (
        <>
          <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
            {paginatedHistory.map((entry, idx) => (
              <div key={entry.id + '-' + ((hPage - 1) * hPerPage + idx)} className="px-4 py-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {entry.newPriceGhsPesewas > entry.oldPriceGhsPesewas
                    ? <TrendingUp size={11} style={{ color: '#dc2626' }} />
                    : <TrendingDown size={11} style={{ color: '#16a34a' }} />
                  }
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{fmt(entry.oldPriceGhsPesewas)}</span>
                  <ArrowRight size={10} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(entry.newPriceGhsPesewas)}</span>
                </div>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {entry.reason || 'No reason'} &bull; {entry.changedByName}
                </p>
                <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {new Date(entry.changedAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
            {historyData.length === 0 && (
              <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No price changes recorded</p>
            )}
          </div>

          {/* Pagination */}
          {totalHPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{hPage}/{totalHPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setHPage(p => Math.max(1, p - 1))} disabled={hPage === 1}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold disabled:opacity-30"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>Prev</button>
                <button onClick={() => setHPage(p => Math.min(totalHPages, p + 1))} disabled={hPage === totalHPages}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold disabled:opacity-30"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
