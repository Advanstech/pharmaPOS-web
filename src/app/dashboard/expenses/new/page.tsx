'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { Upload, ArrowLeft, Receipt } from 'lucide-react';
import Link from 'next/link';
import { CREATE_STAFF_EXPENSE } from '@/lib/graphql/expenses.mutations';
import { SmartTextarea } from '@/components/ui/smart-textarea';

const CATEGORIES = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'MEALS', label: 'Meals' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOMO', label: 'Mobile Money' },
  { value: 'PERSONAL_CARD', label: 'Personal Card' },
];

export default function NewExpensePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    category: 'OTHER' as const,
    amount: '',
    description: '',
    merchantName: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH' as const,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createExpense] = useMutation(CREATE_STAFF_EXPENSE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description) {
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await createExpense({
        variables: {
          input: {
            category: formData.category,
            amountPesewas: Math.round(parseFloat(formData.amount) * 100),
            description: formData.description,
            merchantName: formData.merchantName || undefined,
            expenseDate: formData.expenseDate,
            paymentMethod: formData.paymentMethod,
          },
        },
      });

      if (data?.createStaffExpense) {
        router.push('/dashboard/expenses');
      }
    } catch (error) {
      console.error('Create expense error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6">
        <Link
          href="/dashboard/expenses"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Expenses
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">New Expense</h1>
        <p className="mt-1 text-sm font-medium text-content-secondary">
          Submit a new expense for approval and reimbursement
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-surface-border p-6" style={{ background: 'var(--surface-card)' }}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                style={{ background: 'var(--surface-base)' }}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Amount (GHS) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                style={{ background: 'var(--surface-base)' }}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Description *
              </label>
              <SmartTextarea
                value={formData.description}
                onChange={(v) => setFormData({ ...formData, description: v })}
                context={`expense:${formData.category}`}
                placeholder="Describe the expense..."
                rows={3}
                className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Merchant Name
              </label>
              <input
                type="text"
                value={formData.merchantName}
                onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                placeholder="Where did you spend?"
                className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                style={{ background: 'var(--surface-base)' }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Expense Date *
              </label>
              <input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                style={{ background: 'var(--surface-base)' }}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Payment Method *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                style={{ background: 'var(--surface-base)' }}
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-content-primary">
                Receipt (Optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="receipt-upload"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptFile(e.target.files[0]);
                    }
                  }}
                />
                <label
                  htmlFor="receipt-upload"
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all ${
                    receiptFile ? 'border-teal bg-teal/5' : 'border-surface-border hover:border-teal/50'
                  }`}
                  style={{ background: 'var(--surface-base)' }}
                >
                  {receiptFile ? (
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-teal" />
                      <span className="text-sm font-medium text-content-primary">{receiptFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-content-muted" />
                      <span className="text-sm text-content-muted">Upload receipt</span>
                    </div>
                  )}
                </label>
                {receiptFile && (
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    Remove receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/expenses"
            className="rounded-lg border border-surface-border px-6 py-2.5 text-sm font-semibold text-content-primary hover:bg-surface-hover"
            style={{ background: 'var(--surface-card)' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}
