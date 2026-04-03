'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ChevronRight, Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { useAuthStore } from '@/lib/store/auth.store';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { INVENTORY_LIST_QUERY, LOW_STOCK_ALERTS_QUERY } from '@/lib/graphql/inventory.queries';
import { CREATE_PRODUCT_MUTATION } from '@/lib/graphql/products.queries';
import { SUPPLIERS_LIST_QUERY } from '@/lib/graphql/suppliers.queries';
import { Pagination } from '@/components/ui/pagination';
import { canCreateProduct } from '@/lib/auth/inventory-access';

type StockStatus = 'critical' | 'low' | 'ok' | 'out';

type InventoryRow = {
  productId: string;
  productName: string;
  classification: string;
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  nearestExpiry?: string | null;
  supplierName?: string | null;
};

type CreateProductMutationResult = {
  createProduct: {
    id: string;
    name: string;
  };
};

type CreateProductMutationVariables = {
  input: {
    name: string;
    genericName?: string;
    barcode?: string;
    unitPrice: number;
    classification: 'OTC' | 'POM' | 'CONTROLLED';
    branchType: 'pharmaceutical' | 'chemical' | 'both';
    reorderLevel?: number;
    supplierId?: string;
  };
};

type SupplierOption = {
  id: string;
  name: string;
  isActive: boolean;
};

const STATUS_STYLES: Record<StockStatus, CSSProperties> = {
  critical: { background: 'rgba(220,38,38,0.1)', color: '#b91c1c' },
  low: { background: 'rgba(217,119,6,0.1)', color: '#92400e' },
  ok: { background: 'rgba(22,163,74,0.1)', color: '#15803d' },
  out: { background: 'rgba(127,29,29,0.12)', color: '#7f1d1d' },
};

const STATUS_LABELS: Record<StockStatus, string> = {
  critical: 'Critical',
  low: 'Low',
  ok: 'In stock',
  out: 'Out',
};

const CLASS_STYLES: Record<string, CSSProperties> = {
  OTC: { background: 'rgba(22,163,74,0.1)', color: '#15803d' },
  POM: { background: 'rgba(217,119,6,0.1)', color: '#92400e' },
  CONTROLLED: { background: 'rgba(220,38,38,0.1)', color: '#b91c1c' },
};

const STOCK_BAR_COLOR: Record<StockStatus, string> = {
  ok: '#16a34a',
  low: '#d97706',
  critical: '#dc2626',
  out: '#7f1d1d',
};

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const itemsPerPage = 10;
  const canCreateProducts = user ? canCreateProduct(user.role) : false;
  const canViewLowStockAlerts = user
    ? ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user.role)
    : false;

  const [createProduct, { loading: createLoading, error: createError }] = useMutation<
    CreateProductMutationResult,
    CreateProductMutationVariables
  >(CREATE_PRODUCT_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }, { query: LOW_STOCK_ALERTS_QUERY }],
    awaitRefetchQueries: true,
  });

  const { data: inventoryData, loading: inventoryLoading, error: inventoryError } = useQuery<{ inventory: InventoryRow[] }>(INVENTORY_LIST_QUERY, {
    pollInterval: 5000,
    fetchPolicy: 'cache-and-network',
  });
  const { data: suppliersData, loading: suppliersLoading } = useQuery<{ suppliers: SupplierOption[] }>(SUPPLIERS_LIST_QUERY, {
    skip: !canCreateProducts,
    fetchPolicy: 'cache-and-network',
  });
  const { data: lowStockData, loading: lowStockLoading, error: lowStockError } = useQuery<{ lowStockAlerts: Array<{ productId: string }> }>(LOW_STOCK_ALERTS_QUERY, {
    skip: !canViewLowStockAlerts,
    pollInterval: 5000,
    fetchPolicy: 'cache-and-network',
  });

  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const inventory = inventoryData?.inventory ?? [];
  const activeSuppliers = useMemo(
    () => (suppliersData?.suppliers ?? []).filter((supplier) => supplier.isActive),
    [suppliersData?.suppliers],
  );
  const lowStockAlerts: Array<{ productId: string }> = canViewLowStockAlerts
    ? (lowStockData?.lowStockAlerts ?? [])
    : inventory
        .filter((item) => item.stockStatus === 'low' || item.stockStatus === 'critical' || item.stockStatus === 'out')
        .map((item) => ({ productId: item.productId }));
  const loading = inventoryLoading || (canViewLowStockAlerts && lowStockLoading);
  const error = inventoryError ?? lowStockError;
  const lowAlertIds = new Set(lowStockAlerts.map((a) => a.productId));
  const fromInvoiceImport = searchParams.get('source') === 'invoice-import';

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch =
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.classification.toLowerCase().includes(search.toLowerCase()) ||
        (item.supplierName ?? '').toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'low') return lowAlertIds.has(item.productId);
      if (filter === 'expiring') {
        if (!item.nearestExpiry) return false;
        return new Date(item.nearestExpiry) <= in30Days;
      }
      return true;
    });
  }, [filter, in30Days, inventory, lowAlertIds, search]);

  const lowCount = lowStockAlerts.length;
  const expiringCount = inventory.filter((i) => i.nearestExpiry && new Date(i.nearestExpiry) <= in30Days).length;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  async function handleCreateProduct(input: CreateProductMutationVariables['input']): Promise<void> {
    setCreateMessage(null);
    setCreatedProductId(null);
    const result = await createProduct({ variables: { input } });
    const createdId = result.data?.createProduct.id ?? null;
    const createdName = result.data?.createProduct.name ?? 'Product';
    setShowCreateModal(false);
    setCreateMessage(`${createdName} added. Open Stock to receive quantity now.`);
    setCreatedProductId(createdId);
  }

  return (
    <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Syncing stock intelligence...' : `${inventory.length} products tracked — open a row to receive, adjust, and view movement history`}
          </p>
        </div>
        {canCreateProducts && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--color-teal)' }}
          >
            <Plus size={15} />
            Add product
          </button>
        )}
      </div>

      {user && (
        <div className="mb-6">
          <AiCopilotBanner role={user.role} />
        </div>
      )}

      {createMessage && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: 'rgba(22,163,74,0.08)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }}
        >
          <span>{createMessage}</span>
          {createdProductId && (
            <Link
              href={`/dashboard/inventory/${createdProductId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: 'var(--color-teal-dark)' }}
            >
              Open Stock now
              <ChevronRight size={13} aria-hidden />
            </Link>
          )}
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          Could not load live inventory. Please refresh or check access rights.
        </div>
      )}

      <div className="mb-4 space-y-2">
        {fromInvoiceImport && (
          <div
            className="flex flex-col gap-2 rounded-lg px-4 py-2.5 text-sm"
            style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}
          >
            <span className="font-semibold">Invoice import setup</span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Open any product row and use <strong>Receive stock</strong> to record incoming quantities. This creates branch invoice records used by Reports & Accounting import.
            </span>
          </div>
        )}
        {lowCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
            style={{ background: 'rgba(217,119,6,0.08)', color: '#92400e', border: '1px solid rgba(217,119,6,0.2)' }}>
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{lowCount} product{lowCount !== 1 ? 's' : ''} below reorder level</span>
          </div>
        )}
        {expiringCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{expiringCount} product{expiringCount !== 1 ? 's' : ''} expiring within 30 days</span>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchFieldWithClear
          wrapperClassName="flex-1 min-w-48"
          value={search}
          onValueChange={setSearch}
          iconSize={15}
          type="text"
          placeholder="Search products, class, supplier..."
          className="w-full rounded-lg py-2 pl-9 pr-10 text-sm outline-none"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            color: 'var(--text-primary)',
          }}
        />
        <div className="flex gap-1 rounded-lg p-1" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
          {(['all', 'low', 'expiring'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
              style={filter === f
                ? { background: 'var(--color-teal)', color: '#fff' }
                : { color: 'var(--text-secondary)' }}
            >
              {f === 'low' ? `Low stock (${lowCount})` : f === 'expiring' ? `Expiring (${expiringCount})` : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wide"
              style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 hidden md:table-cell">Expiry</th>
              <th className="px-4 py-3 hidden lg:table-cell">Supplier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-28 text-right">Detail</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {paginated.map((item, i) => {
                const status = item.stockStatus;
                const isExpiring = item.nearestExpiry ? new Date(item.nearestExpiry) <= in30Days : false;
                return (
                  <motion.tr
                    key={item.productId}
                    initial={shouldReduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="last:border-0 transition-colors hover:bg-[var(--surface-base)]"
                    style={{ borderBottom: '1px solid var(--surface-border)' }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <div>
                          <Link
                            href={
                              fromInvoiceImport
                                ? `/dashboard/inventory/${item.productId}?source=invoice-import&focus=receive`
                                : `/dashboard/inventory/${item.productId}`
                            }
                            className="font-medium hover:underline"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.productName}
                          </Link>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.productId.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={CLASS_STYLES[item.classification] ?? CLASS_STYLES.OTC}>
                        {item.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{item.quantityOnHand}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}> / {item.reorderLevel} reorder</span>
                        <div className="mt-1 h-1 w-20 overflow-hidden rounded-full" style={{ background: 'var(--surface-border)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (item.quantityOnHand / Math.max(item.reorderLevel * 2, 1)) * 100)}%`,
                              background: STOCK_BAR_COLOR[status],
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className={cn('hidden px-4 py-3 text-xs md:table-cell')}
                      style={{ color: isExpiring ? '#b91c1c' : 'var(--text-muted)', fontWeight: isExpiring ? 600 : 400 }}>
                      {item.nearestExpiry ? new Date(item.nearestExpiry).toLocaleDateString('en-GH') : '—'}
                      {isExpiring && <span className="ml-1" aria-label="Expiring soon">⚠</span>}
                    </td>
                    <td className="hidden px-4 py-3 text-xs lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {item.supplierName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={STATUS_STYLES[status]}>
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={
                          fromInvoiceImport
                            ? `/dashboard/inventory/${item.productId}?source=invoice-import&focus=receive`
                            : `/dashboard/inventory/${item.productId}`
                        }
                        className="inline-flex items-center gap-0.5 text-xs font-bold text-[var(--color-teal)] hover:underline"
                      >
                        Stock
                        <ChevronRight size={14} aria-hidden />
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No products match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateProductModal
            loading={createLoading}
            submitError={createError?.message}
            suppliers={activeSuppliers}
            suppliersLoading={suppliersLoading}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateProduct}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

type CreateProductModalProps = {
  loading: boolean;
  submitError?: string;
  suppliers: SupplierOption[];
  suppliersLoading: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProductMutationVariables['input']) => Promise<void>;
};

function CreateProductModal({ loading, submitError, suppliers, suppliersLoading, onClose, onSubmit }: CreateProductModalProps) {
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [unitPriceGhs, setUnitPriceGhs] = useState('');
  const [classification, setClassification] = useState<'OTC' | 'POM' | 'CONTROLLED'>('OTC');
  const [branchType, setBranchType] = useState<'pharmaceutical' | 'chemical' | 'both'>('both');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setLocalError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Product name is required.');
      return;
    }

    const price = Number(unitPriceGhs);
    if (!Number.isFinite(price) || price < 0) {
      setLocalError('Enter a valid selling price in GHS.');
      return;
    }

    const reorder = Number(reorderLevel);
    if (!Number.isFinite(reorder) || reorder < 1) {
      setLocalError('Reorder level must be at least 1.');
      return;
    }

    if (suppliers.length === 0) {
      setLocalError('Create a supplier first to keep supplier intelligence synced.');
      return;
    }

    if (!supplierId) {
      setLocalError('Select a supplier before saving this product.');
      return;
    }

    await onSubmit({
      name: trimmedName,
      genericName: genericName.trim() || undefined,
      barcode: barcode.trim() || undefined,
      unitPrice: Math.round(price * 100),
      classification,
      branchType,
      reorderLevel: Math.round(reorder),
      supplierId,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}
      >
        <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Add new product
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          After saving, open Stock on the product row to receive quantity.
        </p>

        {suppliers.length === 0 && !suppliersLoading && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(217,119,6,0.09)', color: '#92400e', border: '1px solid rgba(217,119,6,0.22)' }}
          >
            No active suppliers yet. Create one in{' '}
            <Link href="/dashboard/suppliers" className="font-semibold underline" style={{ color: '#92400e' }}>
              Suppliers
            </Link>{' '}
            before adding products.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Product name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
              placeholder="Paracetamol 500mg"
            />
          </label>

          <label className="sm:col-span-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Supplier
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={suppliersLoading || suppliers.length === 0}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-70"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
            >
              <option value="">{suppliersLoading ? 'Loading suppliers...' : 'Select supplier'}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Generic name (optional)
            <input
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
              placeholder="Paracetamol"
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Barcode (optional)
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
              placeholder="EAN-13"
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Selling price (GHS)
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitPriceGhs}
              onChange={(e) => setUnitPriceGhs(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
              placeholder="12.50"
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Reorder level
            <input
              type="number"
              min={1}
              step={1}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Classification
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as 'OTC' | 'POM' | 'CONTROLLED')}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
            >
              <option value="OTC">OTC</option>
              <option value="POM">POM</option>
              <option value="CONTROLLED">CONTROLLED</option>
            </select>
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Branch type
            <select
              value={branchType}
              onChange={(e) => setBranchType(e.target.value as 'pharmaceutical' | 'chemical' | 'both')}
              className="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-base)' }}
            >
              <option value="both">Both</option>
              <option value="pharmaceutical">Pharmaceutical</option>
              <option value="chemical">Chemical</option>
            </select>
          </label>
        </div>

        {(localError || submitError) && (
          <div
            className="mt-4 rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            {localError ?? submitError}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || suppliersLoading || suppliers.length === 0}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-70"
            style={{ background: 'var(--color-teal)' }}
          >
            {loading ? 'Saving...' : 'Save product'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
