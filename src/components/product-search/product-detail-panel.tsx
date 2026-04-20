'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Tag, Layers, Truck, BrainCircuit } from 'lucide-react';
import { ProductImage } from './product-image';
import { ClassificationBadge } from './classification-badge';
import { PomRxModal } from './pom-rx-modal';
import { DrugIntelligencePanel } from '@/components/ai/drug-intelligence-panel';
import { useCartStore } from '@/lib/store/cart.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { GhsMoney } from '@/components/ui/ghs-money';
import { formatStockFraction } from '@/lib/stock-display';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import {
  canOpenInventoryFromPos,
  canOpenSuppliersFromPos,
  inventoryProductHref,
  suppliersPageHref,
} from '@/lib/auth/pos-dashboard-links';
import type { Product, UserRole } from '@/types';

interface ProductDetailPanelProps {
  product: Product;
  onClose: () => void;
  shouldReduceMotion: boolean;
}

export function ProductDetailPanel({ product, onClose, shouldReduceMotion }: ProductDetailPanelProps) {
  const addItem = useCartStore((s) => s.addItem);
  const setCartPrescriptionId = useCartStore((s) => s.setPrescriptionId);
  const user = useAuthStore((s) => s.user);
  const [pomRxOpen, setPomRxOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const branchId = user?.branch_id ?? '';
  const sessionPeakTotal = useInventorySyncStore((s) =>
    branchId ? s.displayCaps[stockSnapshotKey(branchId, product.id)] : undefined,
  );
  const role = user?.role as UserRole | undefined;
  const canProductDash = canOpenInventoryFromPos(role);
  const canSupplierDash = canOpenSuppliersFromPos(role);
  const stock = product.inventory?.quantityOnHand ?? 0;
  const reorderLevel = product.inventory?.reorderLevel ?? 10;
  const stockFrac = formatStockFraction(stock, reorderLevel, sessionPeakTotal);
  // Ghana FDA: POM products must never show "Add to sale"
  const isPom = product.requiresRx || product.classification === 'POM' || product.classification === 'CONTROLLED';
  const isOutOfStock = stock === 0;
  const isCritical = !isOutOfStock && stock <= Math.max(1, Math.floor(reorderLevel * 0.2));
  const isLow = !isOutOfStock && !isCritical && stock <= reorderLevel;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pomRxOpen) {
        setPomRxOpen(false);
        return;
      }
      onClose();
    },
    [onClose, pomRxOpen],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const batches = product.inventory?.batches ?? [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <motion.div
        layout
        initial={shouldReduceMotion ? false : { opacity: 0, x: 48 }}
        animate={{ opacity: 1, x: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 48 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 h-full w-full max-w-[420px] z-50 flex flex-col"
        style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}
        role="dialog"
        aria-modal="true"
        aria-label={`Product details: ${product.name}`}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-4 pb-3 shrink-0"
          style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)' }}
        >
          <div className="flex-1 min-w-0 pr-3">
            <ClassificationBadge classification={product.classification} />
            {canProductDash ? (
              <Link
                href={inventoryProductHref(product.id)}
                className="text-lg font-bold mt-1.5 leading-tight block underline-offset-2 hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {product.name}
              </Link>
            ) : (
              <h2 className="text-lg font-bold mt-1.5 leading-tight" style={{ color: 'var(--text-primary)' }}>
                {product.name}
              </h2>
            )}
            {product.genericName && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {product.genericName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors shrink-0"
            style={{ border: '1px solid var(--surface-border)' }}
            aria-label="Close product details"
          >
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>        </div>

        {/* AI Drug Intelligence button */}
        <div className="px-4 pt-2 shrink-0">
          <button
            onClick={() => setAiPanelOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,109,119,0.1) 0%, rgba(232,168,56,0.08) 100%)',
              border: '1px solid rgba(0,109,119,0.25)',
              color: 'var(--color-teal-dark)',
            }}
          >
            <BrainCircuit size={14} />
            <span>AI Drug Intelligence</span>
            <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: 'rgba(0,109,119,0.15)', color: 'var(--color-teal)' }}>
              GPT-4o
            </span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Image */}
          <ProductImage
            src={product.image?.urlThumb ?? product.image?.cdnUrl}
            productId={product.id}
            productName={product.name}
            genericName={product.genericName}
            categoryName={product.category?.name}
            fallbackWidth={480}
            sizes="(max-width:640px) 100vw, 400px"
            className="w-full h-32 sm:h-40 rounded-2xl object-cover"
          />

          {/* Price */}
          <div
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Unit price</span>
            <GhsMoney
              amount={product.unitPrice / 100}
              className="font-mono text-xl font-bold text-[#15803d]"
            />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Tag size={13} />, label: 'Category', value: product.category?.name ?? '—' },
              { icon: <Package size={13} />, label: 'Barcode', value: product.barcode ?? '—', mono: true },
              {
                icon: <Layers size={13} />,
                label: 'In stock',
                value: `${stockFrac}${isCritical ? ' (Critical)' : isLow ? ' (Low)' : ''}`,
              },
              { icon: <Tag size={13} />, label: 'VAT', value: product.vatExempt ? 'Exempt' : '15%' },
            ].map(({ icon, label, value, mono }) => (
              <div
                key={label}
                className="p-2.5 rounded-xl"
                style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  {icon}
                  <span className="text-[10px] uppercase tracking-wide font-semibold">{label}</span>
                </div>
                <p
                  className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Supplier chain */}
          {product.supplier && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Truck size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Supplier chain
                </span>
              </div>
              <div
                className="flex items-center justify-between p-2.5 rounded-xl"
                style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
              >
                {canSupplierDash && product.supplier.id ? (
                  <Link
                    href={suppliersPageHref(product.supplier.id)}
                    className="text-sm font-medium underline-offset-2 hover:underline"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {product.supplier.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {product.supplier.name}
                  </span>
                )}
                {product.supplier.aiScore != null && (
                  <span
                    className="text-xs font-mono font-bold"
                    style={{
                      color: product.supplier.aiScore >= 80 ? '#15803d'
                        : product.supplier.aiScore >= 60 ? '#b45309'
                        : '#b91c1c',
                    }}
                  >
                    Score {product.supplier.aiScore}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* FEFO batch register */}
          {batches.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: 'var(--text-muted)' }}>
                Batch register (FEFO)
              </p>
              <div
                className="overflow-hidden rounded-xl"
                style={{ border: '1px solid var(--surface-border)' }}
              >
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--surface-base)', borderBottom: '1px solid var(--surface-border)' }}>
                      <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Batch</th>
                      <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Qty</th>
                      <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--text-muted)' }}>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => {
                      const expiry = new Date(batch.expiryDate);
                      const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
                      const expiryColor = daysLeft <= 30 ? '#b91c1c' : daysLeft <= 90 ? '#b45309' : '#15803d';
                      return (
                        <tr
                          key={batch.batchNumber}
                          style={{ borderTop: '1px solid var(--surface-border)' }}
                        >
                          <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-primary)' }}>
                            {batch.batchNumber}
                          </td>
                          <td className="px-3 py-2 text-right" style={{ color: 'var(--text-primary)' }}>
                            {batch.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: expiryColor }}>
                            {expiry.toLocaleDateString('en-GH')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 pt-3 shrink-0" style={{ background: 'var(--surface-card)', borderTop: '1px solid var(--surface-border)' }}>
          {isOutOfStock ? (
            canSupplierDash && product.supplier?.id ? (
              <Link
                href={suppliersPageHref(product.supplier.id)}
                className="flex w-full min-h-[48px] items-center justify-center rounded-xl font-semibold text-white animate-pulse-slow"
                style={{ background: '#dc2626' }}
              >
                Reorder Now
              </Link>
            ) : (
              <button
                type="button"
                className="w-full min-h-[48px] rounded-xl font-semibold text-white animate-pulse-slow"
                style={{ background: '#dc2626' }}
              >
                Reorder Now
              </button>
            )
          ) : isPom ? (
            // Ghana FDA: POM — must verify Rx before any sale action
            <div className="space-y-2.5">
              <div
                className="rounded-xl p-3.5 text-sm"
                style={{
                  background: 'rgba(217,119,6,0.08)',
                  border: '1px solid rgba(217,119,6,0.25)',
                  color: '#92400e',
                }}
              >
                <p className="font-bold mb-0.5">℞ Prescription Required</p>
                <p className="text-xs opacity-80">
                  This is a Prescription-Only Medicine. A pharmacist must verify the prescription before dispensing.
                </p>
              </div>
              <button
                type="button"
                className="w-full min-h-[48px] rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-gold)' }}
                onClick={() => setPomRxOpen(true)}
              >
                Verify Rx first
              </button>
            </div>
          ) : (
            <button
              className="w-full min-h-[48px] rounded-xl font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'var(--color-teal)' }}
              onClick={() => {
                addItem({
                  productId: product.id,
                  name: product.name,
                  unitPriceGhs: product.unitPrice / 100,
                  quantity: 1,
                  vatExempt: product.vatExempt,
                  requiresRx: product.requiresRx,
                });
                onClose();
              }}
            >
              Add to Sale
            </button>
          )}
        </div>
      </motion.div>

      <PomRxModal
        product={product}
        open={pomRxOpen}
        onClose={() => setPomRxOpen(false)}
        onPrescriptionLinked={(prescriptionId) => {
          addItem({
            productId: product.id,
            name: product.name,
            unitPriceGhs: product.unitPrice / 100,
            quantity: 1,
            vatExempt: product.vatExempt,
            requiresRx: true,
            prescriptionId,
          });
          setCartPrescriptionId(prescriptionId);
          setPomRxOpen(false);
          onClose();
        }}
      />

      {aiPanelOpen && (
        <DrugIntelligencePanel
          product={product}
          onClose={() => setAiPanelOpen(false)}
        />
      )}
    </>
  );
}
