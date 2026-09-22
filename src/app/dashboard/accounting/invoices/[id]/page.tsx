'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  CreditCard,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Save,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { formatGhs } from '@/lib/utils';
import { StatusBadge } from '@/components/accounting/AccountingDataTable';
import { useToast } from '@/components/ui/toast';

// GraphQL Queries and Mutations
const GET_SUPPLIER_INVOICE = gql`
  query GetSupplierInvoice($id: ID!) {
    supplierInvoice(id: $id) {
      id
      invoiceNumber
      invoiceDate
      dueDate
      totalAmountFormatted
      paidAmountFormatted
      balanceFormatted
      paymentTerms
      paymentStatus
      daysOutstanding
      isOverdue
      overdueByDays
      
      supplier {
        id
        name
        contactPerson
        email
        phone
        paymentTerms
      }
      
      items {
        id
        productName
        product {
          id
          name
        }
        quantity
        unitCostFormatted
        lineTotalFormatted
        batchNumber
        expiryDate
      }
      
      payments {
        id
        amountFormatted
        paymentMethod
        reference
        notes
        paidByName
        paidAt
      }
      
      relatedDocuments {
        id
        type
        url
        fileName
        createdAt
      }
      
      activityLog {
        id
        action
        description
        createdByName
        createdAt
      }
    }
  }
`;

const RECORD_SUPPLIER_PAYMENT = gql`
  mutation RecordSupplierPayment($input: RecordSupplierPaymentInput!) {
    recordSupplierPayment(input: $input) {
      id
      balanceFormatted
      paymentStatus
      payments {
        id
        amountFormatted
        paymentMethod
        paidAt
        notes
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      success('Payment recorded');
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
            reference: paymentForm.reference,
            notes: paymentForm.notes,
          },
        },
      });
    } catch (err) {
      toastError('Payment failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-content-secondary">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-content-primary">Invoice not found</p>
          <p className="text-sm text-content-secondary mt-1">The invoice you're looking for doesn't exist.</p>
          <Link
            href="/dashboard/accounting/invoices"
            className="inline-flex items-center gap-2 mt-4 text-teal hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/accounting/invoices"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Invoices
          </Link>
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">
                Invoice #{invoice.invoiceNumber}
              </h1>
              <p className="mt-1 text-sm font-medium text-content-secondary">
                from {invoice.supplier.name}
              </p>
            </div>
            <StatusBadge status={invoice.paymentStatus} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {invoice.paymentStatus !== 'PAID' && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </button>
          )}
          
          <button className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-content-primary hover:bg-surface-hover"
                  style={{ background: 'var(--surface-card)' }}>
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          
          <button className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-content-primary hover:bg-surface-hover"
                  style={{ background: 'var(--surface-card)' }}>
            <Edit className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="mb-6 rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-content-primary">Record Payment</h3>
            <button
              onClick={() => setShowPaymentForm(false)}
              className="p-1 hover:bg-surface-hover rounded-lg"
            >
              <X className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Payment Amount (GHS)
              </label>
              <input
                type="text"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder={invoice.balanceFormatted}
                className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
              />
              <p className="mt-1 text-xs text-content-secondary">
                Outstanding balance: {invoice.balanceFormatted}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Reference Number
              </label>
              <input
                type="text"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                placeholder="Transaction reference"
                className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowPaymentForm(false)}
              className="px-4 py-2 rounded-lg border border-surface-border text-sm font-medium text-content-primary hover:bg-surface-hover"
              style={{ background: 'var(--surface-card)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              disabled={recordingPayment || !paymentForm.amount}
              className="px-4 py-2 rounded-lg bg-teal text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {recordingPayment ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Recording...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h2 className="mb-4 text-lg font-semibold text-content-primary">Invoice Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-content-secondary">Invoice Date</p>
                  <p className="text-sm text-content-primary flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(invoice.invoiceDate).toLocaleDateString('en-GH')}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-content-secondary">Due Date</p>
                  <p className="text-sm text-content-primary flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GH') : '—'}
                    {invoice.isOverdue && (
                      <span className="text-xs text-red-600">
                        ({invoice.overdueByDays} days overdue)
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-content-secondary">Payment Terms</p>
                  <p className="text-sm text-content-primary mt-0.5">{invoice.paymentTerms || '—'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-content-secondary">Total Amount</p>
                  <p className="text-sm font-semibold text-content-primary mt-0.5">
                    {invoice.totalAmountFormatted}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-content-secondary">Paid Amount</p>
                  <p className="text-sm text-content-primary mt-0.5">
                    {invoice.paidAmountFormatted}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-content-secondary">Balance Due</p>
                  <p className="text-lg font-bold text-teal mt-0.5">{invoice.balanceFormatted}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h2 className="mb-4 text-lg font-semibold text-content-primary">Line Items</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left py-2 text-xs font-medium text-content-secondary">Product</th>
                    <th className="text-center py-2 text-xs font-medium text-content-secondary">Quantity</th>
                    <th className="text-right py-2 text-xs font-medium text-content-secondary">Unit Cost</th>
                    <th className="text-right py-2 text-xs font-medium text-content-secondary">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-surface-border">
                      <td className="py-3">
                        <div>
                          <p className="text-sm font-medium text-content-primary">
                            {item.product?.name || item.productName}
                          </p>
                          {item.batchNumber && (
                            <p className="text-xs text-content-secondary">
                              Batch: {item.batchNumber}
                              {item.expiryDate && ` • Exp: ${new Date(item.expiryDate).toLocaleDateString('en-GH')}`}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-center text-sm text-content-primary">{item.quantity}</td>
                      <td className="py-3 text-right text-sm text-content-primary">{item.unitCostFormatted}</td>
                      <td className="py-3 text-right text-sm font-medium text-content-primary">
                        {item.lineTotalFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h2 className="mb-4 text-lg font-semibold text-content-primary">Payment History</h2>
            
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-content-secondary text-center py-8">
                No payments recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-border">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-content-primary">
                        {payment.amountFormatted}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-content-secondary">
                          {payment.paymentMethod.replace('_', ' ')}
                        </span>
                        {payment.reference && (
                          <span className="text-xs text-content-secondary">
                            Ref: {payment.reference}
                          </span>
                        )}
                        <span className="text-xs text-content-secondary">
                          by {payment.paidByName}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-content-secondary mt-1">{payment.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-content-secondary">
                        {new Date(payment.paidAt).toLocaleDateString('en-GH')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Information */}
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h2 className="mb-4 text-lg font-semibold text-content-primary">Supplier Information</h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-content-secondary">Supplier Name</p>
                <p className="text-sm text-content-primary mt-0.5">{invoice.supplier.name}</p>
              </div>
              
              {invoice.supplier.contactPerson && (
                <div>
                  <p className="text-xs font-medium text-content-secondary">Contact Person</p>
                  <p className="text-sm text-content-primary mt-0.5">{invoice.supplier.contactPerson}</p>
                </div>
              )}
              
              {invoice.supplier.email && (
                <div>
                  <p className="text-xs font-medium text-content-secondary">Email</p>
                  <a href={`mailto:${invoice.supplier.email}`} className="text-sm text-teal hover:underline mt-0.5 block">
                    {invoice.supplier.email}
                  </a>
                </div>
              )}
              
              {invoice.supplier.phone && (
                <div>
                  <p className="text-xs font-medium text-content-secondary">Phone</p>
                  <a href={`tel:${invoice.supplier.phone}`} className="text-sm text-teal hover:underline mt-0.5 block">
                    {invoice.supplier.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Related Documents */}
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h2 className="mb-4 text-lg font-semibold text-content-primary">Related Documents</h2>
            
            {invoice.relatedDocuments.length === 0 ? (
              <p className="text-sm text-content-secondary">No documents attached</p>
            ) : (
              <div className="space-y-2">
                {invoice.relatedDocuments.map((doc: any) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg border border-surface-border hover:bg-surface-hover"
                  >
                    <FileText className="h-4 w-4 text-content-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content-primary truncate">{doc.fileName}</p>
                      <p className="text-xs text-content-secondary">{doc.type}</p>
                    </div>
                    <Download className="h-4 w-4 text-content-muted" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h2 className="mb-4 text-lg font-semibold text-content-primary">Activity Log</h2>
            
            <div className="space-y-3">
              {invoice.activityLog.map((log: any) => (
                <div key={log.id} className="flex gap-3">
                  <div className="mt-0.5">
                    {log.action === 'CREATED' && <Plus className="h-3.5 w-3.5 text-green-600" />}
                    {log.action === 'UPDATED' && <Edit className="h-3.5 w-3.5 text-blue-600" />}
                    {log.action === 'PAID' && <CheckCircle className="h-3.5 w-3.5 text-teal-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-content-primary">{log.description}</p>
                    <p className="text-xs text-content-secondary mt-0.5">
                      {log.createdByName} • {new Date(log.createdAt).toLocaleDateString('en-GH')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
