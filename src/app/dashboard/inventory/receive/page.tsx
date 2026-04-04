'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Truck, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { SUPPLIERS_LIST_QUERY } from '@/lib/graphql/suppliers.queries';
import { SEARCH_PRODUCTS_QUERY } from '@/lib/graphql/products.queries';
import { CREATE_GRN_MUTATION } from '@/lib/graphql/grn.queries';
import { INVENTORY_LIST_QUERY } from '@/lib/graphql/inventory.queries';
import { formatGhs } from '@/lib/utils';

interface SupplierOption { id: string; name: string; isActive: boolean }
interface ProductHit { id: string; name: string; genericName?: string; unitPrice: number }
interface GRNLine { productId: string; productName: string; quantity: number; batchNumber: string; expiryDate: string }

export default function ReceiveStockPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const canReceive = ['owner','se_admin','manager','head_pharmacist','technician'].includes(user?.role ?? '');

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<GRNLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: suppData } = useQuery<{ suppliers: SupplierOption[] }>(SUPPLIERS_LIST_QUERY);
  const suppliers = (suppData?.suppliers ?? []).filter(s => s.isActive);

  const { data: prodData } = useQuery<{ searchProducts: ProductHit[] }>(SEARCH_PRODUCTS_QUERY, {
    variables: { query: productSearch, branchId: user?.branch_id ?? '', limit: 10 },
    skip: productSearch.length < 2 || !user?.branch_id,
  });
  const productResults = prodData?.searchProducts ?? [];

  const [createGRN, { loading: submitting }] = useMutation(CREATE_GRN_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });

  const addLine = (p: ProductHit) => {
    if (lines.some(l => l.productId === p.id)) return;
    setLines(prev => [...prev, { productId: p.id, productName: p.name, quantity: 1, batchNumber: '', expiryDate: '' }]);
    setProductSearch('');
  };

  const updateLine = (idx: number, field: keyof GRNLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setError(null);
    if (!supplierId) { setError('Select a supplier'); return; }
    if (!invoiceNumber.trim()) { setError('Enter invoice number'); return; }
    if (lines.length === 0) { setError('Add at least one product'); return; }
    for (const l of lines) {
      if (!l.batchNumber.trim()) { setError(`Enter batch number for ${l.productName}`); return; }
      if (!l.expiryDate) { setError(`Enter expiry date for ${l.productName}`); return; }
      if (l.quantity < 1) { setError(`Quantity must be at least 1 for ${l.productName}`); return; }
    }
    const totalPesewas = Math.round(parseFloat(totalAmount) * 100);
    if (isNaN(totalPesewas) || totalPesewas < 1) { setError('Enter a valid total amount'); return; }

    try {
      await createGRN({
        variables: {
          input: {
            supplierId,
            supplierInvoiceNumber: invoiceNumber.trim(),
            invoiceDate: `${invoiceDate}T00:00:00.000Z`,
            dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
            totalAmountPesewas: totalPesewas,
            items: lines.map(l => ({
              productId: l.productId,
              quantity: l.quantity,
              batchNumber: l.batchNumber.trim(),
              expiryDate: `${l.expiryDate}T00:00:00.000Z`,
            })),
            notes: notes.trim() || undefined,
          },
        },
      });
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/inventory'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GRN creation failed');
    }
  };

  if (!canReceive) {
    return (
      <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <p className="text-sm text-content-muted">You do not have permission to receive stock.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-lg"
        >
          <Check size={48} className="mx-auto mb-3 text-green-600" />
          <h2 className="text-xl font-bold text-green-800">Stock Received</h2>
          <p className="mt-1 text-sm text-green-700">GRN created, inventory updated, supplier invoice recorded.</p>
          <p className="mt-2 text-xs text-green-600">Redirecting to inventory...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <Link href="/dashboard/inventory" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
        <ArrowLeft size={14} /> Back to inventory
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
          <Truck size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-content-primary">Receive Stock (GRN)</h1>
          <p className="text-xs text-content-muted">Record goods received from supplier with invoice details</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Supplier + Invoice */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-content-primary">Supplier & Invoice</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Supplier *</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30">
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Invoice Number *</label>
                  <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001"
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Total Amount (GH₵) *</label>
                  <input type="number" step="0.01" min="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="1250.00"
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm font-mono focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Invoice Date *</label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="All items received in good condition"
                  className="w-full resize-none rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Products */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-content-primary">Products Received</h2>
            <div className="relative mb-3">
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search product to add..."
                className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
              {productSearch.length >= 2 && productResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-lg">
                  {productResults.map(p => (
                    <button key={p.id} type="button" onClick={() => addLine(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover">
                      <span className="font-medium text-content-primary">{p.name}</span>
                      <Plus size={14} className="text-teal" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border py-8 text-center">
                <Truck size={24} className="mx-auto mb-2 text-content-muted opacity-50" />
                <p className="text-sm text-content-muted">Search and add products above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={line.productId} className="rounded-xl border border-surface-border bg-surface-base p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-content-primary">{line.productName}</span>
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Qty *</label>
                        <input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Batch *</label>
                        <input value={line.batchNumber} onChange={e => updateLine(idx, 'batchNumber', e.target.value)} placeholder="BATCH-001"
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Expiry *</label>
                        <input type="date" value={line.expiryDate} onChange={e => updateLine(idx, 'expiryDate', e.target.value)}
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={handleSubmit} disabled={submitting || lines.length === 0}
            className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-dark active:scale-[0.98] disabled:opacity-50">
            {submitting ? 'Creating GRN...' : `Receive ${lines.length} product${lines.length !== 1 ? 's' : ''} & create invoice`}
          </button>
        </div>
      </div>
    </div>
  );
}
