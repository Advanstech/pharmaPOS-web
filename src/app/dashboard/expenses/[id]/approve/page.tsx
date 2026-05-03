'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import { ArrowLeft, CheckCircle, XCircle, Receipt, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { GET_EXPENSE } from '@/lib/graphql/expenses.queries';
import { APPROVE_STAFF_EXPENSE } from '@/lib/graphql/expenses.mutations';

export default function ExpenseApprovalPage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;
  const [notes, setNotes] = useState('');
  const [reimbursementMethod, setReimbursementMethod] = useState('MOMO');
  const [processing, setProcessing] = useState(false);

  const { data, loading, error } = useQuery(GET_EXPENSE, {
    variables: { id: expenseId },
    fetchPolicy: 'network-only',
  });

  const [approveExpense] = useMutation(APPROVE_STAFF_EXPENSE);

  const expense = data?.staffExpense;

  const handleApprove = async (approve: boolean) => {
    setProcessing(true);
    try {
      const { data: result } = await approveExpense({
        variables: {
          input: {
            expenseId,
            approve,
            notes: notes || null,
            reimbursementMethod: approve ? reimbursementMethod : null,
          },
        },
      });

      if (result?.approveStaffExpense) {
        router.push('/dashboard/expenses');
      }
    } catch (error) {
      console.error('Approval error:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-2xl rounded-lg border border-red-500/50 bg-red-500/10 p-6">
          <XCircle className="mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Error loading expense</h2>
          <Link
            href="/dashboard/expenses"
            className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90"
          >
            Back to Expenses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6">
        <Link
          href="/dashboard/expenses"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Expenses
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          Review Expense
        </h1>
        <p className="mt-1 text-sm font-medium text-content-secondary">
          Review and approve or reject this expense claim
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-lg border border-surface-border p-6" style={{ background: 'var(--surface-card)' }}>
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-content-primary">{expense.description}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-content-secondary">
                <span className="rounded-full bg-surface-border px-2 py-0.5">{expense.category}</span>
                {expense.merchantName && <span>• {expense.merchantName}</span>}
                <span>• {expense.expenseDate}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-content-primary">{expense.amountFormatted}</div>
              <div className="text-sm text-content-secondary">
                Paid via {expense.paymentMethod}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-content-muted">
                Submitted By
              </label>
              <p className="text-sm font-medium text-content-primary">{expense.createdByName}</p>
              <p className="text-xs text-content-secondary">
                {new Date(expense.createdAt).toLocaleString()}
              </p>
            </div>
            {expense.approvedByName && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-content-muted">
                  Approved By
                </label>
                <p className="text-sm font-medium text-content-primary">{expense.approvedByName}</p>
                <p className="text-xs text-content-secondary">
                  {expense.approvedAt && new Date(expense.approvedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {expense.notes && (
            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold text-content-muted">
                Notes
              </label>
              <p className="text-sm text-content-primary">{expense.notes}</p>
            </div>
          )}

          {expense.receiptUrl && (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-content-muted">
                Receipt
              </label>
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-content-primary hover:bg-surface-hover"
                style={{ background: 'var(--surface-base)' }}
              >
                <Receipt className="h-4 w-4" />
                View Receipt
              </a>
            </div>
          )}
        </div>

        {expense.status === 'PENDING' && (
          <div className="rounded-lg border border-surface-border p-6" style={{ background: 'var(--surface-card)' }}>
            <h3 className="mb-4 text-lg font-semibold text-content-primary">Review Decision</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-content-primary">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                  className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                  style={{ background: 'var(--surface-base)' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-content-primary">
                  Reimbursement Method
                </label>
                <select
                  value={reimbursementMethod}
                  onChange={(e) => setReimbursementMethod(e.target.value)}
                  className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                  style={{ background: 'var(--surface-base)' }}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleApprove(false)}
                  disabled={processing}
                  className="flex-1 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleApprove(true)}
                  disabled={processing}
                  className="flex-1 rounded-lg bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {expense.status === 'APPROVED' && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-600">Expense Approved</h3>
                <p className="text-sm text-content-secondary">
                  This expense has been approved and is ready for reimbursement
                </p>
              </div>
            </div>
          </div>
        )}

        {expense.status === 'REJECTED' && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-600">Expense Rejected</h3>
                {expense.rejectedReason && (
                  <p className="mt-1 text-sm text-content-secondary">{expense.rejectedReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {expense.status === 'REIMBURSED' && (
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-600">Expense Reimbursed</h3>
                <p className="text-sm text-content-secondary">
                  Reimbursed via {expense.reimbursementMethod}
                  {expense.reimbursedAt && ` on ${new Date(expense.reimbursedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
