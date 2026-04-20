'use client';

import { useRef, useState, useEffect } from 'react';
import { useReducedMotion, AnimatePresence, motion } from 'framer-motion';
import { ShoppingCart, Trash2, Plus, Minus, Banknote, Smartphone, Receipt, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { useCartStore } from '@/lib/store/cart.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { GhsMoney } from '@/components/ui/ghs-money';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { CREATE_SALE } from '@/lib/graphql/sales.mutations';
import { DAILY_SUMMARY, RECENT_SALES } from '@/lib/graphql/sales.queries';
import { buildCreateSaleInput } from '@/lib/sales/build-create-sale-input';
import { queueSale } from '@/lib/db/offline.db';
import { useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import { useNestedLenis } from '@/lib/lenis/use-nested-lenis';
import { PosCustomerAttach } from '@/components/cart/pos-customer-attach';

export function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalGhs, totalVatGhs, prescriptionId } =
    useCartStore();
  const user = useAuthStore((s) => s.user);
  const { isOnline } = useNetworkStatus();
  const prefersReduced = useReducedMotion();
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const cartInnerRef = useRef<HTMLDivElement>(null);

  const [createSale, { loading: saleSubmitting }] = useMutation(CREATE_SALE);
  const applySaleStockSync = useInventorySyncStore((s) => s.applySaleStockSync);

  // Receipt modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [recordedSaleId, setRecordedSaleId] = useState<string | null>(null);
  const [recordedPendingSync, setRecordedPendingSync] = useState(false);
  // Snapshot the cart state for the receipt before clearing
  const [finalizedItems, setFinalizedItems] = useState([...items]);
  const [finalizedSubtotal, setFinalizedSubtotal] = useState(0);
  const [finalizedVat, setFinalizedVat] = useState(0);
  const [finalizedTotal, setFinalizedTotal] = useState(0);
  const [receiptCustomerLine, setReceiptCustomerLine] = useState<string | null>(null);

  // ── Payment tender state ──────────────────────────────────────────────────
  const subtotal   = totalGhs();
  const vat        = totalVatGhs();
  const grandTotal = subtotal + vat;

  const [tenderMode, setTenderMode] = useState<'idle' | 'cash' | 'momo'>('idle');
  const [cashInput, setCashInput] = useState('');
  const cashInputRef = useRef<HTMLInputElement>(null);

  const cashGiven = parseFloat(cashInput) || 0;
  const change = cashGiven - grandTotal;
  const hasEnough = cashGiven >= grandTotal;

  // Smart quick-amount pills: exact + rounded-up options
  function getQuickAmounts(total: number): number[] {
    const ceil1 = Math.ceil(total);
    const ceil5 = Math.ceil(total / 5) * 5;
    const ceil10 = Math.ceil(total / 10) * 10;
    const ceil20 = Math.ceil(total / 20) * 20;
    const ceil50 = Math.ceil(total / 50) * 50;
    const seen = new Set<number>();
    const pills: number[] = [];
    for (const v of [total, ceil1, ceil5, ceil10, ceil20, ceil50]) {
      const rounded = Math.round(v * 100) / 100;
      if (!seen.has(rounded) && rounded >= total) {
        seen.add(rounded);
        pills.push(rounded);
      }
    }
    return pills.slice(0, 5);
  }

  const quickAmounts = getQuickAmounts(grandTotal);

  useEffect(() => {
    if (tenderMode === 'cash') {
      setTimeout(() => cashInputRef.current?.focus(), 80);
    }
  }, [tenderMode]);

  // Reset tender when cart changes
  useEffect(() => {
    setTenderMode('idle');
    setCashInput('');
  }, [items.length]);

  const handleCashConfirm = () => {
    if (!hasEnough) return;
    void handleCheckout('Cash');
    setTenderMode('idle');
    setCashInput('');
  };

  const handleMomoConfirm = () => {
    void handleCheckout('MoMo');
    setTenderMode('idle');
  };

  // Disable Lenis on cart — native scroll works correctly with CSS zoom
  // Lenis measures container dimensions before zoom which breaks scroll at 110%+
  // Native overflow-y-auto + scroll-smooth handles this perfectly
  void cartScrollRef; void cartInnerRef; void prefersReduced;

  const handleCheckout = async (method: string) => {
    setCheckoutError(null);
    if (!user) {
      setCheckoutError('Not signed in.');
      return;
    }
    if (items.length === 0) return;

    const pomBlocked = items.some((i) => i.requiresRx && !i.prescriptionId);
    if (pomBlocked) {
      setCheckoutError('Verify prescription for POM items before payment.');
      return;
    }

    const snapshot = [...items];
    const idempotencyKey = crypto.randomUUID();
    const tenderMethod = method === 'MoMo' ? 'MTN_MOMO' : 'CASH';

    setPaymentMethod(method);
    setFinalizedItems(snapshot);
    setFinalizedSubtotal(subtotal);
    setFinalizedVat(vat);
    setFinalizedTotal(grandTotal);
    setRecordedSaleId(null);
    setRecordedPendingSync(false);

    const pc = useCartStore.getState().posCustomer;
    setReceiptCustomerLine(
      pc
        ? `Customer ref: ${pc.customerCode}${pc.name ? ` · ${pc.name}` : ''}`
        : null,
    );

    if (!isOnline) {
      await queueSale({
        id: idempotencyKey,
        branchId: user.branch_id,
        cashierId: user.id,
        items: snapshot,
        tenders: [{ method: tenderMethod, amountGhs: grandTotal }],
        totalGhs: subtotal,
        vatGhs: vat,
        prescriptionId,
        customerId: pc?.id ?? null,
        customerCode: pc?.customerCode ?? null,
        customerName: pc?.name ?? null,
        createdAt: new Date().toISOString(),
        synced: 0,
      });
      setRecordedPendingSync(true);
      setIsReceiptOpen(true);
      return;
    }

    try {
      const { data } = await createSale({
        variables: {
          input: buildCreateSaleInput(
            snapshot,
            grandTotal,
            idempotencyKey,
            tenderMethod,
            undefined,
            pc?.id ?? null,
          ),
        },
        refetchQueries: [
          { query: RECENT_SALES, variables: { limit: 20 } },
          { query: DAILY_SUMMARY, variables: { date: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }) } },
        ],
        awaitRefetchQueries: true,
      });
      const soldItems = (data?.createSale?.items ?? []) as Array<{
        productId: string;
        stockAfterSale: number;
        reorderLevel: number;
        stockStatus: 'ok' | 'low' | 'critical' | 'out';
      }>;
      if (soldItems.length > 0) {
        applySaleStockSync(user.branch_id, soldItems);
        const alerts = soldItems.filter((i) => i.stockStatus === 'low' || i.stockStatus === 'critical' || i.stockStatus === 'out');
        if (alerts.length > 0) {
          console.info('[StockAlert] post-sale low/critical products', alerts);
        }
      }
      setRecordedSaleId(data?.createSale?.id ?? null);
      setIsReceiptOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not record sale.';
      setCheckoutError(msg);
    }
  };

  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    setCheckoutError(null);
    clearCart();
  };

  return (
    <div
      style={{
        background: 'var(--surface-card)',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        position: 'relative',
      }}
    >
      {/* Inner content — flows naturally, outer div scrolls */}
      <div>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--surface-border)', position: 'sticky', top: 0, background: 'var(--surface-card)', zIndex: 4 }}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} style={{ color: 'var(--color-teal)' }} aria-hidden="true" />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Current Sale
          </span>
          <AnimatePresence>
            {items.length > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="text-[11px] font-bold text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
                style={{ background: 'var(--color-teal)' }}
              >
                {items.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs min-h-[36px] px-2 rounded-lg transition-colors hover:bg-red-50"
            style={{ color: '#dc2626' }}
            aria-label="Clear cart"
          >
            Clear
          </button>
        )}
      </div>

      <PosCustomerAttach />

      {/* Items — no separate scroll needed, outer div handles it */}
      <div
        ref={cartScrollRef}
        style={{ padding: '8px 12px' }}
      >
        <div ref={cartInnerRef}>
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface-hover)' }}
            >
              <ShoppingCart size={22} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cart is empty</p>
            <p className="text-xs text-center max-w-[160px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              Search for a product to start a sale
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={item.productId}
                initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReduced ? {} : { opacity: 0, x: -20, height: 0 }}
                transition={prefersReduced ? {} : {
                  delay: index * 0.04,
                  type: 'spring',
                  stiffness: 300,
                  damping: 28,
                }}
                className="py-3"
                style={{ borderBottom: '1px solid var(--surface-border)' }}
              >
                <div className="flex items-start gap-2">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.name}
                    </p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <GhsMoney amount={item.unitPriceGhs} className="text-xs" /> each
                    </p>
                    {/* Ghana FDA: POM badge — visible before cashier attempts checkout */}
                    {item.requiresRx && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 mt-1"
                        style={{ background: 'rgba(217,119,6,0.1)', color: '#b45309' }}
                      >
                        ℞ POM — Rx verified
                      </span>
                    )}
                    {item.vatExempt && (
                      <span className="inline-flex text-[10px] mt-1 ml-1" style={{ color: 'var(--text-muted)' }}>
                        VAT exempt
                      </span>
                    )}
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                      aria-label={`Decrease ${item.name}`}
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-7 text-center text-sm font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                      aria-label={`Increase ${item.name}`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                {/* Line total + remove */}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    <GhsMoney amount={item.unitPriceGhs * item.quantity} />
                  </p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                    style={{ color: '#dc2626' }}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        </div>
      </div>

      {/* Order summary — compact */}
      {items.length > 0 && (
        <div
          className="px-4 pt-6 pb-1"
          style={{ borderTop: '1px solid var(--surface-border)' }}
        >
          <div className="space-y-0.5">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <GhsMoney amount={subtotal} className="font-mono text-xs" />
            </div>
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>VAT 15%</span>
              <GhsMoney amount={vat} className="font-mono text-xs" />
            </div>
            <div className="flex justify-between font-bold text-sm pt-1"
              style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}>
              <span>Total (GHS)</span>
              <GhsMoney amount={grandTotal} className="font-mono font-bold text-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Payment buttons */}
      {items.length > 0 && (
        <div
          className="px-3 pb-6 pt-4"
          style={{ background: 'var(--surface-card)' }}
        >
          {checkoutError && (
            <div className="rounded-xl px-3 py-1.5 text-[11px] font-medium text-center mb-2"
              style={{ background: 'rgba(220,38,38,0.1)', color: '#b91c1c' }} role="alert">
              {checkoutError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTenderMode('cash')}
              disabled={saleSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 min-h-[48px] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,var(--color-teal-dark),var(--color-teal))', boxShadow: '0 2px 10px rgba(0,109,119,0.3)' }}
            >
              <Banknote size={16} /> Cash
            </button>
            <button
              onClick={() => setTenderMode('momo')}
              disabled={!isOnline || saleSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#c47d0e,var(--color-gold))', boxShadow: '0 2px 10px rgba(232,168,56,0.3)' }}
              title={!isOnline ? 'MoMo requires internet' : undefined}
            >
              <Smartphone size={16} /> MoMo
            </button>
          </div>

          {!isOnline && (
            <p className="text-[11px] text-center font-medium" style={{ color: '#b45309' }}>
              MoMo disabled — offline mode
            </p>
          )}
        </div>
      )}

      {/* ── Cash tender overlay — slides up over the cart ── */}
      <AnimatePresence>
        {tenderMode === 'cash' && (
          <motion.div
            key="cash-overlay"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col"
            style={{
              background: 'var(--surface-card)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
              borderTop: '1px solid var(--surface-border)',
              maxHeight: '92%',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--surface-border)' }} />
            </div>

            {/* Total reminder */}
            <div className="px-5 pb-3 shrink-0" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Cash payment
                  </p>
                  <p className="text-2xl font-mono font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    GH₵ {grandTotal.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => { setTenderMode('idle'); setCashInput(''); }}
                  className="rounded-xl px-3 py-2 text-xs font-medium"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {/* Cash input */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-muted)' }}>
                  Cash received
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}>GH₵</span>
                  <input
                    ref={cashInputRef}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && hasEnough && handleCashConfirm()}
                    placeholder={grandTotal.toFixed(2)}
                    className="w-full rounded-2xl pl-14 pr-4 py-4 text-2xl font-mono font-bold outline-none transition-all"
                    style={{
                      border: `2px solid ${cashInput ? (hasEnough ? '#16a34a' : '#dc2626') : 'var(--surface-border)'}`,
                      background: 'var(--surface-base)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              {/* Quick-amount pills */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--text-muted)' }}>Quick amounts</p>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amt) => {
                    const isSelected = cashInput === amt.toFixed(2);
                    const isExact = amt === grandTotal;
                    return (
                      <motion.button
                        key={amt}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCashInput(amt.toFixed(2))}
                        className="rounded-2xl px-4 py-2.5 text-sm font-bold font-mono transition-all min-h-[44px]"
                        style={isSelected
                          ? { background: 'var(--color-teal)', color: '#fff', border: '2px solid var(--color-teal)', boxShadow: '0 2px 8px rgba(0,109,119,0.3)' }
                          : { background: 'var(--surface-base)', color: 'var(--text-secondary)', border: '1.5px solid var(--surface-border)' }
                        }
                      >
                        {isExact
                          ? <span className="flex items-center gap-1.5"><Check size={13} /> Exact</span>
                          : `GH₵ ${amt % 1 === 0 ? amt.toFixed(0) : amt.toFixed(2)}`}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Change display */}
              <AnimatePresence>
                {cashInput && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="rounded-2xl px-5 py-4"
                    style={{
                      background: hasEnough ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)',
                      border: `2px solid ${hasEnough ? 'rgba(22,163,74,0.22)' : 'rgba(220,38,38,0.22)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: hasEnough ? '#15803d' : '#b91c1c' }}>
                          {hasEnough ? 'Change to give customer' : 'Short by'}
                        </p>
                        <p className="text-3xl font-mono font-bold mt-1"
                          style={{ color: hasEnough ? '#15803d' : '#b91c1c' }}>
                          GH₵ {Math.abs(change).toFixed(2)}
                        </p>
                      </div>
                      {hasEnough && change === 0 && (
                        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                          style={{ background: 'rgba(22,163,74,0.15)', color: '#15803d' }}>
                          <Check size={13} /> Exact
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky confirm button — always visible */}
            <div className="shrink-0 px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <button
                type="button"
                onClick={handleCashConfirm}
                disabled={!hasEnough || saleSubmitting}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] min-h-[56px] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: hasEnough
                    ? 'linear-gradient(135deg,var(--color-teal-dark),var(--color-teal))'
                    : 'var(--surface-border)',
                  boxShadow: hasEnough ? '0 4px 16px rgba(0,109,119,0.4)' : 'none',
                  color: hasEnough ? '#fff' : 'var(--text-muted)',
                }}
              >
                {saleSubmitting ? (
                  <>
                    <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Banknote size={18} />
                    {hasEnough
                      ? `Confirm Cash · GH₵ ${cashGiven.toFixed(2)}`
                      : `Enter GH₵ ${grandTotal.toFixed(2)} or more`}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MoMo confirm overlay ── */}
      <AnimatePresence>
        {tenderMode === 'momo' && (
          <motion.div
            key="momo-overlay"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col"
            style={{
              background: 'var(--surface-card)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
              borderTop: '1px solid var(--surface-border)',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--surface-border)' }} />
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Amount card */}
              <div className="rounded-2xl px-5 py-5 text-center"
                style={{ background: 'rgba(232,168,56,0.1)', border: '2px solid rgba(232,168,56,0.3)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#92400e' }}>
                  MoMo amount to collect
                </p>
                <p className="text-4xl font-mono font-bold mt-2" style={{ color: '#78350f' }}>
                  GH₵ {grandTotal.toFixed(2)}
                </p>
                <p className="text-xs mt-2 font-medium" style={{ color: '#b45309' }}>
                  Confirm after customer approves on their phone
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTenderMode('idle')}
                  className="rounded-2xl px-5 py-4 text-sm font-semibold min-h-[56px]"
                  style={{ border: '1.5px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleMomoConfirm}
                  disabled={saleSubmitting}
                  className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white transition-all active:scale-[0.98] min-h-[56px] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#c47d0e,var(--color-gold))', boxShadow: '0 4px 16px rgba(232,168,56,0.4)' }}
                >
                  {saleSubmitting ? (
                    <>
                      <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <><Smartphone size={18} /> Confirm MoMo</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
        items={finalizedItems}
        subtotal={finalizedSubtotal}
        vat={finalizedVat}
        grandTotal={finalizedTotal}
        paymentMethod={paymentMethod}
        cashierName={user?.name ?? 'Cashier'}
        saleId={recordedSaleId}
        pendingSync={recordedPendingSync}
        customerReceiptLine={receiptCustomerLine}
      />
      </div>
    </div>
  );
}
