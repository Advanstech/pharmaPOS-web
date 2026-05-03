'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Receipt, TrendingUp, ShoppingBag, DollarSign,
  Printer, Clock, ChevronRight, Filter, X,
  RotateCcw, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { formatGhs } from '@/lib/utils';
import { GhsMoney } from '@/components/ui/ghs-money';
import { useAuthStore } from '@/lib/store/auth.store';
import Link from 'next/link';
import {
  RECENT_SALES, SALE_DETAIL,
  REFUND_REQUESTS, APPROVE_REFUND_REQUEST, REJECT_REFUND_REQUEST,
} from '@/lib/graphql/sales.queries';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { Pagination } from '@/components/ui/pagination';
import { isBranchWideSalesRole } from '@/lib/auth/sales-visibility';
import type { CartItem } from '@/types';

interface SaleRow {
  id: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  totalPesewas: number;
  vatPesewas: number;
  status: string;
  soldAt?: string | null;
  createdAt: string;
  refundRequest?: {
    id: string;
    status: string;
    reason: string;
    reviewedByName?: string | null;
    reviewNotes?: string | null;
  } | null;
  items: Array<{
    productId: string;
    productName: string;
    classification?: string;
    quantity: number;
    unitPricePesewas: number;
    vatExempt: boolean;
    supplierName?: string | null;
    stockAfterSale?: number;
    reorderLevel?: number;
    stockStatus?: string;
  }>;
}

function accraTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GH', {
    timeZone: 'Africa/Accra',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Product lines with FDA class for quick scanning */
function saleLineItemsTyped(
  items: Array<{ productName: string; quantity: number; classification?: string }>,
): string {
  if (!items.length) return '—';
  return items
    .map((i) => {
      const t = (i.classification ?? 'OTC').trim();
      return `${i.productName.trim()} (${t}) ×${i.quantity}`;
    })
    .join(', ');
}

function saleTypeSummary(items: Array<{ classification?: string }>): string {
  const set = new Set(items.map((i) => (i.classification ?? 'OTC').trim()));
  return [...set].sort().join(' · ') || '—';
}

function saleSuppliersBrief(items: Array<{ supplierName?: string | null }>): string {
  const names = [...new Set(items.map((i) => (i.supplierName ?? '').trim()).filter(Boolean))];
  if (names.length === 0) return '—';
  if (names.length === 1) return names[0]!.length > 32 ? `${names[0]!.slice(0, 30)}…` : names[0]!;
  const a = names[0]!.length > 16 ? `${names[0]!.slice(0, 14)}…` : names[0]!;
  return `${a} +${names.length - 1}`;
}

const STOCK_SEVERITY: Record<string, number> = { out: 0, critical: 1, low: 2, ok: 3 };

function worstStockMeta(items: Array<{ stockStatus?: string }>): { label: string; title: string } {
  let worst = 'ok';
  for (const it of items) {
    const st = it.stockStatus ?? 'ok';
    if ((STOCK_SEVERITY[st] ?? 9) < (STOCK_SEVERITY[worst] ?? 9)) worst = st;
  }
  const title = items.map((i) => `${i.stockStatus ?? 'ok'}`).join(', ');
  return { label: worst, title };
}

function stockPillStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case 'out':
      return { bg: 'var(--stock-pill-out-bg)', color: 'var(--stock-pill-out-fg)' };
    case 'critical':
      return { bg: 'var(--stock-pill-critical-bg)', color: 'var(--stock-pill-critical-fg)' };
    case 'low':
      return { bg: 'var(--stock-pill-low-bg)', color: 'var(--stock-pill-low-fg)' };
    default:
      return { bg: 'var(--stock-pill-ok-bg)', color: 'var(--stock-pill-ok-fg)' };
  }
}

function accraDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
}

function saleMatchesDateRange(tx: SaleRow, fromYmd: string, toYmd: string): boolean {
  const whenIso = tx.soldAt ?? tx.createdAt;
  const key = accraDateKey(whenIso);
  if (fromYmd && key < fromYmd) return false;
  if (toYmd && key > toYmd) return false;
  return true;
}

function saleMatchesClassificationFilter(tx: SaleRow, filter: string): boolean {
  if (!filter) return true;
  const items = tx.items;
  if (items.length === 0) return filter === 'otc_only';
  const cls = (c: string | undefined) => (c ?? 'OTC').trim();
  if (filter === 'otc_only') {
    return items.every((i) => cls(i.classification) === 'OTC');
  }
  if (filter === 'has_pom') {
    return items.some((i) => cls(i.classification) === 'POM');
  }
  if (filter === 'has_controlled') {
    return items.some((i) => cls(i.classification) === 'CONTROLLED');
  }
  if (filter === 'rx_any') {
    return items.some((i) => {
      const c = cls(i.classification);
      return c === 'POM' || c === 'CONTROLLED';
    });
  }
  return true;
}

function saleMatchesStockFilter(tx: SaleRow, filter: string): boolean {
  if (!filter) return true;
  const worst = worstStockMeta(tx.items).label;
  return worst === filter;
}

function saleMatchesSupplierFilter(tx: SaleRow, supplier: string): boolean {
  if (!supplier) return true;
  return tx.items.some((i) => (i.supplierName ?? '').trim() === supplier);
}

function saleMatchesCashierFilter(tx: SaleRow, cashierId: string): boolean {
  if (!cashierId) return true;
  return tx.cashierId === cashierId;
}

function saleMatchesBranchFilter(tx: SaleRow, branchId: string): boolean {
  if (!branchId) return true;
  return tx.branchId === branchId;
}

const inputStyle: CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  color: 'var(--text-primary)',
};

const labelStyle: CSSProperties = { color: 'var(--text-muted)' };

/** Matches `recentSales` @Roles on the API */
const RECENT_SALES_ROLES = [
  'cashier',
  'chemical_cashier',
  'owner',
  'se_admin',
  'manager',
  'pharmacist',
  'head_pharmacist',
] as const;

export default function TransactionsPage() {
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [cashierFilter, setCashierFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [reprintingSaleId, setReprintingSaleId] = useState<string | null>(null);
  const [receiptState, setReceiptState] = useState<{
    items: CartItem[];
    subtotal: number;
    vat: number;
    grandTotal: number;
    saleId: string;
  } | null>(null);

  const canQueryRecent = user && (RECENT_SALES_ROLES as readonly string[]).includes(user.role);
  const branchWideSales = !!user && isBranchWideSalesRole(user.role);
  const tableColCount = branchWideSales ? 11 : 10;

  const { data, loading, refetch: refetchSales } = useQuery<{ recentSales: SaleRow[] }>(RECENT_SALES, {
    variables: { limit: 60 },
    skip: !canQueryRecent,
    fetchPolicy: 'network-only',
    pollInterval: 30_000,
  });
  const [fetchSaleDetail] = useLazyQuery<{ sale: SaleRow }>(SALE_DETAIL, {
    fetchPolicy: 'network-only',
  });

  /** Owner / manager / se_admin: branch list from API. All other roles: own sales only (API + client filter). */
  const visibleSales = useMemo(() => {
    if (!canQueryRecent) return [];
    const rows = data?.recentSales ?? [];
    if (!user) return [];
    // Include REFUNDED so staff can see outcome of their refund requests
    const relevant = rows.filter((s) => s.status === 'COMPLETED' || s.status === 'REFUNDED');
    if (branchWideSales) return relevant;
    return relevant.filter((s) => s.cashierId === user.id);
  }, [data, user, canQueryRecent, branchWideSales]);

  const branchContextLine = useMemo(() => {
    const id = visibleSales[0]?.branchId ?? user?.branch_id;
    const name = visibleSales[0]?.branchName;
    if (name && id) return `${name} · Branch ID ${id}`;
    if (id) return `Branch ID ${id}`;
    return '';
  }, [visibleSales, user?.branch_id]);

  const filterOptions = useMemo(() => {
    const supplierSet = new Set<string>();
    const cashierMap = new Map<string, string>();
    const branchMap = new Map<string, string>();
    for (const tx of visibleSales) {
      for (const it of tx.items) {
        const sn = (it.supplierName ?? '').trim();
        if (sn) supplierSet.add(sn);
      }
      if (tx.cashierId) {
        cashierMap.set(tx.cashierId, (tx.cashierName ?? tx.cashierId).trim() || tx.cashierId);
      }
      branchMap.set(tx.branchId, (tx.branchName ?? tx.branchId).trim() || tx.branchId);
    }
    const suppliers = [...supplierSet].sort((a, b) => a.localeCompare(b));
    const cashiers = [...cashierMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const branches = [...branchMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { suppliers, cashiers, branches };
  }, [visibleSales]);

  const hasStructuredFilters =
    !!dateFrom ||
    !!dateTo ||
    !!classificationFilter ||
    !!stockFilter ||
    !!supplierFilter ||
    !!cashierFilter ||
    !!branchFilter;

  const filtered = useMemo(() => {
    let rows = visibleSales;
    rows = rows.filter((tx) => saleMatchesDateRange(tx, dateFrom, dateTo));
    rows = rows.filter((tx) => saleMatchesClassificationFilter(tx, classificationFilter));
    rows = rows.filter((tx) => saleMatchesStockFilter(tx, stockFilter));
    rows = rows.filter((tx) => saleMatchesSupplierFilter(tx, supplierFilter));
    rows = rows.filter((tx) => saleMatchesCashierFilter(tx, cashierFilter));
    rows = rows.filter((tx) => saleMatchesBranchFilter(tx, branchFilter));

    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((tx) => {
      if (tx.id.toLowerCase().includes(q)) return true;
      if (tx.branchId.toLowerCase().includes(q)) return true;
      if (tx.branchName?.toLowerCase().includes(q)) return true;
      if (formatGhs(tx.totalPesewas / 100).toLowerCase().includes(q)) return true;
      if (tx.cashierName?.toLowerCase().includes(q)) return true;
      return tx.items.some(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          (i.classification ?? '').toLowerCase().includes(q) ||
          (i.supplierName ?? '').toLowerCase().includes(q),
      );
    });
  }, [
    visibleSales,
    search,
    dateFrom,
    dateTo,
    classificationFilter,
    stockFilter,
    supplierFilter,
    cashierFilter,
    branchFilter,
  ]);

  const shiftTotal = filtered.reduce((sum, tx) => sum + tx.totalPesewas, 0);
  const itemsSold = filtered.reduce(
    (sum, tx) => sum + tx.items.reduce((q, i) => q + i.quantity, 0),
    0,
  );
  const avgTransaction = filtered.length ? Math.round(shiftTotal / filtered.length) : 0;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedSales = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    dateFrom,
    dateTo,
    classificationFilter,
    stockFilter,
    supplierFilter,
    cashierFilter,
    branchFilter,
  ]);

  function clearStructuredFilters() {
    setDateFrom('');
    setDateTo('');
    setClassificationFilter('');
    setStockFilter('');
    setSupplierFilter('');
    setCashierFilter('');
    setBranchFilter('');
  }

  async function handleReprint(saleId: string): Promise<void> {
    setReceiptError(null);
    setReprintingSaleId(saleId);
    try {
      const { data: detailData } = await fetchSaleDetail({ variables: { id: saleId } });
      const sale = detailData?.sale;
      if (!sale) throw new Error('Sale details not found.');

      const receiptItems: CartItem[] = sale.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unitPriceGhs: item.unitPricePesewas / 100,
        vatExempt: item.vatExempt,
        requiresRx: false,
      }));

      setReceiptState({
        items: receiptItems,
        subtotal: Math.max(0, (sale.totalPesewas - sale.vatPesewas) / 100),
        vat: sale.vatPesewas / 100,
        grandTotal: sale.totalPesewas / 100,
        saleId: sale.id,
      });
    } catch (error) {
      setReceiptError(error instanceof Error ? error.message : 'Could not load receipt copy.');
    } finally {
      setReprintingSaleId(null);
    }
  }

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <motion.div
        className="mb-6"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <span className="mb-3 inline-block rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
          {branchWideSales ? 'Branch (supervisors)' : `${user?.name?.split(' ')[0] ?? 'Staff'}'s sales`}
        </span>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {branchWideSales ? 'Branch sales' : 'My sales'}
        </h1>
        <p className="mt-1 text-sm hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          {branchWideSales
            ? 'All completed branch checkouts. Search by cashier, product, supplier, or type.'
            : 'Your POS checkouts. Managers and owners see the full branch register.'}
        </p>
        {branchContextLine ? (
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {branchContextLine}
          </p>
        ) : null}
      </motion.div>

      {user && (
        <div className="mb-6">
          <AiCopilotBanner role={user.role} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {!canQueryRecent ? (
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5"
              style={{
                background: 'var(--surface-card)',
                border: '1px dashed var(--surface-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                No live data
              </p>
              <p className="mt-2 font-mono text-lg" style={{ color: 'var(--text-muted)' }}>
                —
              </p>
            </div>
          ))
        ) : loading ? (
          [0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : (
          [
            {
              label: branchWideSales ? 'Total (in view)' : 'Your total (in view)',
              value: formatGhs(shiftTotal / 100),
              icon: DollarSign,
              color: 'var(--color-teal)',
            },
            { label: 'Items sold', value: String(itemsSold), icon: ShoppingBag, color: '#2563eb' },
            {
              label: 'Avg. transaction',
              value: formatGhs(avgTransaction / 100),
              icon: TrendingUp,
              color: '#16a34a',
            },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                className="rounded-2xl p-5"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={16} style={{ color: kpi.color }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {kpi.label}
                  </p>
                </div>
                <p className="font-mono text-2xl font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="mb-6">
        <Link
          href="/pos"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white shadow-[0_3px_0_0_var(--color-teal-dark)] transition-all hover:bg-teal-dark active:translate-y-[3px] active:shadow-none"
        >
          <Receipt size={16} aria-hidden />
          Open POS terminal
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <SearchFieldWithClear
          wrapperClassName="w-full max-w-sm shrink-0"
          value={search}
          onValueChange={setSearch}
          iconSize={15}
          type="text"
          placeholder="Search sale ID, product, supplier, type (OTC/POM), cashier, amount…"
          className="w-full rounded-xl py-2.5 pl-9 pr-10 text-sm outline-none transition-shadow focus:ring-2 focus:ring-teal/30"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetchSales()}
            disabled={loading}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--surface-border)' }}
          >
            <RotateCcw size={16} aria-hidden className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {hasStructuredFilters ? (
            <button
              type="button"
              onClick={clearStructuredFilters}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--surface-border)' }}
            >
              <X size={16} aria-hidden />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="mb-6 rounded-2xl p-4 sm:p-5"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}
      >
        {/* Filter header with active count + clear */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-1.5" style={{ background: 'rgba(13,148,136,0.1)' }}>
              <Filter size={14} style={{ color: '#0d9488' }} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Filters</h2>
            {hasStructuredFilters && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488' }}>
                Active
              </span>
            )}
          </div>
          {hasStructuredFilters && (
            <button type="button" onClick={() => {
              setDateFrom(''); setDateTo(''); setClassificationFilter('');
              setStockFilter(''); setSupplierFilter(''); setCashierFilter(''); setBranchFilter('');
            }} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-red-50"
              style={{ color: '#dc2626' }}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {/* Row 1: Date range + Product type — most used filters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</label>
            <select value={classificationFilter} onChange={e => setClassificationFilter(e.target.value)}
              className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle}>
              <option value="">All types</option>
              <option value="rx_any">Has Rx (POM/Controlled)</option>
              <option value="otc_only">OTC only</option>
              <option value="has_pom">Has POM</option>
              <option value="has_controlled">Has Controlled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stock Level</label>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
              className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle}>
              <option value="">All levels</option>
              <option value="ok">✅ OK</option>
              <option value="low">⚠️ Low</option>
              <option value="critical">🔴 Critical</option>
              <option value="out">❌ Out</option>
            </select>
          </div>
        </div>

        {/* Row 2: Supplier + Branch + Cashier — contextual filters */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {filterOptions.suppliers.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Supplier</label>
              <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle}>
                <option value="">All suppliers</option>
                {filterOptions.suppliers.map(s => <option key={s} value={s}>{s.length > 40 ? s.slice(0, 38) + '…' : s}</option>)}
              </select>
            </div>
          )}
          {branchWideSales && filterOptions.branches.length > 1 && (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Branch</label>
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle}>
                <option value="">All branches</option>
                {filterOptions.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          {branchWideSales && filterOptions.cashiers.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cashier</label>
              <select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30" style={inputStyle}>
                <option value="">All cashiers</option>
                {filterOptions.cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Active filter summary */}
        {hasStructuredFilters && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dateFrom && <FilterChip label={`From: ${dateFrom}`} onClear={() => setDateFrom('')} />}
            {dateTo && <FilterChip label={`To: ${dateTo}`} onClear={() => setDateTo('')} />}
            {classificationFilter && <FilterChip label={`Type: ${classificationFilter.replace('_', ' ')}`} onClear={() => setClassificationFilter('')} />}
            {stockFilter && <FilterChip label={`Stock: ${stockFilter}`} onClear={() => setStockFilter('')} />}
            {supplierFilter && <FilterChip label={`Supplier: ${supplierFilter.slice(0, 20)}`} onClear={() => setSupplierFilter('')} />}
            {cashierFilter && <FilterChip label="Cashier" onClear={() => setCashierFilter('')} />}
            {branchFilter && <FilterChip label="Branch" onClear={() => setBranchFilter('')} />}
          </div>
        )}
      </div>
      {receiptError && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          {receiptError}
        </div>
      )}

      {/* ── Refund Requests — manager/owner only ── */}
      {branchWideSales && <RefundRequestsPanel />}

      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <table className="w-full min-w-[640px] text-sm lg:min-w-0">
          <thead>
            <tr
              className="text-left text-xs font-semibold uppercase tracking-wide"
              style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-secondary)' }}
            >
              <th className="px-3 py-3 min-w-[120px] hidden md:table-cell">Branch</th>
              <th className="px-3 py-3 w-[120px]">Sale ID</th>
              <th className="px-3 py-3 w-[80px] hidden sm:table-cell">Time</th>
              {branchWideSales ? <th className="px-3 py-3 min-w-[100px] hidden sm:table-cell">Cashier</th> : null}
              <th className="px-3 py-3 min-w-[160px]">Products</th>
              <th className="px-3 py-3 w-[80px] hidden lg:table-cell">Type</th>
              <th className="px-3 py-3 min-w-[90px] hidden md:table-cell">Supplier</th>
              <th className="px-3 py-3 w-[72px] hidden sm:table-cell">Stock</th>
              <th className="px-3 py-3 w-[44px] hidden md:table-cell">Qty</th>
              <th className="px-3 py-3 min-w-[80px]">Total</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td colSpan={tableColCount} className="px-4 py-3">
                    <div className="skeleton h-8 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : (
              <AnimatePresence initial={false}>
                {paginatedSales.map((tx, i) => {
                  const nItems = tx.items.reduce((s, it) => s + it.quantity, 0);
                  const productsLabel = saleLineItemsTyped(tx.items);
                  const typeMix = saleTypeSummary(tx.items);
                  const supplierBrief = saleSuppliersBrief(tx.items);
                  const stockMeta = worstStockMeta(tx.items);
                  const pill = stockPillStyle(stockMeta.label);
                  const whenIso = tx.soldAt ?? tx.createdAt;
                  return (
                    <motion.tr
                      key={tx.id}
                      initial={shouldReduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="last:border-0 transition-colors hover:bg-[var(--surface-hover)]"
                      style={{ borderBottom: '1px solid var(--surface-border)' }}
                    >
                      <td className="px-3 py-3 align-top text-xs hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        <span className="line-clamp-2 font-medium" title={tx.branchName}>
                          {tx.branchName ?? '—'}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-[var(--text-muted)]" title={tx.branchId}>
                          {tx.branchId.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/dashboard/transactions/${tx.id}`}
                          className="group inline-flex items-center gap-1 font-mono text-sm font-bold text-teal underline-offset-2 hover:underline"
                        >
                          <span>{tx.id.slice(0, 8)}…</span>
                          <ChevronRight size={14} className="opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </Link>
                        {/* Refund status badge */}
                        {tx.status === 'REFUNDED' && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold" style={{ color: '#dc2626' }}>
                            <RotateCcw size={9} /> REFUNDED
                          </span>
                        )}
                        {tx.refundRequest?.status === 'PENDING' && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold" style={{ color: '#d97706' }}>
                            <Clock size={9} /> Refund pending
                          </span>
                        )}
                        {tx.refundRequest?.status === 'REJECTED' && tx.status !== 'REFUNDED' && (
                          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold" style={{ color: '#6b7280' }}>
                            <XCircle size={9} /> Refund rejected
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={12} aria-hidden />
                          {accraTime(whenIso)}
                        </span>
                      </td>
                      {branchWideSales ? (
                        <td className="px-3 py-3 align-top text-sm hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                          {tx.cashierName ?? '—'}
                        </td>
                      ) : null}
                      <td className="px-3 py-3 align-top max-w-[min(100vw,22rem)]">
                        <p
                          className="text-xs leading-snug line-clamp-3"
                          style={{ color: 'var(--text-primary)' }}
                          title={productsLabel}
                        >
                          {productsLabel}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top text-[11px] font-semibold uppercase tracking-wide hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {typeMix}
                      </td>
                      <td className="px-3 py-3 align-top text-xs hidden md:table-cell" style={{ color: 'var(--text-secondary)' }} title={supplierBrief}>
                        {supplierBrief}
                      </td>
                      <td className="px-3 py-3 align-top hidden sm:table-cell">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: pill.bg, color: pill.color }}
                          title={stockMeta.title}
                        >
                          {stockMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top font-medium tabular-nums hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {nItems}
                      </td>
                      <td className="px-3 py-3">
                        <GhsMoney
                          amount={tx.totalPesewas / 100}
                          className="font-mono font-bold text-sm"
                          symbolClassName="text-[0.72em]"
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/dashboard/transactions/${tx.id}`}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--surface-hover)]"
                            style={{
                              color: 'var(--color-teal)',
                              borderColor: 'var(--action-outline-teal)',
                            }}
                          >
                            Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleReprint(tx.id)}
                            disabled={!!reprintingSaleId}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--surface-hover)]"
                            style={{
                              color: 'var(--text-primary)',
                              borderColor: 'var(--action-outline-neutral)',
                              opacity: reprintingSaleId ? 0.6 : 1,
                            }}
                            title="Reprint receipt"
                          >
                            <Printer size={12} aria-hidden />
                            {reprintingSaleId === tx.id ? 'Loading…' : 'Reprint'}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
            {!loading && paginatedSales.length === 0 && (
              <tr>
                <td colSpan={tableColCount} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {visibleSales.length === 0
                    ? branchWideSales
                      ? 'No completed branch sales in the recent window.'
                      : 'No completed sales for your cashier ID in the recent window.'
                    : 'No sales match your search and filters. Try widening dates or clearing filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {!loading && canQueryRecent && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>
      <ReceiptModal
        isOpen={!!receiptState}
        onClose={() => setReceiptState(null)}
        items={receiptState?.items ?? []}
        subtotal={receiptState?.subtotal ?? 0}
        vat={receiptState?.vat ?? 0}
        grandTotal={receiptState?.grandTotal ?? 0}
        paymentMethod="Receipt copy"
        cashierName={user?.name ?? 'Cashier'}
        saleId={receiptState?.saleId ?? null}
        pendingSync={false}
      />
    </div>
  );
}


function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all"
      style={{ background: 'rgba(13,148,136,0.08)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.15)' }}>
      {label}
      <button type="button" onClick={onClear} className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-teal/20">
        <X size={10} />
      </button>
    </span>
  );
}

// ── Refund Requests Panel ─────────────────────────────────────────────────────

interface RefundRequest {
  id: string;
  saleId: string;
  saleTotalFormatted: string;
  reason: string;
  status: string;
  requestedByName: string;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  saleItemCount: number;
}

function RefundRequestsPanel() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const { data, loading, refetch } = useQuery<{ refundRequests: RefundRequest[] }>(
    REFUND_REQUESTS,
    { fetchPolicy: 'cache-and-network', pollInterval: 30_000 },
  );

  const [approve] = useMutation(APPROVE_REFUND_REQUEST, {
    onCompleted: (d) => {
      setProcessingId(null);
      setExpanded(null);
      showToast('success', `✅ Refund approved — sale reversed, stock returned to inventory, GL updated.`);
      refetch();
    },
    onError: (e) => {
      setProcessingId(null);
      showToast('error', `❌ Approval failed: ${e.message}`);
    },
  });

  const [reject] = useMutation(REJECT_REFUND_REQUEST, {
    onCompleted: () => {
      setProcessingId(null);
      setExpanded(null);
      showToast('success', `Refund request rejected and cashier notified.`);
      refetch();
    },
    onError: (e) => {
      setProcessingId(null);
      showToast('error', `❌ Rejection failed: ${e.message}`);
    },
  });

  const handleApprove = (req: RefundRequest) => {
    setProcessingId(req.id);
    approve({ variables: { requestId: req.id, notes: notes[req.id] || undefined } });
  };

  const handleReject = (req: RefundRequest) => {
    const n = notes[req.id]?.trim();
    if (!n) {
      showToast('error', 'Add a rejection reason in the notes field before rejecting.');
      return;
    }
    setProcessingId(req.id);
    reject({ variables: { requestId: req.id, notes: n } });
  };

  const requests = data?.refundRequests ?? [];
  const pending = requests.filter(r => r.status === 'PENDING');
  const reviewed = requests.filter(r => r.status !== 'PENDING');

  if (loading && requests.length === 0) return null;
  if (requests.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(220,38,38,0.2)', background: 'var(--surface-card)', boxShadow: '0 4px 16px rgba(220,38,38,0.06)' }}>

      {/* Toast */}
      {toast && (
        <div className="mx-5 mt-4 rounded-xl px-4 py-3 text-xs font-semibold flex items-center gap-2"
          style={{
            background: toast.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
            color: toast.type === 'success' ? '#15803d' : '#b91c1c',
          }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(220,38,38,0.03)' }}>
        <div className="flex items-center gap-2">
          <RotateCcw size={15} style={{ color: '#dc2626' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Refund Requests
          </h2>
          {pending.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: '#dc2626' }}>
              {pending.length}
            </span>
          )}
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {pending.length} pending · {reviewed.length} reviewed
        </p>
      </div>

      {/* Pending requests */}
      {pending.length === 0 ? (
        <div className="px-5 py-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
          No pending refund requests — all clear.
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
          {pending.map(req => {
            const isOpen = expanded === req.id;
            const isProcessing = processingId === req.id;

            return (
              <div key={req.id}>
                {/* Summary row */}
                <button
                  onClick={() => !isProcessing && setExpanded(isOpen ? null : req.id)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[rgba(0,0,0,0.015)] transition-colors"
                  disabled={isProcessing}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: isProcessing ? 'rgba(13,148,136,0.1)' : 'rgba(220,38,38,0.08)' }}>
                    {isProcessing
                      ? <span className="h-4 w-4 rounded-full border-2 border-teal/30 border-t-teal animate-spin" />
                      : <RotateCcw size={14} style={{ color: '#dc2626' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {req.saleTotalFormatted}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {req.saleItemCount} item{req.saleItemCount !== 1 ? 's' : ''}
                      </span>
                      <Link
                        href={`/dashboard/refunds/${req.id}`}
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] font-mono font-semibold hover:underline"
                        style={{ color: 'var(--color-teal)' }}
                      >
                        {req.saleId.slice(0, 8)}…
                      </Link>
                    </div>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Reason: </span>{req.reason}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Requested by <strong>{req.requestedByName}</strong> · {new Date(req.createdAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {isProcessing && (
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--color-teal)' }}>
                        Processing… reversing sale, updating inventory &amp; GL
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="shrink-0 transition-transform"
                    style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                </button>

                {/* Expanded approve/reject form */}
                {isOpen && !isProcessing && (
                  <div className="px-5 pb-4 pt-1" style={{ background: 'rgba(0,0,0,0.015)', borderTop: '1px solid var(--surface-border)' }}>
                    {/* What happens on approval */}
                    <div className="mb-3 rounded-xl p-3 text-xs space-y-1"
                      style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
                      <p className="font-bold" style={{ color: '#b91c1c' }}>⚠️ Approving will:</p>
                      <ul className="space-y-0.5 ml-2" style={{ color: 'var(--text-secondary)' }}>
                        <li>• Mark sale as REFUNDED ({req.saleTotalFormatted})</li>
                        <li>• Return {req.saleItemCount} item{req.saleItemCount !== 1 ? 's' : ''} back to inventory</li>
                        <li>• Reverse the GL entries (revenue, VAT, COGS)</li>
                        <li>• Log to audit trail</li>
                      </ul>
                    </div>

                    <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                      Review notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional for approval, required for rejection)</span>
                    </label>
                    <input
                      value={notes[req.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="e.g. Verified with customer — wrong product dispensed"
                      className="w-full rounded-lg border px-3 py-2 text-xs mb-3"
                      style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(req)}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white"
                        style={{ background: '#16a34a' }}
                      >
                        <CheckCircle2 size={13} />
                        Approve &amp; Refund
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
                        style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
                      >
                        <XCircle size={13} />
                        Reject
                      </button>
                      <button
                        onClick={() => setExpanded(null)}
                        className="text-xs font-medium px-3 py-2 rounded-xl"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recently reviewed — collapsed summary */}
      {reviewed.length > 0 && (
        <div className="px-5 py-2.5" style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Recently reviewed
          </p>
          <div className="space-y-1">
            {reviewed.slice(0, 3).map(req => (
              <div key={req.id} className="flex items-center gap-2 text-[11px]">
                {req.status === 'APPROVED'
                  ? <CheckCircle2 size={11} style={{ color: '#16a34a' }} />
                  : <XCircle size={11} style={{ color: '#dc2626' }} />
                }
                <span style={{ color: 'var(--text-secondary)' }}>
                  {req.saleTotalFormatted} — {req.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  {req.reviewedByName ? ` by ${req.reviewedByName}` : ''}
                </span>
                <Link href={`/dashboard/refunds/${req.id}`}
                  className="font-mono text-[10px] hover:underline" style={{ color: 'var(--color-teal)' }}>
                  View details
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
