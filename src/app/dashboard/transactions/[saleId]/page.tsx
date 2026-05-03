'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  Building2,
  Clock,
  Hash,
  Package,
  User,
  Truck,
  ClipboardList,
  Printer,
  RotateCcw,
  AlertTriangle,
  Banknote,
  Smartphone,
  CreditCard,
  SplitSquareHorizontal,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { SALE_DETAIL, REFUND_SALE, REQUEST_REFUND } from '@/lib/graphql/sales.queries';
import { GhsMoney } from '@/components/ui/ghs-money';
import { useAuthStore } from '@/lib/store/auth.store';
import { isBranchWideSalesRole } from '@/lib/auth/sales-visibility';
import { ReceiptModal } from '@/components/pos/receipt-modal';
import { SmartTextarea } from '@/components/ui/smart-textarea';
import type { CartItem } from '@/types';
import { useToast } from '@/components/ui/toast';

type RefundSummary = {
  id: string;
  status: string;
  reason: string;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

type SaleDetail = {
  id: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  totalPesewas: number;
  totalFormatted: string;
  vatPesewas: number;
  status: string;
  idempotencyKey: string;
  soldAt?: string | null;
  createdAt: string;
  refundRequest?: RefundSummary | null;
  tenders: Array<{
    method: string;
    amountPesewas: number;
    amountFormatted: string;
    momoReference?: string | null;
  }>;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    classification?: string;
    quantity: number;
    unitPricePesewas: number;
    vatExempt: boolean;
    supplierId?: string | null;
    supplierName?: string | null;
    stockAfterSale: number;
    reorderLevel: number;
    stockStatus: string;
  }>;
};

function accraDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function stockStatusStyle(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case 'out':
      return { label: 'Out', bg: 'var(--stock-pill-out-bg)', color: 'var(--stock-pill-out-fg)' };
    case 'critical':
      return { label: 'Critical', bg: 'var(--stock-pill-critical-bg)', color: 'var(--stock-pill-critical-fg)' };
    case 'low':
      return { label: 'Low', bg: 'var(--stock-pill-low-bg)', color: 'var(--stock-pill-low-fg)' };
    default:
      return { label: 'OK', bg: 'var(--stock-pill-ok-bg)', color: 'var(--stock-pill-ok-fg)' };
  }
}

type TenderMeta = { label: string; icon: React.ReactNode; bg: string; color: string; border: string };

function tenderMeta(method: string): TenderMeta {
  switch (method) {
    case 'MTN_MOMO':
      return { label: 'MTN MoMo', icon: <Smartphone size={14} />, bg: 'rgba(255,204,0,0.12)', color: '#92400e', border: 'rgba(255,204,0,0.4)' };
    case 'VODAFONE_CASH':
      return { label: 'Vodafone Cash', icon: <Smartphone size={14} />, bg: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: 'rgba(220,38,38,0.25)' };
    case 'AIRTELTIGO_MONEY':
      return { label: 'AirtelTigo Money', icon: <Smartphone size={14} />, bg: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: 'rgba(37,99,235,0.25)' };
    case 'CARD':
      return { label: 'Card', icon: <CreditCard size={14} />, bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.25)' };
    case 'SPLIT':
      return { label: 'Split payment', icon: <SplitSquareHorizontal size={14} />, bg: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: 'rgba(0,109,119,0.25)' };
    default: // CASH
      return { label: 'Cash', icon: <Banknote size={14} />, bg: 'rgba(21,128,61,0.08)', color: '#15803d', border: 'rgba(21,128,61,0.25)' };
  }
}

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = typeof params.saleId === 'string' ? params.saleId : '';
  const { user } = useAuthStore();
  const { success } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const [showReceipt, setShowReceipt] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);

  const canRefund = user && ['owner', 'se_admin', 'manager'].includes(user.role);

  const [refundSale, { loading: refunding }] = useMutation(REFUND_SALE, {
    onCompleted: () => { setShowRefund(false); setRefundReason(''); window.location.reload(); },
    onError: (err) => setRefundError(err.message),
  });

  const [requestRefund, { loading: requesting }] = useMutation(REQUEST_REFUND, {
    onCompleted: () => {
      setShowRefund(false);
      setRefundReason('');
      setRefundError(null);
      success('Refund request submitted', 'Your manager will review it shortly.');
    },
    onError: (err) => setRefundError(err.message),
  });

  const { data, loading, error } = useQuery<{ sale: SaleDetail }>(SALE_DETAIL, {
    variables: { id: saleId },
    skip: !saleId,
    fetchPolicy: 'network-only',
  });

  const sale = data?.sale;
  const rr = sale?.refundRequest;
  // Block re-request if already pending; allow only on COMPLETED with no prior request
  const canRequestRefund = user && !canRefund && sale?.status === 'COMPLETED' && (!rr || rr.status === 'REJECTED');
  const subtotalGhs =
    sale != null ? Math.max(0, (sale.totalPesewas - sale.vatPesewas) / 100) : 0;


  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/transactions')}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-hover)]"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} aria-hidden />
          {user && isBranchWideSalesRole(user.role) ? 'Sales' : 'My sales'}
        </button>
      </div>

      {!saleId && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Missing sale id.
        </p>
      )}

      {error && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(220,38,38,0.07)',
            color: '#b91c1c',
            border: '1px solid rgba(220,38,38,0.2)',
          }}
        >
          {error.message.includes('Forbidden') || error.message.includes('403')
            ? 'You do not have access to this sale.'
            : error.message.includes('not found') || error.message.includes('404')
              ? 'Sale not found.'
              : error.message}
        </div>
      )}

      {loading && !sale && (
        <div className="space-y-4">
          <div className="skeleton h-10 w-2/3 max-w-md rounded-xl" />
          <div className="skeleton h-48 w-full max-w-2xl rounded-xl" />
        </div>
      )}

      {sale && (
        <>
          <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Sale details
              </h1>
              <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {sale.id}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Refund/Request button — role-based */}
              {canRefund && sale.status === 'COMPLETED' && !showRefund && (
                <button
                  type="button"
                  onClick={() => { setShowRefund(true); setRefundError(null); }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-red-50"
                  style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                >
                  <RotateCcw size={14} aria-hidden /> Refund Sale
                </button>
              )}
              {canRequestRefund && !showRefund && (
                <button
                  type="button"
                  onClick={() => { setShowRefund(true); setRefundError(null); }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-amber-50"
                  style={{ color: '#d97706', borderColor: 'rgba(217,119,6,0.3)' }}
                >
                  <RotateCcw size={14} aria-hidden />
                  {rr?.status === 'REJECTED' ? 'Re-request Refund' : 'Request Refund'}
                </button>
              )}
              {sale.status === 'REFUNDED' && (
                <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <RotateCcw size={14} /> REFUNDED
                </span>
              )}
              {rr?.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold"
                  style={{ background: 'rgba(234,179,8,0.1)', color: '#d97706', border: '1px solid rgba(234,179,8,0.3)' }}>
                  <Clock size={14} /> Refund Pending
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowReceipt(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-primary)', borderColor: 'var(--action-outline-neutral)' }}
              >
                <Printer size={14} aria-hidden />
                Print receipt
              </button>
            </div>
          </header>

          {/* ── Refund status banner ── */}
          {rr && !showRefund && (
            <div className="mb-6 rounded-xl p-4"
              style={{
                background: rr.status === 'APPROVED' ? 'rgba(22,163,74,0.06)'
                  : rr.status === 'REJECTED' ? 'rgba(220,38,38,0.06)'
                  : 'rgba(234,179,8,0.06)',
                border: `1px solid ${
                  rr.status === 'APPROVED' ? 'rgba(22,163,74,0.25)'
                  : rr.status === 'REJECTED' ? 'rgba(220,38,38,0.25)'
                  : 'rgba(234,179,8,0.25)'}`,
              }}>
              <div className="flex items-start gap-3">
                {rr.status === 'APPROVED'
                  ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
                  : rr.status === 'REJECTED'
                  ? <XCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                  : <ShieldAlert size={18} className="shrink-0 mt-0.5" style={{ color: '#d97706' }} />}
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{
                    color: rr.status === 'APPROVED' ? '#16a34a' : rr.status === 'REJECTED' ? '#dc2626' : '#d97706'
                  }}>
                    {rr.status === 'APPROVED' ? 'Refund Approved & Processed'
                      : rr.status === 'REJECTED' ? 'Refund Request Rejected'
                      : 'Refund Request Pending Manager Approval'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Reason: {rr.reason}
                  </p>
                  {rr.reviewedByName && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Reviewed by <strong>{rr.reviewedByName}</strong>
                      {rr.reviewedAt ? ` · ${accraDateTime(rr.reviewedAt)}` : ''}
                    </p>
                  )}
                  {rr.reviewNotes && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                      Note: {rr.reviewNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Refund confirmation panel */}
          {showRefund && (
            <div className="mb-6 rounded-xl border-2 p-5" style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)' }}>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                <div>
                  <h3 className="text-sm font-bold" style={{ color: '#dc2626' }}>
                    {canRefund ? 'Refund this sale?' : 'Request refund for this sale?'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {canRefund
                      ? `This will reverse the sale, return ${sale.items.length} item(s) to inventory, and mark the sale as REFUNDED.`
                      : `Your manager will review this request. The sale has ${sale.items.length} item(s) totaling ${sale.totalFormatted}.`
                    }
                  </p>
                </div>
              </div>
              {refundError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{refundError}</div>
              )}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Reason for {canRefund ? 'refund' : 'return'} *
                </label>
                <SmartTextarea
                  value={refundReason}
                  onChange={setRefundReason}
                  context="refund:reason"
                  placeholder="e.g. Customer returned product — wrong medication dispensed"
                  rows={2}
                  className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm bg-[var(--surface-base)] focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Minimum 5 characters. This will be recorded in the audit log.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canRefund ? (
                  <button
                    type="button"
                    disabled={refunding || refundReason.trim().length < 5}
                    onClick={() => refundSale({ variables: { saleId: sale.id, reason: refundReason.trim() } })}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {refunding ? 'Processing refund…' : 'Confirm Refund'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={requesting || refundReason.trim().length < 5}
                    onClick={() => requestRefund({ variables: { saleId: sale.id, reason: refundReason.trim() } })}
                    className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                  >
                    {requesting ? 'Submitting…' : 'Submit Refund Request'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowRefund(false); setRefundError(null); }}
                  className="rounded-xl border px-4 py-2.5 text-sm font-medium"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div
            className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            style={shouldReduceMotion ? undefined : { opacity: 1 }}
          >
            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <Building2 size={14} aria-hidden />
                Branch
              </div>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {sale.branchName}
              </p>
              <p className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {sale.branchId}
              </p>
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <User size={14} aria-hidden />
                Sold by
              </div>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {sale.cashierName}
              </p>
              {user?.id === sale.cashierId && (
                <p className="mt-1 text-[11px]" style={{ color: 'var(--color-teal)' }}>
                  You
                </p>
              )}
            </div>

            <div
              className="rounded-xl p-4"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <Clock size={14} aria-hidden />
                {sale.soldAt ? 'Checkout (Accra)' : 'Recorded (Accra)'}
              </div>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {accraDateTime(sale.soldAt ?? sale.createdAt)}
              </p>
              {sale.soldAt && (
                <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                  Synced to server: {accraDateTime(sale.createdAt)} — reports use checkout time for the business day.
                </p>
              )}
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Status: {sale.status}
              </p>
            </div>

            <div
              className="rounded-xl p-4 sm:col-span-2 lg:col-span-1"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <ClipboardList size={14} aria-hidden />
                Totals
              </div>
              <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <GhsMoney amount={subtotalGhs} className="font-mono" />
                </div>
                <div className="flex justify-between">
                  <span>VAT</span>
                  <GhsMoney amount={sale.vatPesewas / 100} className="font-mono" />
                </div>
                <div
                  className="flex justify-between border-t pt-2 text-base font-bold"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                >
                  <span>Total</span>
                  <GhsMoney amount={sale.totalPesewas / 100} className="font-mono font-bold" />
                </div>
              </div>
            </div>

            {/* Payment method card */}
            {sale.tenders && sale.tenders.length > 0 && (
              <div
                className="rounded-xl p-4 sm:col-span-2 lg:col-span-1"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                  <Banknote size={14} aria-hidden />
                  Payment
                </div>
                <div className="space-y-2">
                  {sale.tenders.map((tender, i) => {
                    const meta = tenderMeta(tender.method);
                    return (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                        >
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {tender.amountFormatted}
                        </span>
                      </div>
                    );
                  })}
                  {/* MoMo reference if present */}
                  {sale.tenders.some(t => t.momoReference) && (
                    <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--surface-border)' }}>
                      {sale.tenders.filter(t => t.momoReference).map((t, i) => (
                        <p key={i} className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Ref: {t.momoReference}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="mb-4 rounded-xl p-4 text-xs"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-muted)',
            }}
          >
            <div className="flex items-start gap-2">
              <Hash size={14} className="mt-0.5 shrink-0" aria-hidden />
              <div>
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Idempotency key
                </span>
                <p className="mt-0.5 break-all font-mono">{sale.idempotencyKey}</p>
              </div>
            </div>
          </div>

          <h2 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Line items & stock after sale
          </h2>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
          >
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr
                  className="text-left text-xs font-medium uppercase tracking-wide"
                  style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-muted)' }}
                >
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 w-[88px]">Type</th>
                  <th className="px-4 py-3">Qty × unit</th>
                  <th className="px-4 py-3">Line total</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Stock after</th>
                  <th className="px-4 py-3">Reorder</th>
                  <th className="px-4 py-3">Health</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((line) => {
                  const st = stockStatusStyle(line.stockStatus);
                  const lineTotal = (line.unitPricePesewas * line.quantity) / 100;
                  return (
                    <tr key={line.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Package size={14} className="mt-0.5 shrink-0 opacity-60" aria-hidden />
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {line.productName}
                            </p>
                            <p className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {line.productId}
                              {line.vatExempt ? ' · VAT exempt' : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                        {line.classification ?? 'OTC'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {line.quantity} × <GhsMoney amount={line.unitPricePesewas / 100} />
                      </td>
                      <td className="px-4 py-3">
                        <GhsMoney amount={lineTotal} className="font-mono font-semibold" />
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {line.supplierName ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {line.stockAfterSale}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                        {line.reorderLevel}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Stock &quot;after&quot; is current on-hand at this branch after the sale was recorded (live inventory may have changed since).
          </p>

          <div className="mt-8 text-center">
            <Link
              href="/dashboard/transactions"
              className="text-sm font-semibold text-teal hover:underline"
            >
              ← Back to My sales
            </Link>
          </div>

          <ReceiptModal
            isOpen={showReceipt}
            onClose={() => setShowReceipt(false)}
            items={sale.items.map<CartItem>((line) => ({
              productId: line.productId,
              name: line.productName,
              quantity: line.quantity,
              unitPriceGhs: line.unitPricePesewas / 100,
              vatExempt: line.vatExempt,
              requiresRx: false,
            }))}
            subtotal={subtotalGhs}
            vat={sale.vatPesewas / 100}
            grandTotal={sale.totalPesewas / 100}
            paymentMethod="Receipt copy"
            cashierName={sale.cashierName}
            saleId={sale.id}
            pendingSync={false}
          />
        </>
      )}
    </div>
  );
}
