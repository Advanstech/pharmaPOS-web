'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Save,
  X,
  Loader2,
  Building,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/accounting/AccountingDataTable';
import { useToast } from '@/components/ui/toast';

const GET_SUPPLIER_INVOICE = gql`
  query GetSupplierInvoice($id: ID!) {
    supplierInvoice(id: $id) {
      id
      supplierId
      invoiceNumber
      invoiceDate
      dueDate
      totalAmountPesewas
      totalAmountFormatted
      paidAmountPesewas
      paidAmountFormatted
      balancePesewas
      balanceFormatted
      paymentProgressPct
      paymentTerms
      paymentStatus
      daysOutstanding
      isOverdue
      overdueByDays
      suggestedNextPaymentPesewas
      suggestedNextPaymentFormatted
      supplierName
      s3PdfKey
      grnId
      payments {
        id
        amountPesewas
        amountFormatted
        paymentMethod
        reference
        notes
        paidByName
        paidAt
      }
    }
  }
`;

const RECORD_SUPPLIER_PAYMENT = gql`
  mutation RecordSupplierPayment($input: RecordSupplierPaymentInput!) {
    recordSupplierPayment(input: $input) {
      id
      balancePesewas
      balanceFormatted
      paymentStatus
      paidAmountFormatted
      paymentProgressPct
      payments {
        id
        amountFormatted
        paymentMethod
        paidAt
        notes
        paidByName
        reference
      }
    }
  }
`;

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CHEQUE', label: 'Cheque' },
];

function fmtDate(val: string | null | undefined) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium' });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { success, error: toastError, warning } = useToast();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    reference: '',
    notes: '',
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_SUPPLIER_INVOICE, {
    variables: { id: invoiceId },
    fetchPolicy: 'cache-and-network',
  });

  const [recordPayment] = useMutation(RECORD_SUPPLIER_PAYMENT, {
    onCompleted: () => {
      setShowPaymentForm(false);
      setPaymentForm({ amount: '', paymentMethod: 'BANK_TRANSFER', reference: '', notes: '' });
      success('Payment recorded successfully.');
      refetch();
    },
  });

  const invoice = data?.supplierInvoice;

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || !invoice) return;
    const amountPesewas = Math.round(parseFloat(paymentForm.amount.replace(/[^0-9.]/g, '')) * 100);
    if (amountPesewas <= 0 || amountPesewas > invoice.balancePesewas) {
      warning('Invalid amount', 'Enter a valid amount not exceeding the outstanding balance.');
      return;
    }
    setRecordingPayment(true);
    try {
      await recordPayment({
        variables: {
          input: {
            invoiceId,
            amountPesewas,
            paymentMethod: paymentForm.paymentMethod,
            reference: paymentForm.reference || null,
            notes: paymentForm.notes || null,
          },
        },
      });
    } catch (err) {
      toastError('Payment failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading && !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: '#0d9488' }} />
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#dc2626' }} />
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Invoice not found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {error?.message ?? 'This invoice may have been deleted or you lack access.'}
          </p>
          <Link href="/dashboard/accounting/invoices"
            className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-teal hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = invoice.paymentStatus === 'PAID';

  return (
    <div className="p-5" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Back + header */}
      <div className="mb-5">
        <Link href="/dashboard/accounting/invoices"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Invoice #{invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.paymentStatus} />
              {invoice.isOverdue && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#b91c1c' }}>
                  {invoice.overdueByDays}d overdue
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {invoice.supplierName}
            </p>
          </div>
          {!isPaid && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: '#0d9488', boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}
            >
              <CreditCard className="h-4 w-4" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Payment form */}
      {showPaymentForm && (
        <div className="mb-5 rounded-2xl overflow-hidden"
          style={{ border: '2px solid rgba(13,148,136,0.3)', background: 'var(--surface-card)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" style={{ color: '#0d9488' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Record Payment</h3>
            </div>
            <button onClick={() => setShowPaymentForm(false)}
              className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Amount (GHS) — balance: {invoice.balanceFormatted}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder={`${(invoice.balancePesewas / 100).toFixed(2)}`}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              >
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Reference</label>
              <input
                type="text"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                placeholder="Transaction reference"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 pb-5">
            <button
              onClick={() => void handleRecordPayment()}
              disabled={recordingPayment || !paymentForm.amount}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0d9488' }}
            >
              {recordingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {recordingPayment ? 'Recording…' : 'Record Payment'}
            </button>
            <button onClick={() => setShowPaymentForm(false)}
              className="rounded-xl border px-4 py-2.5 text-sm font-medium"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Invoice details */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4" style={{ color: '#0d9488' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Invoice Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Invoice Date</p>
                <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Calendar className="h-3.5 w-3.5" /> {fmtDate(invoice.invoiceDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Due Date</p>
                <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: invoice.isOverdue ? '#b91c1c' : 'var(--text-primary)' }}>
                  <Calendar className="h-3.5 w-3.5" /> {fmtDate(invoice.dueDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Payment Terms</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{invoice.paymentTerms ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Days Outstanding</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{invoice.daysOutstanding} days</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Amount</p>
                <p className="text-base font-bold mt-0.5 font-mono" style={{ color: 'var(--text-primary)' }}>{invoice.totalAmountFormatted}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Balance Due</p>
                <p className="text-base font-bold mt-0.5 font-mono" style={{ color: isPaid ? '#15803d' : '#0d9488' }}>{invoice.balanceFormatted}</p>
              </div>
            </div>

            {/* Progress bar */}
            {invoice.totalAmountPesewas > 0 && (
              <div className="mt-5">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>Payment progress</span>
                  <span className="font-bold">{invoice.paymentProgressPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${invoice.paymentProgressPct}%`, background: isPaid ? '#16a34a' : '#0d9488' }} />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Paid: {invoice.paidAmountFormatted}</span>
                  <span>Total: {invoice.totalAmountFormatted}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment history */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
              <TrendingUp className="h-4 w-4" style={{ color: '#0d9488' }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Payment History ({invoice.payments.length})
              </h2>
            </div>
            {invoice.payments.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No payments recorded yet</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
                {invoice.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{p.amountFormatted}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {p.paymentMethod.replace(/_/g, ' ')}
                        </span>
                        {p.reference && (
                          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>· {p.reference}</span>
                        )}
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {p.paidByName}</span>
                      </div>
                      {p.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <CheckCircle className="h-4 w-4 ml-auto mb-1" style={{ color: '#16a34a' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(p.paidAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Supplier */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Building className="h-4 w-4" style={{ color: '#0d9488' }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Supplier</h2>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{invoice.supplierName}</p>
          </div>

          {/* Summary */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Summary</h2>
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Invoice Total', value: invoice.totalAmountFormatted },
                { label: 'Paid', value: invoice.paidAmountFormatted, color: '#15803d' },
                { label: 'Balance', value: invoice.balanceFormatted, color: isPaid ? '#15803d' : '#0d9488', bold: true },
              ].map(({ label, value, color, bold }) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className={`font-mono ${bold ? 'font-bold text-base' : ''}`}
                    style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
            {!isPaid && invoice.suggestedNextPaymentPesewas > 0 && (
              <div className="mt-3 rounded-xl p-3"
                style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#0d9488' }}>Suggested next payment</p>
                <p className="text-base font-bold font-mono mt-0.5" style={{ color: '#0d9488' }}>
                  {invoice.suggestedNextPaymentFormatted}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
