'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  FileText,
  MoreVertical,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { SUPPLIER_INVOICES } from '@/lib/graphql/accounting.queries';
import { RECORD_SUPPLIER_PAYMENT } from '@/lib/graphql/invoice-ocr.mutations';
import { GET_SUPPLIER_INVOICE } from '@/lib/graphql/invoice-ocr.queries';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { Pagination } from '@/components/ui/pagination';

type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
type InvoiceStatus = 'PENDING' | 'MATCHED' | 'VERIFIED' | 'PAID';

interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  totalAmountPesewas: number;
  totalAmountFormatted: string;
  paidAmountPesewas: number;
  paidAmountFormatted: string;
  balancePesewas: number;
  balanceFormatted: string;
  paymentProgressPct: number;
  paymentStatus: PaymentStatus;
  daysOutstanding: number;
  isOverdue: boolean;
  overdueByDays?: number;
  grnId?: string;
}

interface Payment {
  id: string;
  amountFormatted: string;
  paymentMethod: string;
  reference?: string;
  paidByName: string;
  paidAt: string;
}

interface InvoiceDetail extends SupplierInvoice {
  payments: Payment[];
  suggestedNextPaymentFormatted: string;
  remainingAfterSuggestedFormatted: string;
}

const STATUS_STYLES: Record<PaymentStatus, { bg: string; text: string; icon: typeof AlertCircle }> = {
  UNPAID: { bg: 'rgba(220,38,38,0.1)', text: '#dc2626', icon: AlertCircle },
  PARTIAL: { bg: 'rgba(217,119,6,0.1)', text: '#d97706', icon: Clock },
  PAID: { bg: 'rgba(22,163,74,0.1)', text: '#16a34a', icon: CheckCircle },
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Unpaid',
  PARTIAL: 'Partial',
  PAID: 'Paid',
};

export default function SupplierInvoicesPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const supplierIdFromQuery = searchParams.get('supplier');
  
  const canManagePayments = user ? ['owner', 'se_admin', 'manager'].includes(user.role) : false;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [overdueFilter, setOverdueFilter] = useState<'all' | 'overdue' | 'upcoming'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const itemsPerPage = 10;

  const { data, loading, error, refetch } = useQuery<{ supplierInvoices: SupplierInvoice[] }>(
    SUPPLIER_INVOICES,
    { 
      variables: supplierIdFromQuery ? { supplierId: supplierIdFromQuery } : {},
      fetchPolicy: 'cache-and-network' 
    }
  );

  const { data: detailData } = useQuery<{ supplierInvoice: InvoiceDetail }>(
    GET_SUPPLIER_INVOICE,
    { 
      variables: { id: selectedInvoice?.id },
      skip: !selectedInvoice,
      fetchPolicy: 'cache-and-network'
    }
  );

  const invoices = data?.supplierInvoices ?? [];

  const stats = useMemo(() => {
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balancePesewas, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmountPesewas, 0);
    const overdueCount = invoices.filter(inv => inv.isOverdue).length;
    const upcomingCount = invoices.filter(inv => !inv.isOverdue && inv.paymentStatus !== 'PAID').length;
    return { totalOutstanding, totalPaid, overdueCount, upcomingCount };
  }, [invoices]);

  const filtered = useMemo(() => {
    let result = invoices;
    
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(inv => 
        inv.supplierName.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.paymentStatus === statusFilter);
    }

    if (overdueFilter === 'overdue') {
      result = result.filter(inv => inv.isOverdue);
    } else if (overdueFilter === 'upcoming') {
      result = result.filter(inv => !inv.isOverdue && inv.paymentStatus !== 'PAID');
    }

    return result;
  }, [invoices, search, statusFilter, overdueFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRecordPayment = async (amount: number, method: string, reference: string) => {
    if (!selectedInvoice) return;
    // Payment mutation will be added here
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg,rgba(13,148,136,0.08) 0%,rgba(0,109,119,0.04) 100%)', 
        borderBottom: '1px solid var(--surface-border)' 
      }}>
        <div className="mx-auto max-w-[1400px] px-4 pb-6 pt-5 md:px-6">
          <Link
            href="/dashboard/accounting"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:brightness-125"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={15} />
            Accounting
          </Link>

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Supplier Invoices
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Track payments, manage dues, and monitor supplier payables
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/invoices/upload"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:brightness-110"
                style={{ 
                  background: 'linear-gradient(135deg,#0d9488 0%,#0f766e 100%)', 
                  boxShadow: '0 4px 14px rgba(13,148,136,0.35)' 
                }}
              >
                <Plus size={15} />
                Upload Invoice
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { 
                label: 'Total Outstanding', 
                value: `GH₵ ${(stats.totalOutstanding / 100).toFixed(2)}`,
                color: '#dc2626',
                icon: Wallet
              },
              { 
                label: 'Total Paid (YTD)', 
                value: `GH₵ ${(stats.totalPaid / 100).toFixed(2)}`,
                color: '#16a34a',
                icon: CheckCircle
              },
              { 
                label: 'Overdue', 
                value: stats.overdueCount,
                color: stats.overdueCount > 0 ? '#dc2626' : 'var(--text-muted)',
                icon: AlertCircle
              },
              { 
                label: 'Due Soon', 
                value: stats.upcomingCount,
                color: stats.upcomingCount > 0 ? '#d97706' : 'var(--text-muted)',
                icon: Clock
              },
            ].map(({ label, value, color, icon: Icon }) => (
              <div 
                key={label}
                className="rounded-xl border p-4"
                style={{ 
                  borderColor: 'var(--surface-border)', 
                  background: 'var(--surface-card)' 
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} style={{ color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
                </div>
                <p className="mt-1 text-lg font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchFieldWithClear
            wrapperClassName="flex-1 min-w-0 sm:max-w-md"
            value={search}
            onValueChange={setSearch}
            iconSize={15}
            type="text"
            placeholder="Search supplier or invoice number..."
            className="w-full rounded-xl py-2.5 pl-9 pr-10 text-sm outline-none"
            style={{ 
              background: 'var(--surface-card)', 
              border: '1px solid var(--surface-border)', 
              color: 'var(--text-primary)' 
            }}
          />
          
          <div className="flex shrink-0 gap-1 rounded-xl p-1" style={{ 
            border: '1px solid var(--surface-border)', 
            background: 'var(--surface-card)' 
          }}>
            {(['all', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-150"
                style={statusFilter === f ? { 
                  background: 'var(--color-teal)', 
                  color: '#fff', 
                  boxShadow: '0 2px 8px rgba(13,148,136,0.3)' 
                } : { color: 'var(--text-secondary)' }}
              >
                {f === 'all' ? 'All' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 gap-1 rounded-xl p-1" style={{ 
            border: '1px solid var(--surface-border)', 
            background: 'var(--surface-card)' 
          }}>
            {(['all', 'overdue', 'upcoming'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setOverdueFilter(f); setCurrentPage(1); }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-150"
                style={overdueFilter === f ? { 
                  background: f === 'overdue' ? '#dc2626' : f === 'upcoming' ? '#d97706' : 'var(--color-teal)', 
                  color: '#fff', 
                  boxShadow: `0 2px 8px ${f === 'overdue' ? 'rgba(220,38,38,0.3)' : f === 'upcoming' ? 'rgba(217,119,6,0.3)' : 'rgba(13,148,136,0.3)'}` 
                } : { color: 'var(--text-secondary)' }}
              >
                {f === 'all' ? 'All Dates' : f === 'overdue' ? 'Overdue' : 'Due Soon'}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" 
              style={{ color: 'var(--text-muted)' }} />
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 text-center" style={{ 
            background: 'rgba(220,38,38,0.06)', 
            border: '1px solid rgba(220,38,38,0.2)' 
          }}>
            <p className="text-sm" style={{ color: '#dc2626' }}>Failed to load invoices</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border px-6 py-12 text-center" style={{ 
            borderColor: 'var(--surface-border)', 
            background: 'var(--surface-card)' 
          }}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" 
              style={{ background: 'rgba(13,148,136,0.08)' }}>
              <FileText size={22} style={{ color: 'var(--color-teal)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              No invoices found
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Try a different search term' : 'Upload a supplier invoice to get started'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-2xl" style={{ 
            border: '1px solid var(--surface-border)', 
            background: 'var(--surface-card)', 
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)' 
          }}>
            {/* Table Header */}
            <div
              className="hidden items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-wider lg:grid"
              style={{ 
                color: 'var(--text-muted)', 
                borderBottom: '1px solid var(--surface-border)', 
                background: 'rgba(0,0,0,0.02)',
                gridTemplateColumns: '1.5fr 100px 120px 100px 100px 80px 120px'
              }}
            >
              <span>Supplier / Invoice</span>
              <span>Invoice Date</span>
              <span>Total Amount</span>
              <span>Paid</span>
              <span>Balance</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Table Rows */}
            {paginated.map((invoice) => {
              const statusStyle = STATUS_STYLES[invoice.paymentStatus];
              const StatusIcon = statusStyle.icon;

              return (
                <div
                  key={invoice.id}
                  className="grid items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--surface-base)] last:border-0 lg:grid-cols-[1.5fr_100px_120px_100px_100px_80px_120px]"
                  style={{ borderColor: 'var(--surface-border)' }}
                >
                  {/* Supplier & Invoice */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                      <Link
                        href={`/dashboard/suppliers/${invoice.supplierId}`}
                        className="font-semibold hover:underline"
                        style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}
                      >
                        {invoice.supplierName}
                      </Link>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <FileText size={12} />
                      <span>{invoice.invoiceNumber}</span>
                      {invoice.isOverdue && (
                        <span 
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
                        >
                          {invoice.overdueByDays}d overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div>{new Date(invoice.invoiceDate).toLocaleDateString()}</div>
                    {invoice.dueDate && (
                      <div className="mt-0.5" style={{ color: invoice.isOverdue ? '#dc2626' : 'var(--text-muted)' }}>
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Amounts */}
                  <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {invoice.totalAmountFormatted}
                  </div>
                  <div className="font-mono text-sm" style={{ color: '#16a34a' }}>
                    {invoice.paidAmountFormatted}
                  </div>
                  <div className="font-mono text-sm font-semibold" style={{ color: '#dc2626' }}>
                    {invoice.balanceFormatted}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      <StatusIcon size={10} />
                      {STATUS_LABELS[invoice.paymentStatus]}
                    </span>
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex items-center justify-end gap-2">
                    {/* Progress Bar */}
                    <div className="hidden w-16 sm:block">
                      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-border)' }}>
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${invoice.paymentProgressPct}%`, 
                            background: invoice.paymentStatus === 'PAID' ? '#16a34a' : '#d97706'
                          }} 
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                        {invoice.paymentProgressPct}%
                      </p>
                    </div>

                    {canManagePayments && invoice.paymentStatus !== 'PAID' && (
                      <button
                        type="button"
                        onClick={() => { setSelectedInvoice(invoice); setShowPaymentModal(true); }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105"
                        style={{ 
                          background: 'rgba(13,148,136,0.08)', 
                          color: 'var(--color-teal)', 
                          border: '1px solid rgba(13,148,136,0.2)' 
                        }}
                      >
                        <CreditCard size={12} />
                        Pay
                      </button>
                    )}

                    <Link
                      href={`/dashboard/inventory/receive?grn=${invoice.grnId}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105"
                      style={{ 
                        background: 'rgba(13,148,136,0.06)', 
                        color: 'var(--color-teal)', 
                        border: '1px solid rgba(13,148,136,0.15)' 
                      }}
                    >
                      View
                      <ChevronRight size={11} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > itemsPerPage && (
          <div className="mt-4 overflow-hidden rounded-xl" style={{ 
            border: '1px solid var(--surface-border)', 
            background: 'var(--surface-card)' 
          }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          detail={detailData?.supplierInvoice}
          onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
          onSuccess={() => { refetch(); setShowPaymentModal(false); setSelectedInvoice(null); }}
        />
      )}
    </div>
  );
}

// Payment Modal Component
interface PaymentModalProps {
  invoice: SupplierInvoice;
  detail?: InvoiceDetail;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ invoice, detail, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [recordPayment, { loading }] = useMutation(RECORD_SUPPLIER_PAYMENT, {
    onCompleted: onSuccess,
    onError: (err) => setError(err.message || 'Payment failed'),
  });

  const maxAmount = invoice.balancePesewas / 100;
  const amountNum = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (amountNum <= 0 || amountNum > maxAmount) {
      setError(`Amount must be between 0.01 and ${maxAmount.toFixed(2)}`);
      return;
    }

    setError(null);
    await recordPayment({
      variables: {
        input: {
          invoiceId: invoice.id,
          amountPesewas: Math.round(amountNum * 100),
          paymentMethod: method,
          reference: reference || undefined,
          notes: notes || undefined,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ 
          borderBottom: '1px solid var(--surface-border)' 
        }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Record Payment
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {invoice.supplierName} — {invoice.invoiceNumber}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface-hover" 
            style={{ color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Balance Info */}
          <div className="rounded-lg p-3" style={{ 
            background: 'var(--surface-base)', 
            border: '1px solid var(--surface-border)' 
          }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {invoice.totalAmountFormatted}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: 'var(--text-muted)' }}>Already Paid:</span>
              <span className="font-semibold" style={{ color: '#16a34a' }}>
                {invoice.paidAmountFormatted}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span style={{ color: 'var(--text-muted)' }}>Balance Due:</span>
              <span className="font-bold" style={{ color: '#dc2626' }}>
                {invoice.balanceFormatted}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" 
              style={{ color: 'var(--text-muted)' }}>
              Payment Amount (GH₵)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2.5 text-sm transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              placeholder={`Max: ${maxAmount.toFixed(2)}`}
            />
            {detail?.suggestedNextPaymentFormatted && (
              <button
                type="button"
                onClick={() => setAmount((parseFloat(detail.suggestedNextPaymentFormatted.replace(/[^0-9.]/g, '')) || 0).toFixed(2))}
                className="mt-1 text-xs hover:underline"
                style={{ color: 'var(--color-teal)' }}
              >
                Suggested: {detail.suggestedNextPaymentFormatted}
              </button>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" 
              style={{ color: 'var(--text-muted)' }}>
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2.5 text-sm transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="MOMO">Mobile Money</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card Payment</option>
            </select>
          </div>

          {/* Reference */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" 
              style={{ color: 'var(--text-muted)' }}>
              Reference Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2.5 text-sm transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              placeholder="e.g., Transaction ID, Cheque number"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" 
              style={{ color: 'var(--text-muted)' }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2.5 text-sm transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              placeholder="Additional payment details..."
            />
          </div>

          {/* Payment History */}
          {detail?.payments && detail.payments.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" 
                style={{ color: 'var(--text-muted)' }}>
                Previous Payments ({detail.payments.length})
              </label>
              <div className="max-h-24 overflow-y-auto rounded-lg border" style={{ 
                borderColor: 'var(--surface-border)', 
                background: 'var(--surface-base)' 
              }}>
                {detail.payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between border-b px-3 py-2 text-xs last:border-0"
                    style={{ borderColor: 'var(--surface-border)' }}
                  >
                    <div>
                      <span className="font-semibold">{payment.amountFormatted}</span>
                      <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                        {payment.paymentMethod}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(payment.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ 
          borderTop: '1px solid var(--surface-border)' 
        }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-surface-border px-4 py-2.5 text-sm font-bold"
            style={{ color: 'var(--text-secondary)', background: 'var(--surface-base)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || amountNum <= 0 || amountNum > maxAmount}
            className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--color-teal)' }}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={14} />
                Record Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
