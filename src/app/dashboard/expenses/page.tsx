'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Plus, DollarSign, CheckCircle, XCircle, Clock, ArrowLeft,
  ThumbsUp, ThumbsDown, Receipt, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { GET_STAFF_EXPENSES } from '@/lib/graphql/expenses.queries';
import { APPROVE_STAFF_EXPENSE } from '@/lib/graphql/expenses.mutations';
import { useAuthStore } from '@/lib/store/auth.store';
import { Pagination } from '@/components/ui/pagination';

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: typeof Clock }> = {
  PENDING:    { bg: 'rgba(234,179,8,0.12)', color: '#a16207', icon: Clock },
  APPROVED:   { bg: 'rgba(37,99,235,0.1)',  color: '#1d4ed8', icon: CheckCircle },
  REJECTED:   { bg: 'rgba(220,38,38,0.1)',  color: '#dc2626', icon: XCircle },
  REIMBURSED: { bg: 'rgba(22,163,74,0.1)',  color: '#15803d', icon: CheckCircle },
};

export default function ExpensesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const user = useAuthStore(s => s.user);
  const canApprove = user && ['owner', 'se_admin', 'manager'].includes(user.role);

  const { data, loading, error, refetch } = useQuery(GET_STAFF_EXPENSES, {
    variables: statusFilter ? { status: statusFilter } : {},
    fetchPolicy: 'cache-and-network',
  });

  const [approveExpenseMutation] = useMutation(APPROVE_STAFF_EXPENSE, {
    onCompleted: () => refetch(),
  });

  const expenses = data?.staffExpenses || [];

  // KPI stats
  const stats = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, totalPending = 0, totalApproved = 0;
    for (const e of expenses) {
      if (e.status === 'PENDING') { pending++; totalPending += e.amountPesewas || 0; }
      if (e.status === 'APPROVED' || e.status === 'REIMBURSED') { approved++; totalApproved += e.amountPesewas || 0; }
      if (e.status === 'REJECTED') rejected++;
    }
    return { pending, approved, rejected, total: expenses.length, totalPending, totalApproved };
  }, [expenses]);

  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const paginated = expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAction = async (expenseId: string, approve: boolean, notes?: string) => {
    try {
      await approveExpenseMutation({
        variables: {
          input: {
            expenseId,
            approve,
            notes: notes || (approve ? 'Approved by manager' : 'Rejected'),
            reimbursementMethod: approve ? 'MOMO' : undefined,
          },
        },
      });
    } catch (err: any) {
      alert(err?.message || 'Action failed. Please try again.');
    }
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(0,109,119,0.04) 50%, rgba(13,148,136,0.06) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1400px] px-4 pb-5 pt-6 md:px-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Expense Management</h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {canApprove
                  ? 'Track, approve, and reimburse all staff expense claims'
                  : 'Your submitted expense claims'}
              </p>
            </div>
            <Link href="/dashboard/expenses/new"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}>
              <Plus size={16} /> New Expense
            </Link>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total, icon: Receipt, color: '#0d9488', onClick: () => setStatusFilter('') },
              { label: 'Pending', value: stats.pending, sub: 'GH\u20B5' + (stats.totalPending / 100).toFixed(2), icon: Clock, color: '#d97706', glow: stats.pending > 0, onClick: () => setStatusFilter('PENDING') },
              { label: 'Approved', value: stats.approved, sub: 'GH\u20B5' + (stats.totalApproved / 100).toFixed(2), icon: CheckCircle, color: '#16a34a', onClick: () => setStatusFilter('APPROVED') },
              { label: 'Rejected', value: stats.rejected, icon: XCircle, color: '#dc2626', onClick: () => setStatusFilter('REJECTED') },
            ].map(k => (
              <button key={k.label} type="button" onClick={k.onClick}
                className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
                style={{ background: k.color + '08', border: '1px solid ' + k.color + '20', backdropFilter: 'blur(12px)', boxShadow: k.glow ? '0 0 20px ' + k.color + '15' : undefined }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
                  <div className="rounded-lg p-1.5" style={{ background: k.color + '18' }}>
                    <k.icon size={14} style={{ color: k.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
                {k.sub && <p className="text-xs font-mono mt-0.5" style={{ color: k.color }}>{k.sub}</p>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        {/* Filter bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            {[
              { key: '', label: 'All' },
              { key: 'PENDING', label: 'Pending (' + stats.pending + ')' },
              { key: 'APPROVED', label: 'Approved' },
              { key: 'REJECTED', label: 'Rejected' },
              { key: 'REIMBURSED', label: 'Reimbursed' },
            ].map(f => (
              <button key={f.key} type="button" onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={statusFilter === f.key ? { background: 'var(--color-teal)', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' } : { color: 'var(--text-secondary)' }}>
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{expenses.length} expenses</span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div className="hidden items-center gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-wider lg:grid"
            style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--surface-border)', gridTemplateColumns: '90px 1fr 100px 90px 110px 200px' }}>
            <span>Status</span><span>Description</span><span>Category</span><span>Date</span><span className="text-right">Amount</span><span className="text-right">Actions</span>
          </div>

          {loading && expenses.length === 0 ? (
            <div className="px-5 py-12 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" /></div>
          ) : error ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: '#dc2626' }}>Failed to load expenses</div>
          ) : expenses.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <DollarSign className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No expenses found</p>
              <Link href="/dashboard/expenses/new" className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: '#0d9488' }}>
                <Plus size={14} /> Create First Expense
              </Link>
            </div>
          ) : (
            <div>
              {paginated.map((expense: any) => {
                const st = STATUS_STYLE[expense.status] ?? STATUS_STYLE.PENDING;
                const StIcon = st.icon;
                return (
                  <div key={expense.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[rgba(0,0,0,0.015)] lg:grid lg:items-center"
                    style={{ borderBottom: '1px solid var(--surface-border)', gridTemplateColumns: '90px 1fr 100px 90px 110px 200px' }}>
                    {/* Status */}
                    <span className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>
                      <StIcon size={11} /> {expense.status}
                    </span>
                    {/* Description */}
                    <div className="min-w-0">
                      <Link href={'/dashboard/expenses/' + expense.id} className="text-sm font-semibold truncate block hover:underline" style={{ color: 'var(--text-primary)' }}>
                        {expense.description || '(No description)'}
                      </Link>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        By {expense.createdByName} {expense.merchantName ? '\u2022 ' + expense.merchantName : ''}
                      </p>
                    </div>
                    {/* Category */}
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{expense.category}</span>
                    {/* Date */}
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {expense.expenseDate
                        ? (() => { try { const d = new Date(expense.expenseDate); return isNaN(d.getTime()) ? expense.expenseDate : d.toLocaleDateString('en-GH', { day: '2-digit', month: 'short' }); } catch { return expense.expenseDate; } })()
                        : '\u2014'}
                    </span>
                    {/* Amount */}
                    <span className="text-right text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{expense.amountFormatted}</span>
                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                      <Link href={'/dashboard/expenses/' + expense.id}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold"
                        style={{ color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>
                        <Eye size={11} /> View
                      </Link>
                      {canApprove && expense.status === 'PENDING' && (
                        <>
                          <button type="button" onClick={() => { if (confirm('Approve this expense?')) handleAction(expense.id, true); }}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white" style={{ background: '#16a34a' }}>
                            <ThumbsUp size={11} /> Approve
                          </button>
                          <button type="button" onClick={() => { const r = prompt('Reason for rejection:'); if (r) handleAction(expense.id, false, r); }}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                            <ThumbsDown size={11} /> Reject
                          </button>
                        </>
                      )}
                      {expense.status !== 'PENDING' && expense.approvedByName && (
                        <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>by {expense.approvedByName}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 overflow-hidden rounded-xl" style={{ border: '1px solid var(--surface-border)' }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
              totalItems={expenses.length} itemsPerPage={itemsPerPage} itemLabelPlural="expenses" />
          </div>
        )}
      </div>
    </div>
  );
}
