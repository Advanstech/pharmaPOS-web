'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarCheck, DollarSign, Receipt, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatGhs } from '@/lib/utils';
import { TODAY_EOD_STATUS, CLOSE_REGISTER, EOD_HISTORY } from '@/lib/graphql/eod.queries';
import { SmartTextarea } from '@/components/ui/smart-textarea';

interface EodRecord {
  id: string;
  branchId: string;
  branchName: string;
  cashierName: string;
  businessDate: string;
  totalSalesCount: number;
  grossRevenuePesewas: number;
  grossRevenueFormatted: string;
  vatCollectedPesewas: number;
  vatCollectedFormatted: string;
  refundsCount: number;
  refundsPesewas: number;
  refundsFormatted: string;
  expensesCount: number;
  expensesPesewas: number;
  expensesFormatted: string;
  netRevenuePesewas: number;
  netRevenueFormatted: string;
  expectedCashPesewas: number;
  expectedCashFormatted: string;
  cashCountedPesewas: number;
  cashCountedFormatted: string;
  momoCountedPesewas: number;
  momoCountedFormatted: string;
  totalCountedPesewas: number;
  totalCountedFormatted: string;
  variancePesewas: number;
  varianceFormatted: string;
  isBalanced: boolean;
  closingNotes: string;
  closedAt: string;
}

function pesewasToGhs(pesewas: number): string {
  return formatGhs(pesewas / 100);
}

export default function EodClientPage() {
  const shouldReduceMotion = useReducedMotion();
  const [cashCounted, setCashCounted] = useState('');
  const [momoCounted, setMomoCounted] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [closing, setClosing] = useState(false);

  const { data: eodData, loading: eodLoading, refetch } = useQuery<{
    todayEodStatus: { isClosed: boolean; record: EodRecord | null };
  }>(TODAY_EOD_STATUS, { fetchPolicy: 'cache-and-network' });

  const { data: historyData, loading: historyLoading } = useQuery<{
    eodHistory: EodRecord[];
  }>(EOD_HISTORY, { variables: { limit: 14 }, skip: !showHistory });

  const [closeRegister] = useMutation(CLOSE_REGISTER, {
    onCompleted: () => {
      setClosing(false);
      void refetch();
    },
    onError: () => {
      setClosing(false);
    },
  });

  const isClosed = eodData?.todayEodStatus?.isClosed ?? false;
  const record = eodData?.todayEodStatus?.record ?? null;

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeRegister({
        variables: {
          input: {
            cashCountedPesewas: Math.round(parseFloat(cashCounted || '0') * 100),
            momoCountedPesewas: Math.round(parseFloat(momoCounted || '0') * 100),
            closingNotes: closingNotes.trim() || undefined,
          },
        },
      });
    } catch {
      setClosing(false);
    }
  };

  if (eodLoading && !eodData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <motion.div
        className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-card px-3 py-1 shadow-sm">
            <CalendarCheck size={14} className="text-content-muted" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-content-secondary">
              End of Day
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-content-primary">
            {isClosed ? 'Day Closed' : 'Close Register'}
          </h1>
          <p className="mt-1 font-medium text-content-secondary">
            {isClosed
              ? `Closed by ${record?.cashierName ?? 'system'} at ${record?.closedAt ? new Date(record.closedAt).toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: 'numeric', minute: '2-digit' }) : ''}`
              : 'Count your cash and close the register for today.'}
          </p>
        </div>
      </motion.div>

      {isClosed && record ? (
        <motion.div
          className="space-y-6"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-[24px] border border-surface-border bg-surface-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              {record.isBalanced ? (
                <CheckCircle2 className="text-green-600" size={20} />
              ) : (
                <AlertTriangle className="text-amber-500" size={20} />
              )}
              <h2 className="text-lg font-bold text-content-primary">
                {record.isBalanced ? 'Balanced' : 'Variance Detected'}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <SummaryCard label="Sales" value={String(record.totalSalesCount)} icon={<Receipt size={16} />} />
              <SummaryCard label="Gross Revenue" value={record.grossRevenueFormatted} icon={<DollarSign size={16} />} />
              <SummaryCard label="VAT Collected" value={record.vatCollectedFormatted} icon={<DollarSign size={16} />} />
              <SummaryCard label="Refunds" value={`${record.refundsCount} (${record.refundsFormatted})`} icon={<TrendingDown size={16} />} />
              <SummaryCard label="Expenses" value={`${record.expensesCount} (${record.expensesFormatted})`} icon={<TrendingDown size={16} />} />
              <SummaryCard label="Net Revenue" value={record.netRevenueFormatted} icon={<TrendingUp size={16} />} highlight />
              <SummaryCard label="Expected Cash" value={record.expectedCashFormatted} icon={<DollarSign size={16} />} />
              <SummaryCard label="Cash Counted" value={record.cashCountedFormatted} icon={<DollarSign size={16} />} />
              <SummaryCard label="MoMo Counted" value={record.momoCountedFormatted} icon={<DollarSign size={16} />} />
              <SummaryCard label="Total Counted" value={record.totalCountedFormatted} icon={<DollarSign size={16} />} />
              <SummaryCard
                label="Variance"
                value={record.varianceFormatted}
                icon={<AlertTriangle size={16} />}
                highlight
                variant={record.variancePesewas === 0 ? 'success' : 'warning'}
              />
            </div>
            {record.closingNotes && (
              <div className="mt-4 rounded-xl border border-surface-border bg-surface-base p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-content-muted mb-1">Closing Notes</p>
                <p className="text-sm text-content-secondary">{record.closingNotes}</p>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-6"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-[24px] border border-surface-border bg-surface-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-content-primary">Count & Close</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-content-secondary">
                  Cash counted (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashCounted}
                  onChange={(e) => setCashCounted(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-surface-border bg-surface-base px-4 py-3 text-sm font-mono text-content-primary placeholder:text-content-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-content-secondary">
                  MoMo counted (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={momoCounted}
                  onChange={(e) => setMomoCounted(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-surface-border bg-surface-base px-4 py-3 text-sm font-mono text-content-primary placeholder:text-content-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-bold text-content-secondary">
                Closing notes (optional)
              </label>
              <SmartTextarea
                value={closingNotes}
                onChange={setClosingNotes}
                context="eod:closing"
                placeholder="Any notes about today's shift…"
                rows={3}
                className="w-full rounded-xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-content-primary placeholder:text-content-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={closing || (!cashCounted && !momoCounted)}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal to-teal-dark px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {closing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Closing register…
                </>
              ) : (
                <>
                  <CalendarCheck size={18} />
                  Close Register
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-bold text-teal hover:underline focus:outline-none"
        >
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showHistory ? 'Hide' : 'Show'} recent EOD history
        </button>
        {showHistory && (
          <motion.div
            className="mt-4 space-y-3"
            initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-teal" />
              </div>
            ) : (historyData?.eodHistory ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-content-muted">No EOD records found.</p>
            ) : (
              (historyData?.eodHistory ?? []).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-card px-5 py-4 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-bold text-content-primary">
                      {new Date(r.businessDate).toLocaleDateString('en-GH', {
                        timeZone: 'Africa/Accra',
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-content-muted">
                      {r.cashierName} · {r.totalSalesCount} sales
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-content-primary">
                      {r.netRevenueFormatted}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      {r.isBalanced ? (
                        <CheckCircle2 size={12} className="text-green-600" />
                      ) : (
                        <AlertTriangle size={12} className="text-amber-500" />
                      )}
                      <span className={`text-xs font-medium ${r.isBalanced ? 'text-green-600' : 'text-amber-600'}`}>
                        {r.isBalanced ? 'Balanced' : `Variance ${r.varianceFormatted}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  highlight = false,
  variant = 'default',
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
  variant?: 'default' | 'success' | 'warning';
}) {
  const borderColor =
    variant === 'success'
      ? 'border-green-300'
      : variant === 'warning'
        ? 'border-amber-300'
        : highlight
          ? 'border-teal/30'
          : 'border-surface-border';

  return (
    <div className={`rounded-xl border ${borderColor} bg-surface-base p-4`}>
      <div className="mb-1 flex items-center gap-1.5 text-content-muted">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-mono text-sm font-bold ${highlight ? 'text-content-primary text-base' : 'text-content-primary'}`}>
        {value}
      </p>
    </div>
  );
}
