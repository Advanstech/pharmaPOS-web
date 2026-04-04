'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { UPDATE_PRODUCT_MUTATION, DEACTIVATE_PRODUCT_MUTATION } from '@/lib/graphql/products.queries';
import { INVENTORY_LIST_QUERY } from '@/lib/graphql/inventory.queries';
import { SUPPLIERS_LIST_QUERY } from '@/lib/graphql/suppliers.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { cn } from '@/lib/utils';

interface ProductData {
  productId: string;
  productName: string;
  classification: string;
  quantityOnHand: number;
  reorderLevel: number;
  supplierId?: string | null;
  supplierName?: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProductEditModalProps {
  product: ProductData;
  unitPrice?: number;
  genericName?: string;
  barcode?: string;
  branchType?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProductEditModal({
  product, unitPrice, genericName, barcode, branchType,
  open, onClose, onSuccess,
}: ProductEditModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';
  const canEdit = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user?.role ?? '');

  const [name, setName] = useState(product.productName);
  const [generic, setGeneric] = useState(genericName ?? '');
  const [barcodeVal, setBarcodeVal] = useState(barcode ?? '');
  const [price, setPrice] = useState(unitPrice ? String(unitPrice / 100) : '');
  const [classification, setClassification] = useState(product.classification);
  const [reorderLevel, setReorderLevel] = useState(String(product.reorderLevel));
  const [supplierId, setSupplierId] = useState(product.supplierId ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data: suppData } = useQuery<{ suppliers: SupplierOption[] }>(SUPPLIERS_LIST_QUERY, {
    skip: !open,
  });
  const suppliers = (suppData?.suppliers ?? []).filter((s) => s.isActive);

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });

  const [deactivateProduct, { loading: deactivating }] = useMutation(DEACTIVATE_PRODUCT_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });

  useEffect(() => {
    if (open) {
      setName(product.productName);
      setGeneric(genericName ?? '');
      setBarcodeVal(barcode ?? '');
      setPrice(unitPrice ? String(unitPrice / 100) : '');
      setClassification(product.classification);
      setReorderLevel(String(product.reorderLevel));
      setSupplierId(product.supplierId ?? '');
      setReason('');
      setError(null);
      setShowDeactivate(false);
    }
  }, [open, product, unitPrice, genericName, barcode]);

  const handleSave = async () => {
    setError(null);
    const pricePesewas = Math.round(parseFloat(price) * 100);
    if (isNaN(pricePesewas) || pricePesewas < 0) {
      setError('Enter a valid price');
      return;
    }
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    const input: Record<string, unknown> = {};
    if (name.trim() !== product.productName) input.name = name.trim();
    if (generic.trim() !== (genericName ?? '')) input.genericName = generic.trim() || null;
    if (barcodeVal.trim() !== (barcode ?? '')) input.barcode = barcodeVal.trim() || null;
    if (pricePesewas !== unitPrice) {
      input.unitPrice = pricePesewas;
      input.reason = reason.trim() || 'Price update';
    }
    if (classification !== product.classification) input.classification = classification;
    if (parseInt(reorderLevel) !== product.reorderLevel) input.reorderLevel = Math.max(1, parseInt(reorderLevel) || 10);
    if (supplierId !== (product.supplierId ?? '')) input.supplierId = supplierId || null;

    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }

    try {
      await updateProduct({ variables: { id: product.productId, input } });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateProduct({ variables: { id: product.productId } });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deactivation failed');
    }
  };

  if (!canEdit) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative mx-4 w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl"
            initial={shouldReduceMotion ? false : { scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-content-primary">Edit Product</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-content-muted hover:bg-surface-hover">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Product Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Generic Name</label>
                  <input
                    value={generic}
                    onChange={(e) => setGeneric(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Barcode</label>
                  <input
                    value={barcodeVal}
                    onChange={(e) => setBarcodeVal(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Price (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm font-mono focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Classification</label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  >
                    <option value="OTC">OTC</option>
                    <option value="POM">POM</option>
                    <option value="CONTROLLED">CONTROLLED</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                >
                  <option value="">No supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {unitPrice !== undefined && Math.round(parseFloat(price) * 100) !== unitPrice && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Reason for price change</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Supplier price increase"
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              {isOwner && !showDeactivate ? (
                <button
                  type="button"
                  onClick={() => setShowDeactivate(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Deactivate
                </button>
              ) : isOwner && showDeactivate ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-red-600">Are you sure?</span>
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={deactivating}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deactivating ? 'Removing…' : 'Yes, deactivate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeactivate(false)}
                    className="text-xs font-bold text-content-muted hover:text-content-primary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-surface-border px-4 py-2 text-sm font-bold text-content-secondary hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updating}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white transition-all',
                    'bg-teal hover:bg-teal-dark disabled:opacity-50',
                  )}
                >
                  <Save size={14} />
                  {updating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
