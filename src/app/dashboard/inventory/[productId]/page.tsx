'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client';
import { ArrowLeft, Package, ClipboardList, PlusCircle, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { INVENTORY_LIST_QUERY, STOCK_MOVEMENTS_QUERY } from '@/lib/graphql/inventory.queries';
import { ADJUST_STOCK_MUTATION, RECEIVE_STOCK_MUTATION } from '@/lib/graphql/inventory.mutations';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { canAdjustStock, canReceiveStock } from '@/lib/auth/inventory-access';
import { ProductEditModal } from '@/components/inventory/product-edit-modal';
import { cn } from '@/lib/utils';
import { useToast, useConfirm } from '@/components/ui/toast';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StockStatus = 'critical' | 'low' | 'ok' | 'out';

type InventoryRow = {
  productId: string;
  productName: string;
  classification: string;
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  nearestExpiry?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  unitPricePesewas?: number | null;
  unitPriceFormatted?: string | null;
};

type MovementRow = {
  id: string;
  quantity: number;
  movementType: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  createdAt: string;
};

function movementLabel(type: string): string {
  const map: Record<string, string> = {
    PURCHASE: 'Stock in',
    SALE: 'Sale',
    ADJUSTMENT: 'Adjustment',
    TRANSFER_IN: 'Transfer in',
    TRANSFER_OUT: 'Transfer out',
    EXPIRY_WRITE_OFF: 'Expiry write-off',
  };
  return map[type] ?? type;
}

export default function InventoryProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawId = typeof params?.productId === 'string' ? params.productId : '';
  const productId = UUID_RE.test(rawId) ? rawId : '';
  const { user } = useAuthStore();
  const role = user?.role;
  const fromInvoiceImport = searchParams.get('source') === 'invoice-import';
  const focusReceive = searchParams.get('focus') === 'receive';
  const receiveFormRef = useRef<HTMLFormElement | null>(null);

  const canRecv = role ? canReceiveStock(role) : false;
  const canAdj = role ? canAdjustStock(role) : false;

  const [receiveQty, setReceiveQty] = useState('');
  const [receiveBatch, setReceiveBatch] = useState('');
  const [receiveExpiry, setReceiveExpiry] = useState('');
  const [receivePo, setReceivePo] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBatch, setAdjustBatch] = useState('');
  const [adjustExpiry, setAdjustExpiry] = useState('');
  const [formMessage, setFormMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const canEditProduct = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(role ?? '');
  const { info } = useToast();
  const { confirm } = useConfirm();

  // Auto-open edit modal when ?edit=true is in the URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true' && canEditProduct) {
      setEditOpen(true);
    }
  }, [searchParams, canEditProduct]);

  const { data: invData, loading: invLoading, error: invError } = useQuery<{ inventory: InventoryRow[] }>(
    INVENTORY_LIST_QUERY,
    { fetchPolicy: 'cache-and-network', pollInterval: 15_000 },
  );

  const item = useMemo(
    () => (productId ? (invData?.inventory ?? []).find((r) => r.productId === productId) : undefined),
    [invData?.inventory, productId],
  );

  const { data: movData, loading: movLoading, error: movError } = useQuery<{ stockMovements: MovementRow[] }>(
    STOCK_MOVEMENTS_QUERY,
    {
      variables: { productId, limit: 40 },
      skip: !productId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const movements = movData?.stockMovements ?? [];

  const [receiveStock, { loading: recvLoading }] = useMutation(RECEIVE_STOCK_MUTATION, {
    refetchQueries: [
      { query: INVENTORY_LIST_QUERY },
      { query: STOCK_MOVEMENTS_QUERY, variables: { productId, limit: 40 } },
    ],
  });

  const [adjustStock, { loading: adjLoading }] = useMutation(ADJUST_STOCK_MUTATION, {
    refetchQueries: [
      { query: INVENTORY_LIST_QUERY },
      { query: STOCK_MOVEMENTS_QUERY, variables: { productId, limit: 40 } },
    ],
  });

  useEffect(() => {
    if (!focusReceive || !canRecv) return;
    const form = receiveFormRef.current;
    if (!form) return;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusReceive, canRecv]);

  async function onReceive(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    const q = parseInt(receiveQty, 10);
    if (!Number.isFinite(q) || q < 1) {
      setFormMessage({ type: 'err', text: 'Enter a quantity of at least 1.' });
      return;
    }
    try {
      await receiveStock({
        variables: {
          input: {
            productId,
            quantity: q,
            batchNumber: receiveBatch.trim() || undefined,
            expiryDate: receiveExpiry ? `${receiveExpiry}T12:00:00.000Z` : undefined,
            purchaseOrderId: receivePo.trim() || undefined,
          },
        },
      });
      setReceiveQty('');
      setReceiveBatch('');
      setReceiveExpiry('');
      setReceivePo('');
      setFormMessage({ type: 'ok', text: 'Stock received and on-hand updated.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Receive failed.';
      setFormMessage({ type: 'err', text: msg });
    }
  }

  async function onAdjust(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    const d = parseInt(adjustDelta, 10);
    if (!Number.isFinite(d) || d === 0) {
      setFormMessage({ type: 'err', text: 'Enter a non-zero adjustment (e.g. -2 or +5).' });
      return;
    }
    const reason = adjustReason.trim();
    if (reason.length < 3) {
      setFormMessage({ type: 'err', text: 'Reason is required (at least 3 characters).' });
      return;
    }
    try {
      await adjustStock({
        variables: {
          input: {
            productId,
            quantityDelta: d,
            reason,
            batchNumber: adjustBatch.trim() || undefined,
            expiryDate: adjustExpiry ? `${adjustExpiry}T12:00:00.000Z` : undefined,
          },
        },
      });
      setAdjustDelta('');
      setAdjustReason('');
      setAdjustBatch('');
      setAdjustExpiry('');
      setFormMessage({ type: 'ok', text: 'Stock adjusted.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Adjustment failed.';
      setFormMessage({ type: 'err', text: msg });
    }
  }

  if (!productId) {
    return (
      <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <Link
          href="/dashboard/inventory"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal)] hover:underline"
        >
          <ArrowLeft size={16} /> Back to inventory
        </Link>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Invalid product link.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <Link
        href="/dashboard/inventory"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-teal)] hover:underline"
      >
        <ArrowLeft size={16} /> Inventory
      </Link>

      {invLoading && !item && (
        <div className="space-y-3">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      )}

      {invError && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          Could not load inventory.
        </div>
      )}

      {!invLoading && item && (
        <div
          className="mb-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <PharmaProductVisual productName={item.productName} productId={item.productId} size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {item.productName}
                </h1>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    background:
                      item.classification === 'CONTROLLED'
                        ? 'rgba(220,38,38,0.12)'
                        : item.classification === 'POM'
                          ? 'rgba(217,119,6,0.12)'
                          : 'rgba(22,163,74,0.12)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {item.classification}
                </span>
                {canEditProduct && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2.5 py-1 text-xs font-bold text-content-secondary hover:bg-surface-hover hover:text-teal transition-colors"
                  >
                    <SlidersHorizontal size={12} /> Edit
                  </button>
                )}
              </div>
              <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {item.productId}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Stat label="On hand" value={String(item.quantityOnHand)} accent />
                <Stat label="Reorder at" value={String(item.reorderLevel)} />
                <Stat
                  label="Selling Price"
                  value={item.unitPriceFormatted || '—'}
                  accent
                />
                <Stat
                  label="Status"
                  value={item.stockStatus}
                  valueClass={cn(
                    item.stockStatus === 'ok' && 'text-green-700',
                    (item.stockStatus === 'low' || item.stockStatus === 'critical') && 'text-amber-800',
                    item.stockStatus === 'out' && 'text-red-700',
                  )}
                />
                <Stat
                  label="Nearest expiry"
                  value={
                    item.nearestExpiry ? new Date(item.nearestExpiry).toLocaleDateString('en-GH') : '—'
                  }
                />
              </div>
              {item.supplierName && (
                <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Primary supplier:{' '}
                  {item.supplierId ? (
                    <Link href={'/dashboard/suppliers/' + item.supplierId + '/products'} className="font-semibold text-teal hover:underline">
                      {item.supplierName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[var(--text-secondary)]">{item.supplierName}</span>
                  )}
                </p>
              )}
              {item.unitPricePesewas && item.quantityOnHand > 0 && (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Stock value: <span className="font-semibold text-[var(--text-secondary)]">
                    GH₵{((item.unitPricePesewas * item.quantityOnHand) / 100).toFixed(2)}
                  </span>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {item.supplierId && (
                  <Link
                    href={'/dashboard/suppliers/' + item.supplierId + '/products'}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--surface-base)]"
                    style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
                  >
                    <ClipboardList size={14} />
                    Supplier products
                  </Link>
                )}
                {canEditProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      void (async () => {
                        const ok = await confirm({ title: 'Deactivate this product?', message: 'It will be hidden from POS and inventory.', confirmLabel: 'Deactivate', danger: true });
                        if (ok) info('Use the Edit modal', 'Click Edit → Deactivate to remove this product.');
                      })();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-50"
                    style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}
                  >
                    <Trash2 size={14} />
                    Remove product
                  </button>
                )}
              </div>
          </div>
        </div>
      )}

      {!invLoading && !item && (
        <div
          className="mb-6 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-start"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
        >
          <PharmaProductVisual productName="SKU" productId={productId} size="lg" className="shrink-0" />
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Not on branch inventory list
            </h1>
            <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {productId}
            </p>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Usually inactive in the catalogue or never received at this branch. If the product is active, use <strong>Receive stock</strong> below to open the shelf record.
            </p>
          </div>
        </div>
      )}

      {!invLoading && (
        <>
          {fromInvoiceImport && canRecv && (
            <div
              className="mb-4 rounded-lg px-4 py-2.5 text-sm"
              style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}
            >
              Continue invoice setup: fill <strong>Receive stock</strong> to create inbound stock records, then return to Reports & Accounting import.
            </div>
          )}
          {formMessage && (
            <div
              className="mb-4 rounded-lg px-4 py-2.5 text-sm"
              style={
                formMessage.type === 'ok'
                  ? { background: 'rgba(22,163,74,0.08)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }
                  : { background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }
              }
            >
              {formMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {canRecv && (
              <form
                ref={receiveFormRef}
                onSubmit={onReceive}
                className="rounded-2xl border p-5"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <PlusCircle size={18} className="text-[var(--color-teal)]" />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Receive stock
                  </h2>
                </div>
                <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Record inbound units (delivery, returns). Full invoice + GRN workflow stays under supplier receiving when available.
                </p>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Quantity
                    <input
                      type="number"
                      min={1}
                      required
                      value={receiveQty}
                      onChange={(e) => setReceiveQty(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Batch (optional)
                    <input
                      type="text"
                      value={receiveBatch}
                      onChange={(e) => setReceiveBatch(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Expiry (optional)
                    <input
                      type="date"
                      value={receiveExpiry}
                      onChange={(e) => setReceiveExpiry(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Purchase order ID (optional)
                    <input
                      type="text"
                      value={receivePo}
                      onChange={(e) => setReceivePo(e.target.value)}
                      placeholder="UUID"
                      className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={recvLoading}
                    className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--color-teal)' }}
                  >
                    {recvLoading ? 'Saving…' : 'Confirm receive'}
                  </button>
                </div>
              </form>
            )}

            {canAdj && (
              <form
                onSubmit={onAdjust}
                className="rounded-2xl border p-5"
                style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-[var(--color-teal)]" />
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Adjust stock
                  </h2>
                </div>
                <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Corrections and write-offs. Use negative numbers to remove units (e.g. damaged). Cannot go below zero.
                </p>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Quantity change (+ / −)
                    <input
                      type="number"
                      required
                      value={adjustDelta}
                      onChange={(e) => setAdjustDelta(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Reason (required)
                    <input
                      type="text"
                      required
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Cycle count correction"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Batch (optional)
                    <input
                      type="text"
                      value={adjustBatch}
                      onChange={(e) => setAdjustBatch(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Expiry (optional)
                    <input
                      type="date"
                      value={adjustExpiry}
                      onChange={(e) => setAdjustExpiry(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: 'var(--surface-border)',
                        background: 'var(--surface-base)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={adjLoading}
                    className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--color-teal-dark)' }}
                  >
                    {adjLoading ? 'Saving…' : 'Apply adjustment'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {!canRecv && !canAdj && (
            <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              Your role can view movement history. Receive and adjust actions are limited to pharmacists, technicians, and branch managers (adjustments: managers and lead pharmacists only).
            </p>
          )}

          <MovementsTable movements={movements} movLoading={movLoading} movError={movError} />
        </>
      )}

      {item && (
        <ProductEditModal
          product={item}
          unitPrice={item.unitPricePesewas ?? undefined}
          nearestExpiry={item.nearestExpiry ?? undefined}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  accent?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className={cn('mt-1 font-mono text-lg font-bold', accent && 'text-[var(--color-teal)]', valueClass)}>{value}</p>
    </div>
  );
}


function MovementsTable({ movements, movLoading, movError }: { movements: MovementRow[]; movLoading: boolean; movError: any }) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.ceil(movements.length / perPage);
  const paginated = movements.slice((page - 1) * perPage, page * perPage);

  return (
    <div
      className="mt-8 rounded-2xl border overflow-x-auto"
      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="flex items-center gap-2">
          <Package size={16} className="text-[var(--color-teal)]" />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Stock Movements
          </h2>
        </div>
        {movements.length > 0 && (
          <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
            {movements.length} total
          </span>
        )}
      </div>
      {movError && (
        <p className="px-4 py-3 text-sm text-red-700">Could not load movement history.</p>
      )}
      {movLoading && movements.length === 0 && (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10 rounded-lg" />
          ))}
        </div>
      )}
      {!movLoading && movements.length === 0 && !movError && (
        <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No movements recorded yet for this SKU.
        </p>
      )}
      {movements.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ background: 'var(--surface-base)', color: 'var(--text-muted)' }}
                >
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Qty</th>
                  <th className="px-4 py-2 hidden sm:table-cell">Batch</th>
                  <th className="px-4 py-2 hidden md:table-cell">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(m.createdAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
                        m.movementType === 'SALE' && 'bg-blue-50 text-blue-700',
                        m.movementType === 'PURCHASE' && 'bg-green-50 text-green-700',
                        m.movementType === 'ADJUSTMENT' && 'bg-amber-50 text-amber-700',
                        m.movementType === 'TRANSFER_IN' && 'bg-teal-50 text-teal-700',
                        m.movementType === 'TRANSFER_OUT' && 'bg-purple-50 text-purple-700',
                        m.movementType === 'REFUND' && 'bg-red-50 text-red-700',
                        m.movementType === 'EXPIRY_WRITE_OFF' && 'bg-red-50 text-red-700',
                      )}>
                        {movementLabel(m.movementType)}
                      </span>
                    </td>
                    <td
                      className={cn(
                        'px-4 py-2.5 font-mono font-semibold',
                        m.quantity < 0 ? 'text-red-700' : 'text-green-700',
                      )}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {m.batchNumber ?? '\u2014'}
                    </td>
                    <td className="hidden px-4 py-2.5 text-xs md:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString('en-GH') : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({movements.length} movements)
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                  Prev
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-30"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
