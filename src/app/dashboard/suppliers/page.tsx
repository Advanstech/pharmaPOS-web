'use client';

import { useQuery, useMutation } from '@apollo/client';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  PhoneCall,
  Mail,
  AlertTriangle,
  Package,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  PauseCircle,
  DollarSign,
} from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { useAuthStore } from '@/lib/store/auth.store';
import { canAccessInventoryWorkspace } from '@/lib/auth/inventory-access';
import type { UserRole } from '@/types';
import {
  SUPPLIER_RESTOCK_WATCH,
  DELETE_SUPPLIER_MUTATION,
  SUPPLIERS_LIST_QUERY,
  SUPPLIER_DETAIL_QUERY,
  SUSPEND_SUPPLIER_MUTATION,
  REACTIVATE_SUPPLIER_MUTATION,
  DELETE_SUPPLIER_WITH_PRODUCTS_MUTATION,
} from '@/lib/graphql/suppliers.queries';
import { Pagination } from '@/components/ui/pagination';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { StockLevelGauge } from '@/components/dashboard/executive/stock-level-gauge';
import { SupplierHealthDonut } from '@/components/dashboard/executive/supplier-health-donut';
import { SupplierFormModal } from '@/components/suppliers/supplier-form-modal';
import { SupplierProductsModal } from '@/components/suppliers/supplier-products-modal';

/* ─── Types ─────────────────────────────────────────────────────────── */

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

type AffectedProduct = {
  productId: string;
  productName: string;
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  recentSoldQuantity7d: number;
  suggestedReorderQuantity: number;
};

type SupplierWatch = {
  supplierId: string;
  supplierName: string;
  supplierContactName?: string | null;
  supplierAddress?: string | null;
  supplierPhone?: string | null;
  supplierEmail?: string | null;
  supplierAiScore?: number | null;
  totalTrackedProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  affectedProducts: AffectedProduct[];
};

/* ─── Stock pill tokens (shared with globals.css) ───────────────────── */

const STATUS_STYLES: Record<StockStatus, CSSProperties> = {
  ok: { background: 'var(--stock-pill-ok-bg)', color: 'var(--stock-pill-ok-fg)' },
  low: { background: 'var(--stock-pill-low-bg)', color: 'var(--stock-pill-low-fg)' },
  critical: { background: 'var(--stock-pill-critical-bg)', color: 'var(--stock-pill-critical-fg)' },
  out: { background: 'var(--stock-pill-out-bg)', color: 'var(--stock-pill-out-fg)' },
};

/* ─── Health helpers ────────────────────────────────────────────────── */

type HealthLevel = 'green' | 'amber' | 'red';

function getHealthLevel(s: SupplierWatch): HealthLevel {
  if (s.outOfStockCount > 0 || s.criticalStockCount > 0) return 'red';
  if (s.lowStockCount > 0) return 'amber';
  return 'green';
}

const HEALTH_COLORS: Record<HealthLevel, { ring: string; fill: string; glow: string; label: string }> = {
  green: { ring: '#0f766e', fill: 'rgba(13,148,136,0.15)', glow: '0 0 8px rgba(13,148,136,0.4)', label: 'Healthy' },
  amber: { ring: '#d97706', fill: 'rgba(217,119,6,0.12)', glow: '0 0 8px rgba(217,119,6,0.4)', label: 'Attention' },
  red: { ring: '#dc2626', fill: 'rgba(220,38,38,0.12)', glow: '0 0 8px rgba(220,38,38,0.4)', label: 'Critical' },
};

/* ─── Main page ─────────────────────────────────────────────────────── */

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const highlightSupplierId = searchParams.get('supplierId');
  const { user } = useAuthStore();
  const canStock = user ? canAccessInventoryWorkspace(user.role as UserRole) : false;
  const canManageSuppliers = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user?.role ?? '');
  const canRemoveSuppliers = ['owner', 'se_admin', 'manager'].includes(user?.role ?? '');

  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention' | 'out' | 'healthy'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<{
    id: string;
    name: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'delete' | 'delete-with-products'>('suspend');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
  const itemsPerPage = 10;

  /* ── Query ── */
  const { data, loading, error, refetch } = useQuery<{ supplierRestockWatch: SupplierWatch[] }>(
    SUPPLIER_RESTOCK_WATCH,
    { fetchPolicy: 'cache-and-network', pollInterval: 15_000 },
  );

  const refetchQueries = [{ query: SUPPLIER_RESTOCK_WATCH }, { query: SUPPLIERS_LIST_QUERY }];

  const [deleteSupplier] = useMutation(DELETE_SUPPLIER_MUTATION, { refetchQueries });
  const [suspendSupplier] = useMutation(SUSPEND_SUPPLIER_MUTATION, { refetchQueries });
  const [reactivateSupplier] = useMutation(REACTIVATE_SUPPLIER_MUTATION, { refetchQueries });
  const [deleteWithProducts] = useMutation(DELETE_SUPPLIER_WITH_PRODUCTS_MUTATION, { refetchQueries });

  /* ── Actions ── */
  const handleAction = async (id: string) => {
    try {
      if (actionType === 'suspend') await suspendSupplier({ variables: { id } });
      else if (actionType === 'delete') await deleteSupplier({ variables: { id } });
      else if (actionType === 'delete-with-products') await deleteWithProducts({ variables: { id } });
      setDeactivatingId(null);
    } catch (e) {
      console.error('Supplier action failed:', e);
      setDeactivatingId(null);
    }
  };

  const handleDeactivate = (id: string) => handleAction(id);

  const handleEditClick = (s: SupplierWatch) => {
    setEditingSupplier({
      id: s.supplierId,
      name: s.supplierName,
      contactName: s.supplierContactName,
      address: s.supplierAddress,
      phone: s.supplierPhone,
      email: s.supplierEmail,
    });
    setFormOpen(true);
  };

  /* ── Filtering ── */
  const suppliers = data?.supplierRestockWatch ?? [];

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      const needsAttention = s.outOfStockCount + s.criticalStockCount + s.lowStockCount > 0;
      if (statusFilter === 'attention' && !needsAttention) return false;
      if (statusFilter === 'out' && s.outOfStockCount === 0) return false;
      if (statusFilter === 'healthy' && needsAttention) return false;
      if (!q) return true;
      if (s.supplierName.toLowerCase().includes(q)) return true;
      if (s.supplierId.toLowerCase().includes(q)) return true;
      return s.affectedProducts.some(
        (p) => p.productName.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q),
      );
    });
  }, [suppliers, search, statusFilter]);

  const actionQueue = suppliers.filter(
    (s) => s.outOfStockCount + s.criticalStockCount + s.lowStockCount > 0,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  /* Auto-expand deep-linked supplier */
  useEffect(() => {
    if (highlightSupplierId) setExpandedId(highlightSupplierId);
  }, [highlightSupplierId]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ── Aggregate stats ── */
  const stats = useMemo(() => {
    let totalProducts = 0;
    let needRestock = 0;
    let outOfStock = 0;
    let totalOut = 0;
    let totalCritical = 0;
    let totalLow = 0;
    let totalOk = 0;
    for (const s of suppliers) {
      totalProducts += s.totalTrackedProducts;
      if (s.outOfStockCount + s.criticalStockCount + s.lowStockCount > 0) needRestock++;
      outOfStock += s.outOfStockCount;
      totalOut += s.outOfStockCount;
      totalCritical += s.criticalStockCount;
      totalLow += s.lowStockCount;
    }
    const totalBad = totalOut + totalCritical + totalLow;
    totalOk = Math.max(0, totalProducts - totalBad);
    return { totalProducts, needRestock, outOfStock, totalOut, totalCritical, totalLow, totalOk };
  }, [suppliers]);

  /* ── Render ── */
  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* ═══════════════════ HERO STATS BAR ═══════════════════ */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(0,109,119,0.04) 50%, rgba(13,148,136,0.06) 100%)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        <div className="mx-auto max-w-[1400px] px-4 pb-5 pt-6 md:px-6">
          {/* Title row */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Supplier Intelligence
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                Real-time stock watch · 15s sync · Azzay Pharmacy
              </p>
            </div>
            {canManageSuppliers && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/invoices/upload"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:brightness-105 active:scale-[0.98]"
                  style={{
                    color: 'var(--color-teal)',
                    background: 'rgba(13,148,136,0.08)',
                    border: '1px solid rgba(13,148,136,0.25)',
                  }}
                >
                  AI Invoice Upload
                </Link>
                <button
                  type="button"
                  onClick={() => { setEditingSupplier(null); setFormOpen(true); }}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:brightness-110 active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                    boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  New Supplier
                </button>
              </div>
            )}
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <GlassStatCard
              label="Total Suppliers"
              value={suppliers.length}
              icon={<Package size={18} />}
              accent="teal"
              onClick={() => setStatusFilter('all')}
            />
            <GlassStatCard
              label="Products Tracked"
              value={stats.totalProducts}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
              accent="teal"
            />
            <GlassStatCard
              label="Need Restock"
              value={stats.needRestock}
              icon={<AlertTriangle size={18} />}
              accent={stats.needRestock > 0 ? 'amber' : 'teal'}
              glow={stats.needRestock > 0}
              onClick={() => setStatusFilter('attention')}
            />
            <GlassStatCard
              label="Out of Stock"
              value={stats.outOfStock}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>}
              accent={stats.outOfStock > 0 ? 'red' : 'teal'}
              glow={stats.outOfStock > 0}
              onClick={() => setStatusFilter('out')}
            />
            <GlassStatCard
              label="SKU Health"
              value={stats.totalProducts > 0 ? `${Math.round((stats.totalOk / Math.max(stats.totalProducts, 1)) * 100)}%` : '—'}
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
              accent="teal"
              mini={
                <SupplierHealthDonut
                  out={stats.totalOut}
                  critical={stats.totalCritical}
                  low={stats.totalLow}
                  ok={stats.totalOk}
                  height={48}
                />
              }
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        {/* Status banners */}
        {loading && suppliers.length === 0 && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              border: '1px solid var(--surface-border)',
              background: 'var(--surface-card)',
              color: 'var(--text-muted)',
            }}
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Syncing supplier intelligence…
          </div>
        )}
        {error && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              border: '1px solid rgba(220,38,38,0.25)',
              background: 'rgba(220,38,38,0.06)',
              color: '#dc2626',
            }}
          >
            <AlertTriangle size={16} />
            Could not load supplier intelligence. Check your connection.
          </div>
        )}

        {/* ── Action Bar: Search + Filters ── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <div
            className="flex shrink-0 gap-1 rounded-xl p-1"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}
          >
            {([
              { key: 'all' as const, label: 'All' },
              { key: 'attention' as const, label: `Action (${actionQueue.length})` },
              { key: 'out' as const, label: `Out (${stats.outOfStock})` },
              { key: 'healthy' as const, label: 'Healthy' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                style={
                  statusFilter === key
                    ? {
                        background: 'var(--color-teal)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="hidden text-xs sm:block" style={{ color: 'var(--text-muted)' }}>
            {filteredSuppliers.length} of {suppliers.length} suppliers
          </div>
        </div>

        {/* ═══════════════════ DATA TABLE ═══════════════════ */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-card)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Table header */}
          <div
            className="hidden items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider lg:grid"
            style={{
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--surface-border)',
              background: 'rgba(0,0,0,0.02)',
              gridTemplateColumns: '40px 1fr 100px 200px 80px 160px 32px',
            }}
          >
            <span />
            <span>Supplier</span>
            <span>AI Score</span>
            <span>Stock Health</span>
            <span className="text-center">Products</span>
            <span className="text-right">Actions</span>
            <span />
          </div>

          {/* Empty states */}
          {!loading && suppliers.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(13,148,136,0.08)' }}
              >
                <Package size={28} style={{ color: 'var(--color-teal)' }} />
              </div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                No suppliers yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
                Add your first supplier to start tracking stock levels, get reorder alerts, and manage your supply chain.
              </p>
              {canManageSuppliers && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href="/dashboard/invoices/upload"
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:brightness-105 active:scale-[0.98]"
                    style={{
                      color: 'var(--color-teal)',
                      background: 'rgba(13,148,136,0.08)',
                      border: '1px solid rgba(13,148,136,0.25)',
                    }}
                  >
                    AI Invoice Upload
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setEditingSupplier(null); setFormOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}
                  >
                    <Plus size={16} /> Add First Supplier
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && suppliers.length > 0 && filteredSuppliers.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ background: 'rgba(13,148,136,0.08)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                No matches found
              </h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Try a different search term or switch to <button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }} className="font-bold underline" style={{ color: 'var(--color-teal)' }}>All suppliers</button>.
              </p>
            </div>
          )}

          {/* Table rows */}
          {paginatedSuppliers.map((supplier) => (
            <SupplierRow
              key={supplier.supplierId}
              supplier={supplier}
              canStock={canStock}
              canManage={canManageSuppliers}
              ownerOnly={canRemoveSuppliers}
              deactivatingId={deactivatingId}
              highlightSupplierId={highlightSupplierId}
              searchQuery={search}
              expanded={expandedId === supplier.supplierId}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === supplier.supplierId ? null : supplier.supplierId))
              }
              onEdit={handleEditClick}
              onDeactivate={(id) => setDeactivatingId(id)}
              onSetActionType={setActionType}
              onConfirmDeactivate={handleDeactivate}
              onCancelDeactivate={() => setDeactivatingId(null)}
              onViewProducts={() => {
                setSelectedSupplier({ id: supplier.supplierId, name: supplier.supplierName });
                setProductsModalOpen(true);
              }}
            />
          ))}
        </div>

        {/* Pagination */}
        {filteredSuppliers.length > 0 && (
          <div
            className="mt-4 overflow-hidden rounded-xl"
            style={{ border: '1px solid var(--surface-border)' }}
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredSuppliers.length}
              itemsPerPage={itemsPerPage}
              itemLabelPlural="suppliers"
            />
          </div>
        )}
      </div>

      {/* Form modal */}
      <SupplierFormModal
        supplier={editingSupplier}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingSupplier(null);
        }}
        onSuccess={() => refetch()}
      />

      {/* Products modal */}
      {selectedSupplier && (
        <SupplierProductsModal
          supplierId={selectedSupplier.id}
          supplierName={selectedSupplier.name}
          open={productsModalOpen}
          onClose={() => {
            setProductsModalOpen(false);
            setSelectedSupplier(null);
          }}
        />
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   GlassStatCard — Hero stat with glass-morphism
   ═══════════════════════════════════════════════════════════════════════ */

function GlassStatCard({
  label,
  value,
  icon,
  accent = 'teal',
  glow = false,
  onClick,
  mini,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent?: 'teal' | 'amber' | 'red';
  glow?: boolean;
  onClick?: () => void;
  mini?: React.ReactNode;
}) {
  const accentMap = {
    teal: {
      border: 'rgba(13,148,136,0.2)',
      bg: 'rgba(13,148,136,0.06)',
      iconBg: 'rgba(13,148,136,0.12)',
      iconColor: '#0d9488',
      valueColor: 'var(--text-primary)',
      glowShadow: '0 0 20px rgba(13,148,136,0.15)',
    },
    amber: {
      border: 'rgba(217,119,6,0.3)',
      bg: 'rgba(217,119,6,0.06)',
      iconBg: 'rgba(217,119,6,0.12)',
      iconColor: '#d97706',
      valueColor: '#92400e',
      glowShadow: '0 0 20px rgba(217,119,6,0.2)',
    },
    red: {
      border: 'rgba(220,38,38,0.3)',
      bg: 'rgba(220,38,38,0.06)',
      iconBg: 'rgba(220,38,38,0.12)',
      iconColor: '#dc2626',
      valueColor: '#991b1b',
      glowShadow: '0 0 20px rgba(220,38,38,0.2)',
    },
  };
  const a = accentMap[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100"
      style={{
        border: `1px solid ${a.border}`,
        background: a.bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: glow ? a.glowShadow : '0 2px 12px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at top right, ${a.iconBg}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </p>
          <p
            className="mt-1.5 font-mono text-2xl font-bold leading-none tracking-tight"
            style={{ color: a.valueColor }}
          >
            {value}
          </p>
        </div>
        {mini ? (
          <div className="h-12 w-12 shrink-0">{mini}</div>
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: a.iconBg, color: a.iconColor }}
          >
            {icon}
          </div>
        )}
      </div>
      {/* Glow pulse animation for warning states */}
      {glow && (
        <div
          className="pointer-events-none absolute -inset-px animate-pulse rounded-2xl opacity-30"
          style={{ border: `1px solid ${a.iconColor}` }}
        />
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SupplierRow — Premium data table row with expand
   ═══════════════════════════════════════════════════════════════════════ */

function SupplierRow({
  supplier,
  canStock,
  canManage,
  ownerOnly,
  deactivatingId,
  highlightSupplierId,
  searchQuery,
  expanded,
  onToggleExpand,
  onEdit,
  onDeactivate,
  onSetActionType,
  onConfirmDeactivate,
  onCancelDeactivate,
  onViewProducts,
}: {
  supplier: SupplierWatch;
  canStock: boolean;
  canManage: boolean;
  ownerOnly: boolean;
  deactivatingId: string | null;
  highlightSupplierId: string | null;
  searchQuery: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: (s: SupplierWatch) => void;
  onDeactivate: (id: string) => void;
  onSetActionType: (t: 'suspend' | 'delete' | 'delete-with-products') => void;
  onConfirmDeactivate: (id: string) => Promise<void>;
  onCancelDeactivate: () => void;
  onViewProducts: () => void;
}) {
  const router = useRouter();
  const health = getHealthLevel(supplier);
  const hc = HEALTH_COLORS[health];
  const needsAction = supplier.outOfStockCount + supplier.criticalStockCount + supplier.lowStockCount > 0;
  const isDeepLinked = highlightSupplierId?.trim() === supplier.supplierId && supplier.supplierId.length > 0;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDeepLinked && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isDeepLinked]);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = supplier.affectedProducts;
    if (!q) return list;
    const supplierHit =
      supplier.supplierName.toLowerCase().includes(q) ||
      supplier.supplierId.toLowerCase().includes(q);
    if (supplierHit) return list;
    return list
      .filter((p) => p.productName.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
  }, [supplier.affectedProducts, supplier.supplierId, supplier.supplierName, searchQuery]);

  /* Stock health bar proportions */
  const total = supplier.totalTrackedProducts || 1;
  const okCount = Math.max(0, supplier.totalTrackedProducts - supplier.outOfStockCount - supplier.criticalStockCount - supplier.lowStockCount);
  const outPct = (supplier.outOfStockCount / total) * 100;
  const critPct = (supplier.criticalStockCount / total) * 100;
  const lowPct = (supplier.lowStockCount / total) * 100;
  const okPct = (okCount / total) * 100;

  return (
    <div
      ref={cardRef}
      id={supplier.supplierId ? `supplier-${supplier.supplierId}` : undefined}
      className="transition-all duration-200"
      style={{
        borderBottom: '1px solid var(--surface-border)',
        background: isDeepLinked
          ? 'rgba(13,148,136,0.04)'
          : expanded
            ? 'rgba(0,0,0,0.01)'
            : 'transparent',
      }}
    >
      {/* ── Main row — entire row is clickable to expand ── */}
      <div
        className="group grid cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.02)] active:bg-[rgba(0,0,0,0.03)]"
        style={{
          gridTemplateColumns: '40px 1fr',
        }}
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(); } }}
      >
        {/* Health dot */}
        <div className="flex items-center justify-center">
          <div
            className="h-3 w-3 rounded-full transition-shadow duration-300"
            style={{
              background: hc.ring,
              boxShadow: hc.glow,
            }}
            title={hc.label}
            aria-label={`Health: ${hc.label}`}
          />
        </div>

        {/* Content — responsive layout */}
        <div className="flex flex-col gap-3 lg:grid lg:items-center" style={{ gridTemplateColumns: '1fr 100px 200px 80px 160px 32px' }}>
          {/* Supplier name + contact */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/suppliers/${supplier.supplierId}`);
                }}
                className="truncate text-sm font-bold transition-colors hover:underline text-left"
                style={{ color: 'var(--text-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                title={`Open ${supplier.supplierName}`}
              >
                {supplier.supplierName}
              </button>
              {needsAction && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold lg:hidden"
                  style={{
                    background: 'var(--stock-pill-critical-bg)',
                    color: 'var(--stock-pill-critical-fg)',
                  }}
                >
                  <AlertTriangle size={9} aria-hidden />
                  Action
                </span>
              )}
            </div>
            <div
              className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {supplier.supplierPhone && (
                <a
                  href={`tel:${supplier.supplierPhone}`}
                  className="inline-flex items-center gap-1 transition-colors hover:brightness-125"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <PhoneCall size={10} />
                  {supplier.supplierPhone}
                </a>
              )}
              {supplier.supplierEmail && (
                <a
                  href={`mailto:${supplier.supplierEmail}`}
                  className="inline-flex items-center gap-1 transition-colors hover:brightness-125"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail size={10} />
                  <span className="max-w-[140px] truncate">{supplier.supplierEmail}</span>
                </a>
              )}
            </div>
          </div>

          {/* AI Score — mini progress bar */}
          <div className="hidden lg:block">
            <AiScoreBar score={supplier.supplierAiScore} />
          </div>

          {/* Stock health — inline colored bars */}
          <div className="hidden lg:block">
            <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {outPct > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${outPct}%`, background: '#dc2626' }}
                  title={`Out: ${supplier.outOfStockCount}`}
                />
              )}
              {critPct > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${critPct}%`, background: '#f97316' }}
                  title={`Critical: ${supplier.criticalStockCount}`}
                />
              )}
              {lowPct > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${lowPct}%`, background: '#eab308' }}
                  title={`Low: ${supplier.lowStockCount}`}
                />
              )}
              {okPct > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${okPct}%`, background: '#0f766e' }}
                  title={`OK: ${okCount}`}
                />
              )}
            </div>
            <div className="mt-1 flex gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {supplier.outOfStockCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#dc2626' }} />
                  {supplier.outOfStockCount} out
                </span>
              )}
              {supplier.criticalStockCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#f97316' }} />
                  {supplier.criticalStockCount} crit
                </span>
              )}
              {supplier.lowStockCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#eab308' }} />
                  {supplier.lowStockCount} low
                </span>
              )}
              {okCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#0f766e' }} />
                  {okCount} ok
                </span>
              )}
            </div>
          </div>

          {/* Product count */}
          <div className="hidden text-center lg:block">
            <span
              className="font-mono text-sm font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {supplier.totalTrackedProducts}
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center justify-end gap-1">
            {/* Call — prominent if critical */}
            {supplier.supplierPhone && (
              <a
                href={`tel:${supplier.supplierPhone}`}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-150 hover:scale-105"
                style={
                  needsAction
                    ? {
                        background: 'linear-gradient(135deg, rgba(13,148,136,0.15), rgba(13,148,136,0.08))',
                        color: '#0f766e',
                        boxShadow: '0 2px 8px rgba(13,148,136,0.15)',
                      }
                    : {
                        background: 'rgba(0,0,0,0.03)',
                        color: 'var(--text-secondary)',
                      }
                }
                onClick={(e) => e.stopPropagation()}
                title="Call supplier"
              >
                <PhoneCall size={11} />
                <span className="hidden xl:inline">{needsAction ? 'Call Now' : 'Call'}</span>
              </a>
            )}
            {supplier.supplierEmail && (
              <a
                href={`mailto:${supplier.supplierEmail}`}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-150"
                style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)' }}
                onClick={(e) => e.stopPropagation()}
                title="Email supplier"
              >
                <Mail size={11} />
              </a>
            )}
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onViewProducts(); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-150"
                  style={{
                    background: 'rgba(13,148,136,0.1)',
                    color: '#0d9488',
                  }}
                  title="View all products & update prices"
                >
                  <DollarSign size={11} />
                  <span className="hidden xl:inline">Prices</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(supplier); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-150"
                  style={{ background: 'rgba(0,0,0,0.03)', color: 'var(--text-secondary)' }}
                  title="Edit supplier"
                >
                  <Pencil size={11} />
                </button>
              </>
            )}
            {/* Suspend / Remove actions */}
            {ownerOnly && deactivatingId !== supplier.supplierId && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeactivate(supplier.supplierId); onSetActionType('suspend'); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-150 hover:bg-amber-500/10"
                  style={{ color: '#d97706' }}
                  title="Suspend supplier"
                >
                  <PauseCircle size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeactivate(supplier.supplierId); onSetActionType('delete-with-products'); }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-150 hover:bg-red-500/10"
                  style={{ color: '#dc2626' }}
                  title="Remove supplier + products"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
            {ownerOnly && deactivatingId === supplier.supplierId && (
              <span className="inline-flex items-center gap-2 text-[11px]">
                <span className="font-bold" style={{ color: '#dc2626' }}>Confirm?</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onConfirmDeactivate(supplier.supplierId); }}
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white transition-colors hover:brightness-110"
                  style={{ background: '#dc2626' }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCancelDeactivate(); }}
                  className="text-[10px] font-bold transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No
                </button>
              </span>
            )}
          </div>

          {/* Expand chevron */}
          <div className="hidden lg:flex lg:justify-center">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[rgba(0,0,0,0.04)]"
              style={{ color: 'var(--text-muted)' }}
              title={expanded ? 'Collapse' : 'Expand products'}
            >
              <ChevronDown
                size={16}
                className="transition-transform duration-300 ease-out"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile info row — shows stock bars + product count on small screens */}
      <div className="flex items-center gap-3 px-4 pb-2 lg:hidden">
        <AiScoreBar score={supplier.supplierAiScore} />
        <div className="flex-1">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {outPct > 0 && <div className="h-full" style={{ width: `${outPct}%`, background: '#dc2626' }} />}
            {critPct > 0 && <div className="h-full" style={{ width: `${critPct}%`, background: '#f97316' }} />}
            {lowPct > 0 && <div className="h-full" style={{ width: `${lowPct}%`, background: '#eab308' }} />}
            {okPct > 0 && <div className="h-full" style={{ width: `${okPct}%`, background: '#0f766e' }} />}
          </div>
        </div>
        <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
          {supplier.totalTrackedProducts} SKUs
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronDown
            size={14}
            className="transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      </div>

      {/* ── Expand/collapse bar — visible tap target ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.03)] active:bg-[rgba(0,0,0,0.05)]"
        style={{
          color: expanded ? 'var(--color-teal)' : 'var(--text-muted)',
          borderTop: '1px solid var(--surface-border)',
        }}
        aria-expanded={expanded}
      >
        <ChevronDown
          size={13}
          className="transition-transform duration-300"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        {expanded ? 'Hide products' : `View ${supplier.affectedProducts.length} products`}
      </button>

      {/* ── Expanded product grid ── */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: expanded ? '2000px' : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div
          className="px-4 pb-4 pt-2"
          style={{
            borderTop: '1px solid var(--surface-border)',
            background: 'var(--surface-base)',
          }}
        >
          {visibleProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((p) => (
                  <ProductCard key={p.productId} product={p} canStock={canStock} />
                ))}
              </div>
              {supplier.affectedProducts.length > 12 && (
                <div className="mt-3 text-center">
                  <Link
                    href={`/dashboard/suppliers/${supplier.supplierId}/products`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-150 hover:scale-[1.02]"
                    style={{
                      color: 'var(--color-teal)',
                      background: 'rgba(13,148,136,0.06)',
                      border: '1px solid rgba(13,148,136,0.15)',
                    }}
                  >
                    <Package size={13} />
                    View All {supplier.affectedProducts.length} Products
                  </Link>
                </div>
              )}
            </>
          ) : supplier.affectedProducts.length === 0 ? (
            <div
              className="rounded-xl px-4 py-8 text-center"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <div
                className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'rgba(13,148,136,0.08)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                All linked products are healthy
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                No stock issues detected for this supplier.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl px-4 py-6 text-center text-xs"
              style={{ color: 'var(--text-muted)', background: 'var(--surface-card)' }}
            >
              No products match your search within this supplier.
            </div>
          )}

          {/* View All Products link */}
          {supplier.affectedProducts.length > 0 && supplier.affectedProducts.length <= 12 && (
            <div className="mt-3 flex justify-center">
              <Link
                href={`/dashboard/suppliers/${supplier.supplierId}/products`}
                className="inline-flex items-center gap-1 text-[11px] font-bold transition-colors hover:brightness-125"
                style={{ color: 'var(--color-teal)' }}
              >
                <Package size={11} />
                View All Products →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════
   AiScoreBar — Mini progress bar for AI score
   ═══════════════════════════════════════════════════════════════════════ */

function AiScoreBar({ score }: { score: number | null | undefined }) {
  if (typeof score !== 'number') {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className="h-1.5 w-16 overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>—</span>
      </div>
    );
  }

  const color = score >= 80 ? '#0f766e' : score >= 50 ? '#d97706' : '#dc2626';
  const gradient = score >= 80
    ? 'linear-gradient(90deg, #0f766e, #2dd4bf)'
    : score >= 50
      ? 'linear-gradient(90deg, #b45309, #fbbf24)'
      : 'linear-gradient(90deg, #991b1b, #f87171)';

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, score)}%`,
            background: gradient,
            boxShadow: `0 0 6px ${color}44`,
          }}
        />
      </div>
      <span
        className="font-mono text-[10px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ProductCard — Expanded product mini card
   ═══════════════════════════════════════════════════════════════════════ */

function ProductCard({
  product,
  canStock,
}: {
  product: AffectedProduct;
  canStock: boolean;
}) {
  const statusLabel: Record<StockStatus, string> = {
    ok: 'In Stock',
    low: 'Low Stock',
    critical: 'Critical',
    out: 'Out of Stock',
  };

  return (
    <div
      className="group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-lg hover:shadow-black/5"
      style={{
        borderColor: 'var(--surface-border)',
        background: 'var(--surface-card)',
      }}
    >
      {/* Status accent line at top */}
      <div
        className="h-0.5 w-full"
        style={{
          background:
            product.stockStatus === 'out'
              ? '#dc2626'
              : product.stockStatus === 'critical'
                ? '#f97316'
                : product.stockStatus === 'low'
                  ? '#eab308'
                  : '#0f766e',
        }}
      />

      <div className="flex gap-3 p-3">
        <PharmaProductVisual
          productName={product.productName}
          productId={product.productId}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {canStock ? (
              <Link
                href={`/dashboard/inventory/${product.productId}`}
                className="line-clamp-2 text-xs font-bold transition-colors hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {product.productName}
              </Link>
            ) : (
              <p className="line-clamp-2 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {product.productName}
              </p>
            )}
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={STATUS_STYLES[product.stockStatus]}
            >
              {statusLabel[product.stockStatus]}
            </span>
          </div>

          {/* Stock gauge */}
          <StockLevelGauge
            quantityOnHand={product.quantityOnHand}
            reorderLevel={product.reorderLevel}
            thin
            className="mt-2"
          />

          {/* Stats row */}
          <div
            className="mt-2 grid grid-cols-3 gap-2 text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <div>
              <span className="block font-bold uppercase tracking-wider" style={{ fontSize: '8px' }}>
                On Hand
              </span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                {product.quantityOnHand}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider" style={{ fontSize: '8px' }}>
                7d Sales
              </span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                {product.recentSoldQuantity7d}
              </span>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider" style={{ fontSize: '8px' }}>
                Reorder
              </span>
              <span className="font-mono font-bold" style={{ color: '#0d9488' }}>
                {product.suggestedReorderQuantity}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
