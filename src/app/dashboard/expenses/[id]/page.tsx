'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  Receipt,
  User,
  FileText,
  Banknote,
  Store,
  Tag,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { GET_EXPENSE } from '@/lib/graphql/expenses.queries';
import { APPROVE_STAFF_EXPENSE } from '@/lib/graphql/expenses.mutations';
import { SmartTextarea } from '@/components/ui/smart-textarea';
import { useAuthStore } from '@/lib/store/auth.store';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: typeof Clock }> = {
  PENDING:    { label: 'Pending Approval', bg: 'rgba(234,179,8,0.1)',  color: '#a16207', border: 'rgba(234,179,8,0.3)',  icon: Clock },
  APPROVED:   { label: 'Approved',         bg: 'rgba(37,99,235,0.1)',  color: '#1d4ed8', border: 'rgba(37,99,235,0.3)',  icon: CheckCircle },
  REJECTED:   { label: 'Rejected',         bg: 'rgba(220,38,38,0.1)',  color: '#dc2626', border: 'rgba(220,38,38,0.3)',  icon: XCircle },
  REIMBURSED: { label: 'Reimbursed',       bg: 'rgba(22,163,74,0.1)',  color: '#15803d', border: 'rgba(22,163,74,0.3)',  icon: CheckCircle },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MOMO: 'Mobile Money (MoMo)',
  PERSONAL_CARD: 'Personal Card',
  COMPANY_CARD: 'Company Card',
  BANK_TRANSFER: 'Bank Transfer',
};

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;
  const user = useAuthStore(s => s.user);
  const canApprove = user && ['owner', 'se_admin', 'manager'].includes(user.role);

  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [reimbursementMethod, setReimbursementMethod] = useState('MOMO');
  const [processing, setProcessing] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_EXPENSE, {
    variables: { id: expenseId },
    fetchPolicy: 'cache-and-network',
  });

  const [approveExpense] = useMutation(APPROVE_STAFF_EXPENSE, {
    onCompleted: () => {
      setShowApprovalForm(false);
      setApprovalNotes('');
      refetch();
    },
  });

  const expense = data?.staffExpense;

  const handleApproval = async () => {
    if (!expense) return;
    if (approvalAction === 'reject' && !approvalNotes.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    setProcessing(true);
    try {
      await approveExpense({
        variables: {
          input: {
            expenseId,
            approve: approvalAction === 'approve',
            notes: approvalNotes || (approvalAction === 'approve' ? 'Approved' : undefined),
            reimbursementMethod: approvalAction === 'approve' ? reimbursementMethod : undefined,
          },
        },
      });
    } catch (err: any) {
      console.error('Expense action failed:', err);
      alert(err?.message || 'Failed to process expense. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const openApproval = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setApprovalNotes('');
    setReimbursementMethod('MOMO');
    setShowApprovalForm(true);
  };

  // ── Loading ──
  if (loading && !expense) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent mx-auto" />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading expense details...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !expense) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" style={{ color: '#dc2626' }} />
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Expense not found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {error?.message || "The expense you're looking for doesn't exist."}
          </p>
          <Link href="/dashboard/expenses" className="inline-flex items-center gap-2 mt-4 text-teal hover:underline text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Back to Expenses
          </Link>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[expense.status] || STATUS_CONFIG.PENDING;
  const StIcon = st.icon;
  const isPending = expense.status === 'PENDING';

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(0,109,119,0.04) 50%, rgba(13,148,136,0.06) 100%)',
        borderBottom: '1px solid var(--surface-border)',
      }}>
        <div className="mx-auto max-w-[1100px] px-4 pb-6 pt-6 md:px-6">
          <Link href="/dashboard/expenses" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Expenses
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {expense.description}
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap"
                  style={{ background: st.bg, color: st.color, border: '1px solid ' + st.border }}>
                  <StIcon size={12} /> {st.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><Tag size={13} /> {expense.category}</span>
                <span style={{ color: 'var(--surface-border)' }}>|</span>
                <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(expense.expenseDate)}</span>
                <span style={{ color: 'var(--surface-border)' }}>|</span>
                <span className="flex items-center gap-1"><User size={13} /> {expense.createdByName}</span>
              </div>
            </div>

            {/* Amount badge */}
            <div className="rounded-2xl px-6 py-3 text-center" style={{
              background: 'rgba(13,148,136,0.08)',
              border: '1px solid rgba(13,148,136,0.2)',
            }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Amount</p>
              <p className="text-2xl font-bold font-mono" style={{ color: '#0d9488' }}>{expense.amountFormatted}</p>
            </div>
          </div>

          {/* Action buttons for pending expenses */}
          {isPending && canApprove && !showApprovalForm && (
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => openApproval('approve')}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
                <CheckCircle size={16} /> Approve Expense
              </button>
              <button onClick={() => openApproval('reject')}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
                <XCircle size={16} /> Reject Expense
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">
        {/* Approval Form Overlay */}
        {showApprovalForm && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{
            border: approvalAction === 'approve' ? '2px solid rgba(22,163,74,0.3)' : '2px solid rgba(220,38,38,0.3)',
            background: 'var(--surface-card)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            {/* Form header */}
            <div className="flex items-center justify-between px-5 py-3" style={{
              background: approvalAction === 'approve' ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
              borderBottom: '1px solid var(--surface-border)',
            }}>
              <div className="flex items-center gap-2">
                {approvalAction === 'approve'
                  ? <CheckCircle size={18} style={{ color: '#16a34a' }} />
                  : <XCircle size={18} style={{ color: '#dc2626' }} />
                }
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
                </h3>
              </div>
              <button onClick={() => setShowApprovalForm(false)} className="p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.05)]">
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--surface-base)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{expense.description}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {expense.category} &bull; {expense.createdByName} &bull; {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <p className="text-lg font-bold font-mono" style={{ color: '#0d9488' }}>{expense.amountFormatted}</p>
              </div>

              {/* Reimbursement method (only for approve) */}
              {approvalAction === 'approve' && (
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Reimbursement Method
                  </label>
                  <select value={reimbursementMethod} onChange={e => setReimbursementMethod(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', borderColor: 'var(--surface-border)' }}>
                    <option value="CASH">Cash</option>
                    <option value="MOMO">Mobile Money (MoMo)</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {approvalAction === 'approve' ? 'Notes (optional)' : 'Reason for Rejection *'}
                </label>
                <SmartTextarea
                  value={approvalNotes}
                  onChange={setApprovalNotes}
                  context={approvalAction === 'approve' ? 'expense:approval' : 'expense:rejection'}
                  placeholder={approvalAction === 'approve' ? 'Add approval notes...' : 'Why is this expense being rejected?'}
                  rows={3}
                  className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm bg-[var(--surface-base)] text-[var(--text-primary)]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowApprovalForm(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-primary)', background: 'var(--surface-card)' }}>
                  Cancel
                </button>
                <button onClick={handleApproval}
                  disabled={processing || (approvalAction === 'reject' && !approvalNotes.trim())}
                  className="rounded-lg px-5 py-2 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ background: approvalAction === 'approve' ? '#16a34a' : '#dc2626' }}>
                  {processing ? (
                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
                  ) : approvalAction === 'approve' ? (
                    <><CheckCircle size={15} /> Confirm Approval</>
                  ) : (
                    <><XCircle size={15} /> Confirm Rejection</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expense Details Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expense Details</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailItem icon={Tag} label="Category" value={expense.category} />
                  <DetailItem icon={Banknote} label="Amount" value={expense.amountFormatted} highlight />
                  <DetailItem icon={Wallet} label="Payment Method" value={PAYMENT_LABELS[expense.paymentMethod] || expense.paymentMethod || '—'} />
                  <DetailItem icon={Store} label="Merchant" value={expense.merchantName || '—'} />
                  <DetailItem icon={Calendar} label="Expense Date" value={formatDate(expense.expenseDate) || '—'} />
                  <DetailItem icon={Calendar} label="Submitted" value={formatDateTime(expense.createdAt) || '—'} />
                </div>
              </div>
            </div>

            {/* Approval / Rejection Info */}
            {(expense.approvedByName || expense.status === 'REJECTED') && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {expense.status === 'REJECTED' ? 'Rejection Details' : 'Approval Details'}
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={User} label={expense.status === 'REJECTED' ? 'Rejected By' : 'Approved By'} value={expense.approvedByName || '—'} />
                    <DetailItem icon={Calendar} label={expense.status === 'REJECTED' ? 'Rejected On' : 'Approved On'} value={formatDateTime(expense.approvedAt) || '—'} />
                  </div>
                  {expense.approvalNotes && (
                    <div className="rounded-xl p-3" style={{ background: 'var(--surface-base)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Notes</p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{expense.approvalNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reimbursement Info */}
            {expense.status === 'REIMBURSED' && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reimbursement Details</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem icon={User} label="Reimbursed By" value={expense.reimbursedByName || '—'} />
                    <DetailItem icon={Calendar} label="Reimbursed On" value={formatDateTime(expense.reimbursedAt) || '—'} />
                    <DetailItem icon={CreditCard} label="Method" value={PAYMENT_LABELS[expense.reimbursementMethod] || expense.reimbursementMethod || '—'} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Timeline</h2>
              </div>
              <div className="p-5">
                <div className="space-y-0">
                  {/* Created */}
                  <TimelineItem
                    icon={<Receipt size={14} style={{ color: '#3b82f6' }} />}
                    title="Expense submitted"
                    subtitle={expense.createdByName}
                    date={formatDateTime(expense.createdAt)}
                    isLast={!expense.approvedByName && expense.status !== 'REJECTED'}
                  />

                  {/* Approved / Rejected */}
                  {expense.approvedByName && (
                    <TimelineItem
                      icon={expense.status === 'REJECTED'
                        ? <XCircle size={14} style={{ color: '#dc2626' }} />
                        : <CheckCircle size={14} style={{ color: '#16a34a' }} />
                      }
                      title={expense.status === 'REJECTED' ? 'Expense rejected' : 'Expense approved'}
                      subtitle={expense.approvedByName}
                      date={formatDateTime(expense.approvedAt)}
                      isLast={expense.status !== 'REIMBURSED'}
                    />
                  )}

                  {/* Reimbursed */}
                  {expense.status === 'REIMBURSED' && expense.reimbursedByName && (
                    <TimelineItem
                      icon={<CreditCard size={14} style={{ color: '#0d9488' }} />}
                      title="Expense reimbursed"
                      subtitle={expense.reimbursedByName}
                      date={formatDateTime(expense.reimbursedAt)}
                      isLast
                    />
                  )}

                  {/* Pending indicator */}
                  {isPending && (
                    <TimelineItem
                      icon={<Clock size={14} style={{ color: '#d97706' }} />}
                      title="Awaiting approval"
                      subtitle="Pending manager review"
                      date={null}
                      isLast
                      muted
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {canApprove && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Quick Actions</h2>
                </div>
                <div className="p-4 space-y-2">
                  {isPending && (
                    <>
                      <button onClick={() => openApproval('approve')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                        style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button onClick={() => openApproval('reject')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                        style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                        <XCircle size={15} /> Reject
                      </button>
                    </>
                  )}
                  {expense.status === 'APPROVED' && (
                    <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                      style={{ background: 'rgba(13,148,136,0.08)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.2)' }}>
                      <CreditCard size={15} /> Mark as Reimbursed
                    </button>
                  )}
                  <Link href="/dashboard/expenses"
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
                    style={{ color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>
                    <ArrowLeft size={15} /> All Expenses
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ── */

function DetailItem({ icon: Icon, label, value, highlight }: {
  icon: typeof Tag; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        <Icon size={11} /> {label}
      </p>
      <p className={highlight ? 'text-base font-bold font-mono' : 'text-sm font-medium'}
        style={{ color: highlight ? '#0d9488' : 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
}

function TimelineItem({ icon, title, subtitle, date, isLast, muted }: {
  icon: React.ReactNode; title: string; subtitle: string; date: string | null; isLast: boolean; muted?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="rounded-full p-1.5" style={{ background: 'var(--surface-base)' }}>{icon}</div>
        {!isLast && <div className="w-px flex-1 my-1" style={{ background: 'var(--surface-border)' }} />}
      </div>
      <div className={isLast ? 'pb-0' : 'pb-4'}>
        <p className="text-sm font-semibold" style={{ color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}>{title}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        {date && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{date}</p>}
      </div>
    </div>
  );
}
