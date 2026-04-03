'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Receipt, TrendingUp, ShoppingBag, DollarSign,
  Printer, Clock, ChevronRight,
} from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { formatGhs } from '@/lib/utils';
import { GhsMoney } from '@/components/ui/ghs-money';
import { useAuthStore } from '@/lib/store/auth.store';
import Link from 'next/link';
import { RECENT_SALES, SALE_DETAIL } from '@/lib/graphql/sales.queries';
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

  const { data, loading } = useQuery<{ recentSales: SaleRow[] }>(RECENT_SALES, {
    variables: { limit: 60 },
    skip: !canQueryRecent,
    pollInterval: 45_000,
  });
  const [fetchSaleDetail] = useLazyQuery<{ sale: SaleRow }>(SALE_DETAIL, {
    fetchPolicy: 'network-only',
  });

  /** Owner / manager / se_admin: branch list from API. All other roles: own sales only (API + client filter). */
  const visibleSales = useMemo(() => {
    if (!canQueryRecent) return [];
    const rows = data?.recentSales ?? [];
    if (!user) return [];
    const completed = rows.filter((s) => s.status === 'COMPLETED');
    if (branchWideSales) return completed;
    return completed.filter((s) => s.cashierId === user.id);
  }, [data, user, canQueryRecent, branchWideSales]);

  const branchContextLine = useMemo(() => {
    const id = visibleSales[0]?.branchId ?? user?.branch_id;
    const name = visibleSales[0]?.branchName;
    if (name && id) return `${name} · Branch ID ${id}`;
    if (id) return `Branch ID ${id}`;
    return '';
  }, [visibleSales, user?.branch_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleSales;
    return visibleSales.filter((tx) => {
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
  }, [visibleSales, search]);

  const shiftTotal = visibleSales.reduce((sum, tx) => sum + tx.totalPesewas, 0);
  const itemsSold = visibleSales.reduce(
    (sum, tx) => sum + tx.items.reduce((q, i) => q + i.quantity, 0),
    0,
  );
  const avgTransaction = visibleSales.length ? Math.round(shiftTotal / visibleSales.length) : 0;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedSales = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
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
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {branchWideSales ? (
            <>
              All completed checkouts at this branch from <code className="font-mono text-xs">recentSales</code> — owner,
              manager, or platform admin view. Search by cashier, product, supplier, or type (OTC/POM).
            </>
          ) : (
            <>
              Only your POS checkouts (same cashier ID as your login). Managers and owners see the full branch register.
            </>
          )}
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

      <div className="mb-4">
        <SearchFieldWithClear
          wrapperClassName="max-w-sm"
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
      </div>
      {receiptError && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          {receiptError}
        </div>
      )}

      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <table className="w-full min-w-[1040px] text-sm lg:min-w-0">
          <thead>
            <tr
              className="text-left text-xs font-semibold uppercase tracking-wide"
              style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-secondary)' }}
            >
              <th className="px-3 py-3 min-w-[120px]">Branch</th>
              <th className="px-3 py-3 w-[120px]">Sale ID</th>
              <th className="px-3 py-3 w-[100px]">Time (Accra)</th>
              {branchWideSales ? <th className="px-3 py-3 min-w-[110px]">Cashier</th> : null}
              <th className="px-3 py-3 min-w-[200px]">Products (type)</th>
              <th className="px-3 py-3 w-[88px]">Type mix</th>
              <th className="px-3 py-3 min-w-[100px]">Supplier</th>
              <th className="px-3 py-3 w-[88px]">Stock</th>
              <th className="px-3 py-3 w-[56px]">Qty</th>
              <th className="px-3 py-3 min-w-[88px]">Total</th>
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
                      <td className="px-3 py-3 align-top text-xs" style={{ color: 'var(--text-secondary)' }}>
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
                      </td>
                      <td className="px-3 py-3" style={{ color: 'var(--text-muted)' }}>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={12} aria-hidden />
                          {accraTime(whenIso)}
                        </span>
                      </td>
                      {branchWideSales ? (
                        <td className="px-3 py-3 align-top text-sm" style={{ color: 'var(--text-secondary)' }}>
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
                      <td className="px-3 py-3 align-top text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                        {typeMix}
                      </td>
                      <td className="px-3 py-3 align-top text-xs" style={{ color: 'var(--text-secondary)' }} title={supplierBrief}>
                        {supplierBrief}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: pill.bg, color: pill.color }}
                          title={stockMeta.title}
                        >
                          {stockMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
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
                  {branchWideSales
                    ? 'No completed branch sales in the recent window.'
                    : 'No completed sales for your cashier ID in the recent window.'}
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
