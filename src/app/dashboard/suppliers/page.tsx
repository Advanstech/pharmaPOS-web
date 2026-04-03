'use client';

import { useQuery } from '@apollo/client';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PhoneCall, Mail, AlertTriangle, Package, ChevronDown } from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { useAuthStore } from '@/lib/store/auth.store';
import { canAccessInventoryWorkspace } from '@/lib/auth/inventory-access';
import type { UserRole } from '@/types';
import { SUPPLIER_RESTOCK_WATCH } from '@/lib/graphql/suppliers.queries';
import { Pagination } from '@/components/ui/pagination';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { StockLevelGauge } from '@/components/dashboard/executive/stock-level-gauge';
import { SupplierHealthDonut } from '@/components/dashboard/executive/supplier-health-donut';

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

type SupplierWatch = {
  supplierId: string;
  supplierName: string;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  supplierAiScore?: number | null;
  totalTrackedProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  affectedProducts: Array<{
    productId: string;
    productName: string;
    quantityOnHand: number;
    reorderLevel: number;
    stockStatus: StockStatus;
    recentSoldQuantity7d: number;
    suggestedReorderQuantity: number;
  }>;
};

/** Uses `globals.css` stock pill tokens so light theme keeps dark glyphs on tinted fills (not `#fecaca` on pale red). */
const STATUS_STYLES: Record<StockStatus, CSSProperties> = {
  ok: { background: 'var(--stock-pill-ok-bg)', color: 'var(--stock-pill-ok-fg)' },
  low: { background: 'var(--stock-pill-low-bg)', color: 'var(--stock-pill-low-fg)' },
  critical: { background: 'var(--stock-pill-critical-bg)', color: 'var(--stock-pill-critical-fg)' },
  out: { background: 'var(--stock-pill-out-bg)', color: 'var(--stock-pill-out-fg)' },
};

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const highlightSupplierId = searchParams.get('supplierId');
  const { user } = useAuthStore();
  const canStock = user ? canAccessInventoryWorkspace(user.role as UserRole) : false;
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention'>('all');
  const itemsPerPage = 10;

  const { data, loading, error } = useQuery<{ supplierRestockWatch: SupplierWatch[] }>(
    SUPPLIER_RESTOCK_WATCH,
    { fetchPolicy: 'cache-and-network', pollInterval: 15_000 },
  );

  const suppliers = data?.supplierRestockWatch ?? [];

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      const needsAttention =
        s.outOfStockCount + s.criticalStockCount + s.lowStockCount > 0;
      if (statusFilter === 'attention' && !needsAttention) return false;
      if (!q) return true;
      if (s.supplierName.toLowerCase().includes(q)) return true;
      if (s.supplierId.toLowerCase().includes(q)) return true;
      return s.affectedProducts.some(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.productId.toLowerCase().includes(q),
      );
    });
  }, [suppliers, search, statusFilter]);

  const actionQueue = suppliers.filter((s) => s.outOfStockCount + s.criticalStockCount + s.lowStockCount > 0);
  const filteredActionCount = filteredSuppliers.filter(
    (s) => s.outOfStockCount + s.criticalStockCount + s.lowStockCount > 0,
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const { donutOut, donutCritical, donutLow, donutOk } = useMemo(() => {
    let out = 0;
    let critical = 0;
    let low = 0;
    let tracked = 0;
    for (const s of filteredSuppliers) {
      out += s.outOfStockCount;
      critical += s.criticalStockCount;
      low += s.lowStockCount;
      tracked += s.totalTrackedProducts;
    }
    const bad = out + critical + low;
    const ok = Math.max(0, tracked - bad);
    return { donutOut: out, donutCritical: critical, donutLow: low, donutOk: ok };
  }, [filteredSuppliers]);

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Suppliers intelligence
          </h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Visual stock watch · call queue syncs with live inventory
          </p>
        </div>
      </div>

      {loading && (
        <div
          className="mb-3 rounded-xl px-3 py-2 text-xs"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-muted)' }}
        >
          Syncing supplier links…
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-xl px-3 py-2 text-xs" style={{ border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#b91c1c' }}>
          Could not load supplier intelligence.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchFieldWithClear
          wrapperClassName="w-full min-w-0 flex-1 sm:max-w-md"
          value={search}
          onValueChange={setSearch}
          iconSize={15}
          type="text"
          placeholder="Search supplier, product, or product ID…"
          className="w-full rounded-xl py-2.5 pl-9 pr-10 text-sm outline-none"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
          }}
        />
        <div className="flex shrink-0 gap-1 rounded-xl p-1" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
          {(['all', 'attention'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={
                statusFilter === key
                  ? { background: 'var(--color-teal)', color: '#fff' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {key === 'all' ? 'All suppliers' : `Need action (${actionQueue.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="grid grid-cols-3 gap-2 lg:col-span-5">
          <StatCube label="Showing" value={filteredSuppliers.length} accent="teal" />
          <StatCube label="Need action" value={filteredActionCount} warn={filteredActionCount > 0} />
          <StatCube
            label="Risk SKUs"
            value={filteredSuppliers.reduce(
              (sum, s) => sum + s.lowStockCount + s.criticalStockCount + s.outOfStockCount,
              0,
            )}
            warn={filteredActionCount > 0}
          />
        </div>
        <div
          className="rounded-2xl border p-3 lg:col-span-7"
          style={{
            borderColor: 'var(--surface-border)',
            background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(0,109,119,0.04) 100%)',
            boxShadow: '0 12px 40px rgba(0,109,119,0.06)',
          }}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            SKU health mix
          </p>
          <SupplierHealthDonut out={donutOut} critical={donutCritical} low={donutLow} ok={donutOk} height={168} />
        </div>
      </div>

      <div className="space-y-3">
        {!loading && suppliers.length > 0 && filteredSuppliers.length === 0 && (
          <div
            className="rounded-2xl border px-4 py-8 text-center text-sm"
            style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-muted)' }}
          >
            No suppliers match your search or filter. Try another term or switch to <strong>All suppliers</strong>.
          </div>
        )}
        {paginatedSuppliers.map((supplier, index) => (
          <SupplierDisclosure
            key={supplier.supplierId}
            supplier={supplier}
            canStock={canStock}
            highlightSupplierId={highlightSupplierId}
            searchQuery={search}
            isFirstOnPage={index === 0}
          />
        ))}
      </div>

      {filteredSuppliers.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl" style={{ border: '1px solid var(--surface-border)' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredSuppliers.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}
    </div>
  );
}

function StatCube({
  label,
  value,
  warn = false,
  accent,
}: {
  label: string;
  value: number;
  warn?: boolean;
  accent?: 'teal';
}) {
  return (
    <div
      className="rounded-xl p-3 [transform-style:preserve-3d] shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      style={{
        border: warn ? '1px solid rgba(217,119,6,0.3)' : '1px solid var(--surface-border)',
        background: warn
          ? 'linear-gradient(160deg, rgba(253,243,220,0.5) 0%, var(--surface-card) 100%)'
          : accent === 'teal'
            ? 'linear-gradient(160deg, rgba(0,109,119,0.08) 0%, var(--surface-card) 100%)'
            : 'var(--surface-card)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold" style={{ color: warn ? '#92400e' : 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

function Badge({ text, status }: { text: string; status: StockStatus }) {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={STATUS_STYLES[status]}>{text}</span>;
}

function SupplierDisclosure({
  supplier,
  canStock,
  highlightSupplierId,
  searchQuery,
  isFirstOnPage,
}: {
  supplier: SupplierWatch;
  canStock: boolean;
  highlightSupplierId: string | null;
  searchQuery: string;
  isFirstOnPage: boolean;
}) {
  const needsAction = supplier.outOfStockCount + supplier.criticalStockCount + supplier.lowStockCount > 0;
  const highlight = highlightSupplierId?.trim() ?? '';
  const hasHighlight = highlight.length > 0;
  const isDeepLinked = hasHighlight && highlight === supplier.supplierId;

  const derivedOpen = hasHighlight ? isDeepLinked : isFirstOnPage;
  const [open, setOpen] = useState(derivedOpen);
  const rootRef = useRef<HTMLDetailsElement>(null);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = supplier.affectedProducts;
    if (!q) return list.slice(0, 9);
    const supplierHit =
      supplier.supplierName.toLowerCase().includes(q) ||
      supplier.supplierId.toLowerCase().includes(q);
    if (supplierHit) return list.slice(0, 9);
    return list
      .filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.productId.toLowerCase().includes(q),
      )
      .slice(0, 9);
  }, [supplier.affectedProducts, supplier.supplierId, supplier.supplierName, searchQuery]);

  useEffect(() => {
    setOpen(hasHighlight ? isDeepLinked : isFirstOnPage);
  }, [hasHighlight, isDeepLinked, isFirstOnPage]);

  useEffect(() => {
    if (!isDeepLinked || !rootRef.current) return;
    rootRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isDeepLinked]);

  return (
    <details
      ref={rootRef}
      id={supplier.supplierId ? `supplier-${supplier.supplierId}` : undefined}
      className="group rounded-2xl border open:shadow-[0_16px_48px_rgba(0,109,119,0.08)]"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <ChevronDown className="h-4 w-4 shrink-0 text-teal transition-transform group-open:rotate-180" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {supplier.supplierName}
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {supplier.totalTrackedProducts} SKUs
              {typeof supplier.supplierAiScore === 'number' ? ` · score ${supplier.supplierAiScore}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge text={`Out ${supplier.outOfStockCount}`} status={supplier.outOfStockCount > 0 ? 'out' : 'ok'} />
          <Badge text={`Crit ${supplier.criticalStockCount}`} status={supplier.criticalStockCount > 0 ? 'critical' : 'ok'} />
          <Badge text={`Low ${supplier.lowStockCount}`} status={supplier.lowStockCount > 0 ? 'low' : 'ok'} />
          {needsAction && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: 'var(--stock-pill-critical-bg)', color: 'var(--stock-pill-critical-fg)' }}
            >
              <AlertTriangle size={11} aria-hidden />
              Action
            </span>
          )}
          {supplier.supplierPhone && (
            <a
              href={`tel:${supplier.supplierPhone}`}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
              style={{ background: 'rgba(0,109,119,0.12)', color: 'var(--color-teal-dark)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <PhoneCall size={12} />
              Call
            </a>
          )}
          {supplier.supplierEmail && (
            <a
              href={`mailto:${supplier.supplierEmail}`}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Mail size={12} />
              Email
            </a>
          )}
        </div>
      </summary>

      <div className="border-t px-3 pb-3 pt-0" style={{ borderColor: 'var(--surface-border)' }}>
        {visibleProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((p) => (
              <div
                key={p.productId}
                className="flex gap-2 rounded-xl border p-2"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}
              >
                <PharmaProductVisual productName={p.productName} productId={p.productId} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    {canStock ? (
                      <Link
                        href={`/dashboard/inventory/${p.productId}`}
                        className="line-clamp-2 text-xs font-bold hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {p.productName}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {p.productName}
                      </p>
                    )}
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={STATUS_STYLES[p.stockStatus]}>
                      {p.stockStatus}
                    </span>
                  </div>
                  <StockLevelGauge quantityOnHand={p.quantityOnHand} reorderLevel={p.reorderLevel} thin className="mt-2" />
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Sold 7d: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{p.recentSoldQuantity7d}</span>
                    {' '}· Suggested order: <span className="font-semibold" style={{ color: 'var(--color-teal-dark)' }}>{p.suggestedReorderQuantity}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : supplier.affectedProducts.length === 0 ? (
          <div className="rounded-xl px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', background: 'var(--surface-base)' }}>
            <Package size={14} className="mr-1 inline-block" />
            All linked SKUs healthy.
          </div>
        ) : (
          <div className="rounded-xl px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', background: 'var(--surface-base)' }}>
            No SKUs match this search inside this supplier.
          </div>
        )}
      </div>
    </details>
  );
}
