'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import {
  ArrowLeft, Package, Search, Edit3, Trash2, TrendingUp,
  ShieldCheck, AlertTriangle, Loader2,
} from 'lucide-react';
import { SUPPLIER_WITH_PRODUCTS_QUERY } from '@/lib/graphql/suppliers.queries';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { StockLevelGauge } from '@/components/dashboard/executive/stock-level-gauge';
import { Pagination } from '@/components/ui/pagination';
import { useAuthStore } from '@/lib/store/auth.store';

type StockStatus = 'ok' | 'low' | 'critical' | 'out';

interface SupplierProduct {
  id: string;
  name: string;
  genericName?: string;
  barcode?: string;
  unitPrice: number;
  classification: string;
  branchType: string;
  isActive: boolean;
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  sold7d: number;
  sold30d: number;
}

const STATUS_COLORS: Record<StockStatus, string> = {
  ok: 'bg-green-100 text-green-700',
  low: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  out: 'bg-red-200 text-red-800',
};

const toGhs = (pesewas: number) => `GH₵ ${(pesewas / 100).toFixed(2)}`;

export default function SupplierProductsPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const canEdit = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user?.role ?? '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention' | 'ok'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { data, loading, error } = useQuery(SUPPLIER_WITH_PRODUCTS_QUERY, {
    variables: { id: supplierId },
    fetchPolicy: 'cache-and-network',
  });

  const supplier = data?.supplierWithProducts;
  const products: SupplierProduct[] = supplier?.products ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter(p => {
      if (statusFilter === 'attention' && p.stockStatus === 'ok') return false;
      if (statusFilter === 'ok' && p.stockStatus !== 'ok') return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) ||
        (p.genericName || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);
    });
  }, [products, search, statusFilter]);

  // Reset page when search/filter changes
  useMemo(() => { setCurrentPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = useMemo(() => {
    let out = 0, critical = 0, low = 0, ok = 0, totalValue = 0;
    for (const p of products) {
      if (p.stockStatus === 'out') out++;
      else if (p.stockStatus === 'critical') critical++;
      else if (p.stockStatus === 'low') low++;
      else ok++;
      totalValue += p.unitPrice * p.quantityOnHand;
    }
    return { out, critical, low, ok, totalValue, total: products.length };
  }, [products]);

  if (loading && !supplier) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-red-700">Supplier not found</h2>
          <p className="mt-1 text-sm text-red-600">{error?.message || 'Could not load supplier data'}</p>
          <Link href="/dashboard/suppliers" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">
            Back to Suppliers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-5">
        <Link href="/dashboard/suppliers" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Suppliers
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {supplier.name}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {supplier.totalProducts} products · {supplier.phone || 'No phone'} · {supplier.email || 'No email'}
            </p>
          </div>
          {supplier.aiScore != null && (
            <span className="rounded-lg bg-teal/10 px-3 py-1 text-sm font-bold text-teal">
              AI Score: {supplier.aiScore}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Healthy', value: stats.ok, color: '#0f766e' },
          { label: 'Low', value: stats.low, color: '#d97706' },
          { label: 'Critical', value: stats.critical, color: '#dc2626' },
          { label: 'Out', value: stats.out, color: '#991b1b' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-3" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="mt-1 text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none"
            style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
          {(['all', 'attention', 'ok'] as const).map(key => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={statusFilter === key ? { background: 'var(--color-teal)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
              {key === 'all' ? 'All' : key === 'attention' ? 'Need Action' : 'Healthy'}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border px-4 py-12 text-center" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
          <Package className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No products match your search.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paginated.map(p => (
            <div key={p.id} className="overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
              <div className="flex gap-3 p-4">
                <PharmaProductVisual productName={p.name} productId={p.id} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/inventory/${p.id}`}
                      className="line-clamp-2 text-sm font-bold hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </Link>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[p.stockStatus]}`}>
                      {p.stockStatus}
                    </span>
                  </div>
                  {p.genericName && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{p.genericName}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold">{toGhs(p.unitPrice)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${p.classification === 'POM' ? 'bg-amber-100 text-amber-700' : p.classification === 'CONTROLLED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {p.classification}
                    </span>
                    {p.barcode && <span className="font-mono text-[10px]">{p.barcode}</span>}
                  </div>
                </div>
              </div>

              <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}>
                <StockLevelGauge quantityOnHand={p.quantityOnHand} reorderLevel={p.reorderLevel} thin />
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <div>Stock: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{p.quantityOnHand}</span></div>
                  <div>7d sales: <span className="font-semibold">{p.sold7d}</span></div>
                  <div>30d: <span className="font-semibold">{p.sold30d}</span></div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 border-t px-3 py-2" style={{ borderColor: 'var(--surface-border)' }}>
                <Link href={`/dashboard/inventory/${p.id}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors hover:bg-surface-hover"
                  style={{ color: 'var(--color-teal)' }}>
                  <TrendingUp size={12} /> Details
                </Link>
                {canEdit && (
                  <Link href={`/dashboard/inventory/${p.id}?edit=true`}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors hover:bg-surface-hover"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Edit3 size={11} /> Edit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 overflow-hidden rounded-xl" style={{ border: '1px solid var(--surface-border)' }}>
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
        </>
      )}

      {/* Stock Value */}
      <div className="mt-5 rounded-xl border p-4 text-center" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Total Stock Value from {supplier.name}
        </p>
        <p className="mt-1 text-2xl font-bold text-teal">
          GH₵ {(stats.totalValue / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
