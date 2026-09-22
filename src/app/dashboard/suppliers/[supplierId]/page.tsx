'use client';

import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Package,
  TrendingDown,
  Pencil,
  Plus,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Star,
  ShoppingCart,
  List,
  LayoutGrid,
  CheckSquare,
  Square,
  Trash2,
  ArrowRightLeft,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  SUPPLIER_WITH_PRODUCTS_QUERY,
  SUPPLIER_RESTOCK_WATCH,
  BULK_REASSIGN_PRODUCTS_TO_SUPPLIER,
  SUPPLIERS_LIST_QUERY,
} from '@/lib/graphql/suppliers.queries';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { Pagination } from '@/components/ui/pagination';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { SupplierFormModal } from '@/components/suppliers/supplier-form-modal';
import { ProductEditModal } from '@/components/inventory/product-edit-modal';

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

type SupplierProduct = {
  id: string;
  name: string;
  genericName?: string | null;
  barcode?: string | null;
  unitPrice: number;
  classification: string;
  branchType: string;
  isActive: boolean;
  quantityOnHand: number;
  reorderLevel: number;
  nearestExpiry?: string | null;
  stockStatus: StockStatus;
  sold7d?: number | null;
  sold30d?: number | null;
};

type SupplierWithProducts = {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  aiScore?: number | null;
  isActive: boolean;
  totalProducts: number;
  products: SupplierProduct[];
};

const STATUS_STYLES: Record<StockStatus, CSSProperties> = {
  ok: { background: 'var(--stock-pill-ok-bg)', color: 'var(--stock-pill-ok-fg)' },
  low: { background: 'var(--stock-pill-low-bg)', color: 'var(--stock-pill-low-fg)' },
  critical: { background: 'var(--stock-pill-critical-bg)', color: 'var(--stock-pill-critical-fg)' },
  out: { background: 'var(--stock-pill-out-bg)', color: 'var(--stock-pill-out-fg)' },
};

const STATUS_LABELS: Record<StockStatus, string> = {
  ok: 'In Stock',
  low: 'Low',
  critical: 'Critical',
  out: 'Out',
};

const CLASS_STYLES: Record<string, CSSProperties> = {
  OTC: { background: 'rgba(22,163,74,0.1)', color: '#15803d' },
  POM: { background: 'rgba(217,119,6,0.1)', color: '#92400e' },
  CONTROLLED: { background: 'rgba(220,38,38,0.1)', color: '#b91c1c' },
};

const STOCK_BAR: Record<StockStatus, string> = {
  ok: '#16a34a',
  low: '#d97706',
  critical: '#dc2626',
  out: '#7f1d1d',
};

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = typeof params?.supplierId === 'string' ? params.supplierId : '';
  const { user } = useAuthStore();
  const canManage = user ? ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user.role) : false;
  const canEditProducts = user ? ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user.role) : false;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'low' | 'critical' | 'out'>('all');
  const [productView, setProductView] = useState<'list' | 'thumbnails'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const itemsPerPage = 15;

  // ── Bulk reassignment state ─────────────────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState<string>('');
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);

  const { data: suppliersData } = useQuery<{ suppliers: Array<{ id: string; name: string; isActive: boolean }> }>(
    SUPPLIERS_LIST_QUERY,
    { skip: !showBulkActions }
  );
  const otherSuppliers = (suppliersData?.suppliers ?? []).filter(s => s.id !== supplierId && s.isActive);

  const [bulkReassign, { loading: bulkReassignLoading }] = useMutation(BULK_REASSIGN_PRODUCTS_TO_SUPPLIER, {
    refetchQueries: [{ query: SUPPLIER_WITH_PRODUCTS_QUERY, variables: { id: supplierId } }],
    onCompleted: () => {
      setSelectedProducts(new Set());
      setShowBulkActions(false);
      setTargetSupplierId('');
      setBulkActionError(null);
    },
    onError: (err) => {
      setBulkActionError(err.message || 'Failed to reassign products');
    },
  });

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const { data, loading, error } = useQuery<{ supplierWithProducts: SupplierWithProducts }>(
    SUPPLIER_WITH_PRODUCTS_QUERY,
    { variables: { id: supplierId }, fetchPolicy: 'cache-and-network', skip: !supplierId },
  );

  const supplier = data?.supplierWithProducts;
  const products = supplier?.products ?? [];

  const stats = useMemo(() => {
    const out = products.filter((p) => p.stockStatus === 'out').length;
    const critical = products.filter((p) => p.stockStatus === 'critical').length;
    const low = products.filter((p) => p.stockStatus === 'low').length;
    const ok = products.filter((p) => p.stockStatus === 'ok').length;
    const totalValue = products.reduce((s, p) => s + (p.unitPrice * p.quantityOnHand) / 100, 0);
    const sold7d = products.reduce((s, p) => s + (p.sold7d ?? 0), 0);
    return { out, critical, low, ok, totalValue, sold7d };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.stockStatus !== statusFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.genericName ?? '').toLowerCase().includes(q) || (p.barcode ?? '').includes(q);
    });
  }, [products, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Bulk selection helpers (after paginated is defined) ───────────────────
  const selectAllVisible = () => {
    const visibleIds = paginated.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedProducts.has(id));
    if (allSelected) {
      setSelectedProducts(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedProducts(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkReassign = async (removeSupplier: boolean = false) => {
    if (selectedProducts.size === 0) return;
    setBulkActionError(null);
    await bulkReassign({
      variables: {
        productIds: Array.from(selectedProducts),
        supplierId: removeSupplier ? null : targetSupplierId || null,
      },
    });
  };

  const alertLevel = stats.out > 0 || stats.critical > 0 ? 'red' : stats.low > 0 ? 'amber' : 'green';
  const alertColors = {
    green: { ring: '#0f766e', glow: '0 0 8px rgba(13,148,136,0.4)', label: 'Healthy' },
    amber: { ring: '#d97706', glow: '0 0 8px rgba(217,119,6,0.4)', label: 'Attention' },
    red: { ring: '#dc2626', glow: '0 0 8px rgba(220,38,38,0.4)', label: 'Critical' },
  }[alertLevel];

  if (!supplierId) {
    return <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Invalid supplier ID.</div>;
  }

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* ─── Hero header ─────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,rgba(13,148,136,0.08) 0%,rgba(0,109,119,0.04) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1400px] px-4 pb-6 pt-5 md:px-6">
          {/* Back nav */}
          <Link
            href="/dashboard/suppliers"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:brightness-125"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={15} />
            All Suppliers
          </Link>

          {loading && !supplier && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading supplier…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertTriangle size={15} />
              Failed to load supplier. Check your connection.
            </div>
          )}

          {supplier && (
            <>
              {/* Title row */}
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  {/* Health dot */}
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(13,148,136,0.1)', border: `2px solid ${alertColors.ring}`, boxShadow: alertColors.glow }}>
                    <div className="h-4 w-4 rounded-full" style={{ background: alertColors.ring }} title={alertColors.label} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{supplier.name}</h1>
                      {!supplier.isActive && (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: 'rgba(220,38,38,0.1)', color: '#b91c1c' }}>Suspended</span>
                      )}
                      {typeof supplier.aiScore === 'number' && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: supplier.aiScore >= 80 ? 'rgba(13,148,136,0.1)' : supplier.aiScore >= 50 ? 'rgba(217,119,6,0.1)' : 'rgba(220,38,38,0.1)', color: supplier.aiScore >= 80 ? '#0f766e' : supplier.aiScore >= 50 ? '#d97706' : '#dc2626' }}>
                          <Star size={10} />
                          AI {supplier.aiScore}
                        </span>
                      )}
                    </div>
                    {supplier.contactName && <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{supplier.contactName}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {supplier.phone && (
                        <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-1 transition-colors hover:brightness-125" style={{ color: 'var(--text-secondary)' }}>
                          <Phone size={12} /> {supplier.phone}
                        </a>
                      )}
                      {supplier.email && (
                        <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1 transition-colors hover:brightness-125" style={{ color: 'var(--text-secondary)' }}>
                          <Mail size={12} /> {supplier.email}
                        </a>
                      )}
                      {supplier.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {supplier.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/supplier-invoices?supplier=${supplierId}`}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:brightness-105"
                      style={{ color: 'var(--color-teal)', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)' }}
                    >
                      <FileText size={15} />
                      View Invoices
                    </Link>
                    <Link
                      href="/dashboard/invoices/upload"
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 hover:brightness-105"
                      style={{ color: 'var(--color-teal)', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)' }}
                    >
                      <ShoppingCart size={15} />
                      Create Invoice
                    </Link>
                    <button
                      type="button"
                      onClick={() => setFormOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                      style={{ background: 'linear-gradient(135deg,#0d9488 0%,#0f766e 100%)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}
                    >
                      <Pencil size={15} />
                      Edit Supplier
                    </button>
                  </div>
                )}
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'Total SKUs', value: supplier.totalProducts, color: 'teal' as const },
                  { label: 'In Stock', value: stats.ok, color: 'teal' as const },
                  { label: 'Low Stock', value: stats.low, color: stats.low > 0 ? 'amber' as const : 'teal' as const },
                  { label: 'Critical', value: stats.critical, color: stats.critical > 0 ? 'red' as const : 'teal' as const },
                  { label: 'Out of Stock', value: stats.out, color: stats.out > 0 ? 'red' as const : 'teal' as const },
                  { label: '7d Sales', value: stats.sold7d, color: 'teal' as const },
                ].map(({ label, value, color }) => {
                  const a = color === 'amber'
                    ? { border: 'rgba(217,119,6,0.3)', bg: 'rgba(217,119,6,0.06)', val: '#92400e' }
                    : color === 'red'
                      ? { border: 'rgba(220,38,38,0.3)', bg: 'rgba(220,38,38,0.06)', val: '#991b1b' }
                      : { border: 'rgba(13,148,136,0.2)', bg: 'rgba(13,148,136,0.06)', val: 'var(--text-primary)' };
                  return (
                    <div key={label} className="rounded-xl p-3" style={{ border: `1px solid ${a.border}`, background: a.bg }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="mt-1 font-mono text-xl font-bold" style={{ color: a.val }}>{value}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Product list ─────────────────────────────────── */}
      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        {supplier && (
          <>
            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchFieldWithClear
                wrapperClassName="flex-1 min-w-0 sm:max-w-md"
                value={search}
                onValueChange={setSearch}
                iconSize={15}
                type="text"
                placeholder="Search product name, generic, barcode…"
                className="w-full rounded-xl py-2.5 pl-9 pr-10 text-sm outline-none"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
              />
              <div className="flex shrink-0 gap-1 rounded-xl p-1" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                {(['all', 'ok', 'low', 'critical', 'out'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-150"
                    style={statusFilter === f ? { background: 'var(--color-teal)', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' } : { color: 'var(--text-secondary)' }}
                  >
                    {f === 'all' ? `All (${products.length})` : f === 'ok' ? `In Stock (${stats.ok})` : f === 'low' ? `Low (${stats.low})` : f === 'critical' ? `Critical (${stats.critical})` : `Out (${stats.out})`}
                  </button>
                ))}
              </div>
              <p className="hidden text-xs sm:block" style={{ color: 'var(--text-muted)' }}>
                {filtered.length} of {products.length} products
              </p>
              <div className="flex shrink-0 gap-1 rounded-xl p-1" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                <button
                  type="button"
                  onClick={() => setProductView('list')}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                  style={productView === 'list' ? { background: 'var(--color-teal)', color: '#fff' } : { color: 'var(--text-secondary)' }}
                >
                  <List size={13} />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setProductView('thumbnails')}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                  style={productView === 'thumbnails' ? { background: 'var(--color-teal)', color: '#fff' } : { color: 'var(--text-secondary)' }}
                >
                  <LayoutGrid size={13} />
                  Thumbnails
                </button>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkActions(!showBulkActions);
                    if (showBulkActions) setSelectedProducts(new Set());
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                  style={showBulkActions ? { background: 'var(--color-teal)', color: '#fff' } : { color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
                >
                  <ArrowRightLeft size={13} />
                  {showBulkActions ? 'Done' : 'Reassign'}
                </button>
              )}
            </div>

            {/* Bulk Actions Panel */}
            {showBulkActions && canManage && (
              <div className="mb-4 rounded-xl p-3" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={selectAllVisible}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {paginated.every(p => selectedProducts.has(p.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                      Select All Visible
                    </button>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {selectedProducts.size} selected
                    </span>
                  </div>
                  {selectedProducts.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {bulkActionError && (
                        <span className="text-xs text-red-600">{bulkActionError}</span>
                      )}
                      <select
                        value={targetSupplierId}
                        onChange={(e) => setTargetSupplierId(e.target.value)}
                        className="rounded-lg border px-2 py-1.5 text-xs"
                        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}
                      >
                        <option value="">Move to supplier…</option>
                        {otherSuppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleBulkReassign(false)}
                        disabled={!targetSupplierId || bulkReassignLoading}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: 'var(--color-teal)' }}
                      >
                        {bulkReassignLoading ? 'Moving…' : 'Move'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkReassign(true)}
                        disabled={bulkReassignLoading}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                        style={{ borderColor: 'rgba(220,38,38,0.3)' }}
                      >
                        <Trash2 size={12} />
                        Remove Supplier
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {filtered.length > 0 && productView === 'list' && (
              <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              {/* Table header */}
              <div
                className="hidden items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider lg:grid"
                style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--surface-border)',
                  background: 'rgba(0,0,0,0.02)',
                  gridTemplateColumns: showBulkActions ? '40px 40px 1fr 80px 90px 120px 90px 90px 120px' : '40px 1fr 80px 90px 120px 90px 90px 120px'
                }}
              >
                {showBulkActions && <span />}
                <span />
                <span>Product</span>
                <span>Class</span>
                <span>Status</span>
                <span>Stock</span>
                <span className="text-right">7d Sales</span>
                <span className="text-right">Price</span>
                <span className="text-right">{canEditProducts ? 'Actions' : 'Detail'}</span>
              </div>

              {paginated.map((product) => {
                const pct = Math.min(100, (product.quantityOnHand / Math.max(product.reorderLevel * 2, 1)) * 100);
                const isSelected = selectedProducts.has(product.id);
                return (
                  <div
                    key={product.id}
                    className="grid items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--surface-base)] last:border-0"
                    style={{
                      borderColor: 'var(--surface-border)',
                      gridTemplateColumns: showBulkActions ? '40px 40px 1fr auto' : '40px 1fr auto',
                      background: isSelected ? 'rgba(13,148,136,0.05)' : undefined
                    }}
                  >
                    {/* Checkbox for bulk selection */}
                    {showBulkActions && (
                      <button
                        type="button"
                        onClick={() => toggleProductSelection(product.id)}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} style={{ color: 'var(--color-teal)' }} />
                        ) : (
                          <Square size={18} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>
                    )}
                    {/* Visual + name — mobile layout */}
                    <PharmaProductVisual productName={product.name} productId={product.id} size="sm" />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/inventory/${product.id}`}
                          className="font-semibold hover:underline"
                          style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}
                        >
                          {product.name}
                        </Link>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={CLASS_STYLES[product.classification] ?? CLASS_STYLES.OTC}>
                          {product.classification}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={STATUS_STYLES[product.stockStatus]}>
                          {STATUS_LABELS[product.stockStatus]}
                        </span>
                      </div>
                      {product.genericName && (
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{product.genericName}</p>
                      )}
                      {/* Stock bar + stats */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full" style={{ background: 'var(--surface-border)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: STOCK_BAR[product.stockStatus] }} />
                          </div>
                          <span className="font-mono font-semibold">{product.quantityOnHand}</span>
                          <span style={{ color: 'var(--text-muted)' }}>/ {product.reorderLevel} reorder</span>
                        </div>
                        {product.sold7d != null && (
                          <span className="flex items-center gap-1">
                            <TrendingDown size={11} />
                            {product.sold7d} sold 7d
                          </span>
                        )}
                        <span className="font-semibold" style={{ color: 'var(--color-teal)' }}>
                          GH₵ {(product.unitPrice / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {canEditProducts && (
                        <button
                          type="button"
                          onClick={() => setEditingProduct(product)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all duration-150 hover:scale-105"
                          style={{ background: 'rgba(13,148,136,0.08)', color: 'var(--color-teal)', border: '1px solid rgba(13,148,136,0.2)' }}
                          title="Edit product"
                        >
                          <Pencil size={12} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                      <Link
                        href={`/dashboard/inventory/${product.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105"
                        style={{ background: 'rgba(13,148,136,0.06)', color: 'var(--color-teal)', border: '1px solid rgba(13,148,136,0.15)' }}
                        title="View stock"
                      >
                        <Package size={12} />
                        <span className="hidden sm:inline">Stock</span>
                        <ChevronRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
              </div>
            )}

            {filtered.length > 0 && productView === 'thumbnails' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {paginated.map((product) => {
                  const isThumbSelected = selectedProducts.has(product.id);
                  return (
                    <div
                      key={product.id}
                      className="overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
                      style={{
                        borderColor: isThumbSelected ? 'var(--color-teal)' : 'var(--surface-border)',
                        background: isThumbSelected ? 'rgba(13,148,136,0.05)' : 'var(--surface-card)',
                        boxShadow: isThumbSelected ? '0 0 0 2px var(--color-teal)' : undefined
                      }}
                    >
                      <div className="flex gap-3 p-4">
                        {showBulkActions && (
                          <button
                            type="button"
                            onClick={() => toggleProductSelection(product.id)}
                            className="flex shrink-0 items-center justify-center"
                          >
                            {isThumbSelected ? (
                              <CheckSquare size={20} style={{ color: 'var(--color-teal)' }} />
                            ) : (
                              <Square size={20} style={{ color: 'var(--text-muted)' }} />
                            )}
                          </button>
                        )}
                        <PharmaProductVisual productName={product.name} productId={product.id} size="sm" />
                        <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/dashboard/inventory/${product.id}`}
                            className="line-clamp-2 text-sm font-bold hover:underline"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {product.name}
                          </Link>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={STATUS_STYLES[product.stockStatus]}>
                            {STATUS_LABELS[product.stockStatus]}
                          </span>
                        </div>
                        {product.genericName && (
                          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{product.genericName}</p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <span className="font-semibold" style={{ color: 'var(--color-teal)' }}>
                            GH₵ {(product.unitPrice / 100).toFixed(2)}
                          </span>
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={CLASS_STYLES[product.classification] ?? CLASS_STYLES.OTC}>
                            {product.classification}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}>
                      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>
                          Stock: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{product.quantityOnHand}</span>
                        </span>
                        <span>
                          7d: <span className="font-semibold">{product.sold7d ?? 0}</span>
                        </span>
                        <span>
                          Reorder: <span className="font-semibold">{product.reorderLevel}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 border-t px-3 py-2" style={{ borderColor: 'var(--surface-border)' }}>
                      {canEditProducts && (
                        <button
                          type="button"
                          onClick={() => setEditingProduct(product)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all hover:scale-105"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                      <Link
                        href={`/dashboard/inventory/${product.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all hover:scale-105"
                        style={{ color: 'var(--color-teal)' }}
                      >
                        <Package size={11} /> Stock
                      </Link>
                    </div>
                  </div>
                );
              })}
              </div>
            )}

            {filtered.length === 0 && (
              <div className="rounded-2xl border px-6 py-12 text-center" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(13,148,136,0.08)' }}>
                  <Package size={22} style={{ color: 'var(--color-teal)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No products found</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'Try a different search term' : 'No products linked to this supplier yet'}
                </p>
              </div>
            )}

            {filtered.length > itemsPerPage && (
              <div className="mt-4 overflow-hidden rounded-xl" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  itemLabelPlural="products"
                />
              </div>
            )}

            {/* Empty products — show prompt to add */}
            {products.length === 0 && !loading && (
              <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-12 text-center" style={{ border: '1px dashed var(--surface-border)', background: 'var(--surface-card)' }}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(13,148,136,0.08)' }}>
                  <Package size={26} style={{ color: 'var(--color-teal)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No products linked to this supplier</p>
                <p className="max-w-sm text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add products from Inventory and select this supplier, or use the Invoice Upload to automatically link products.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/dashboard/inventory"
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all hover:brightness-105"
                    style={{ color: 'var(--color-teal)', background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)' }}
                  >
                    <Plus size={14} /> Go to Inventory
                  </Link>
                  <Link
                    href="/dashboard/invoices/upload"
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#0d9488 0%,#0f766e 100%)' }}
                  >
                    AI Invoice Upload
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit supplier modal */}
      {supplier && (
        <SupplierFormModal
          supplier={formOpen ? { id: supplier.id, name: supplier.name, contactName: supplier.contactName, phone: supplier.phone, email: supplier.email, address: supplier.address } : null}
          open={formOpen}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Edit product modal */}
      {editingProduct && (
        <ProductEditModal
          product={{
            productId: editingProduct.id,
            productName: editingProduct.name,
            classification: editingProduct.classification,
            quantityOnHand: editingProduct.quantityOnHand,
            reorderLevel: editingProduct.reorderLevel,
            nearestExpiry: editingProduct.nearestExpiry,
          }}
          unitPrice={editingProduct.unitPrice}
          nearestExpiry={editingProduct.nearestExpiry}
          open={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}
