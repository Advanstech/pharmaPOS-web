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
  branchName?: string;
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
  branchName,
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
            {/* Screen-only success banner — NOT in print area anymore */}
            <div className="bg-teal p-5 text-center text-white">
              <div className="mb-2 flex justify-center">
                <CheckCircle2 size={40} className="text-gold" aria-hidden />
              </div>
              <h2 className="text-lg font-bold">Payment Successful</h2>
              <p className="mt-0.5 text-sm text-teal-100">{paymentMethod} Transaction</p>
            </div>

            {/* Everything inside this id is what we send to the printer */}
            <div id="pos-receipt-print-area" className="receipt-print-sheet bg-surface-card text-content-primary">
              {/* Receipt body */}
              <div id="printable-receipt" className="bg-surface-card px-4 py-4 text-content-primary">
              <div className="text-center mb-3">
                <h3 className="receipt-brand font-black text-lg tracking-tighter">AZZAY PHARMACY</h3>
                {branchName && (
                  <p className="receipt-sub font-bold text-xs uppercase opacity-80">{branchName}</p>
                )}
                <p className="receipt-sub text-[10px]">Accra, Ghana</p>
                <div className="my-2 border-b border-dashed border-black/20" />
              </div>

              {customerReceiptLine ? (
                <p className="text-center text-[10px] font-mono font-bold text-content-secondary mb-2 px-2">
                  {customerReceiptLine}
                </p>
              ) : null}

              <div className="space-y-2 mb-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs leading-tight">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-content-primary receipt-item-name uppercase">{item.name}</p>
                      <p className="text-[10px] text-content-muted flex items-baseline gap-1">
                        <span>{item.quantity} ×</span>
                        <GhsMoney amount={item.unitPriceGhs} className="text-[10px] font-mono" />
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <GhsMoney amount={item.unitPriceGhs * item.quantity} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-2 border-b border-dashed border-black/20" />

              <div className="space-y-1 text-xs text-content-secondary">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <GhsMoney amount={subtotal} className="font-mono" />
                </div>
                <div className="flex justify-between">
                  <span>VAT (15.0%)</span>
                  <GhsMoney amount={vat} className="font-mono" />
                </div>
                <div className="flex justify-between text-sm font-black text-content-primary pt-1 mt-1 border-t border-black/10">
                  <span>TOTAL</span>
                  <GhsMoney amount={grandTotal} className="font-mono" />
                </div>
              </div>

              {(saleId || pendingSync) && (
                <div className="mt-4 text-center">
                  <p className="text-[9px] font-mono opacity-50 uppercase tracking-widest mb-1">Sale Identifier</p>
                  <p className="text-[10px] font-mono font-bold break-all leading-none bg-surface-base p-1.5 rounded border border-surface-border">
                    {pendingSync ? 'QUEUED FOR SYNC' : saleId}
                  </p>
                </div>
              )}

              <div className="mt-4 text-center text-[10px] leading-tight text-content-muted">
                <p>Cashier: {cashierName}</p>
                <p>{new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}</p>
                <p className="mt-2 font-black text-content-primary uppercase tracking-tighter">*** Thank you — Visit Again ***</p>
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
