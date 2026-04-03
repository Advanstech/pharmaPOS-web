'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { GhsMoney } from '@/components/ui/ghs-money';
import { printPosReceiptFromElement } from '@/lib/pos/print-pos-receipt';
import type { CartItem } from '@/types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  vat: number;
  grandTotal: number;
  paymentMethod: string;
  cashierName?: string;
  /** Set when sale is recorded on the server */
  saleId?: string | null;
  /** True when sale was queued offline — not yet on server */
  pendingSync?: boolean;
  /** Optional customer reference line (public code + optional name) */
  customerReceiptLine?: string | null;
}

export function ReceiptModal({
  isOpen,
  onClose,
  items,
  subtotal,
  vat,
  grandTotal,
  paymentMethod,
  cashierName = 'Cashier 1',
  saleId,
  pendingSync,
  customerReceiptLine,
}: ReceiptModalProps) {
  const handlePrint = useCallback(() => {
    const area = document.getElementById('pos-receipt-print-area');
    if (area) {
      printPosReceiptFromElement(area);
      return;
    }
    window.print();
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-surface-card shadow-2xl"
          >
            {/* Everything inside this id is what we send to the printer (success banner + receipt). */}
            <div id="pos-receipt-print-area" className="receipt-print-sheet bg-surface-card text-content-primary">
              {/* Header */}
              <div className="bg-teal p-6 text-center text-white print-receipt-header">
                <div className="mb-3 flex justify-center">
                  <CheckCircle2 size={48} className="text-gold" aria-hidden />
                </div>
                <h2 className="text-xl font-bold">Payment Successful</h2>
                <p className="mt-1 text-sm text-teal-100">{paymentMethod} Transaction</p>
              </div>

              {/* Receipt body */}
              <div id="printable-receipt" className="bg-surface-card p-6 text-content-primary">
              <div className="text-center mb-6">
                <h3 className="font-bold text-lg mb-1 tracking-tight">PHARMA POS</h3>
                <p className="text-xs text-content-secondary">123 Health Street, Accra, Ghana</p>
                <p className="text-xs text-content-secondary">Tel: +233 24 123 4567</p>
                <hr className="my-4 border-dashed border-surface-border" />
              </div>

              {customerReceiptLine ? (
                <p className="text-center text-xs font-mono text-content-secondary mb-3 px-2">
                  {customerReceiptLine}
                </p>
              ) : null}

              <div className="space-y-3 mb-6">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex-1 pr-2">
                      <p className="font-medium text-content-primary">{item.name}</p>
                      <p className="text-xs text-content-muted flex items-baseline gap-1">
                        <span>{item.quantity} ×</span>
                        <GhsMoney amount={item.unitPriceGhs} className="text-xs font-mono" />
                      </p>
                    </div>
                    <div className="text-right font-mono font-medium">
                      <GhsMoney amount={item.unitPriceGhs * item.quantity} />
                    </div>
                  </div>
                ))}
              </div>

              <hr className="my-4 border-dashed border-surface-border" />

              <div className="space-y-2 text-sm text-content-secondary">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <GhsMoney amount={subtotal} className="font-mono" />
                </div>
                <div className="flex justify-between">
                  <span>VAT (15%)</span>
                  <GhsMoney amount={vat} className="font-mono" />
                </div>
                <div className="flex justify-between text-base font-bold text-content-primary pt-2 mt-2 border-t border-surface-border">
                  <span>Total</span>
                  <GhsMoney amount={grandTotal} className="font-mono font-bold" />
                </div>
              </div>

              {(saleId || pendingSync) && (
                <p className="pos-receipt-meta text-center font-mono text-content-muted mt-4">
                  {pendingSync ? 'Queued — will sync when online' : `Sale ${saleId}`}
                </p>
              )}

              <div className="mt-8 text-center text-xs text-content-muted">
                <p>Cashier: {cashierName}</p>
                <p>{new Date().toLocaleString()}</p>
                <p className="mt-2 font-medium text-content-primary">Thank you for your business!</p>
              </div>
              </div>
            </div>

            {/* Actions */}
            <div className="no-print flex gap-3 border-t border-surface-border bg-surface-base p-4">
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 bg-teal text-white py-3 rounded-xl font-semibold text-sm transition-all hover:bg-teal-dark active:scale-95"
              >
                <Printer size={16} />
                Print Receipt
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 bg-surface-card text-content-secondary border border-surface-border py-3 rounded-xl font-semibold text-sm transition-all hover:bg-surface-hover active:scale-95"
              >
                <X size={16} />
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
