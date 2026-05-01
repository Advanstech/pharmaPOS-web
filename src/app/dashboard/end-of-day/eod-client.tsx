'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import Link from 'next/link';
import {
  ArrowLeft, Moon, CheckCircle2, AlertTriangle,
  Banknote, Smartphone, TrendingUp, TrendingDown,
  ClipboardList, RefreshCw, History, ChevronDown, ChevronUp,
} from 'lucide-react';
import { TODAY_EOD_STATUS, EOD_HISTORY, CLOSE_REGISTER } from '@/lib/graphql/eod.queries';

type EodRecord = {
  id: string;
  branchName: string;
  cashierName: string;
  businessDate: string;
  totalSalesCount: number;
  grossRevenueFormatted: string;
  vatCollectedFormatted: string;
  refundsCount: number;
  refundsFormatted: string;
  expensesCount: number;
  expensesFormatted: string;
  netRevenueFormatted: string;
  expectedCashFormatted: string;
  cashCountedFormatted: string;
  momoCountedFormatted: string;
  totalCountedFormatted: string;
  variancePesewas: number;
  varianceFormatted: string;
  isBalanced: boolean;
  closingNotes: string | null;
  closedAt: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short',
  });
}

function todayAccra(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
}

function EodSummaryCard({ record }: { record: EodRecord }) {
  const [open, setOpen] = useState(false);
  const balanced = record.isBalanced;
  const accentColor = balanced ? '#16a34a' : '#dc2626';

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-card)', border: `1px solid ${accentColor}30`, boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer"
        onClick={() => setOpen(o => !o)}
        style={{ borderBottom: open ? '1px solid var(--surface-border)' : undefined }}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: accentColor + '15' }}>
            {balanced
              ? <CheckCircle2 size={18} style={{ color: accentColor }} />
              : <AlertTriangle size={18} style={{ color: accentColor }} />}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {record.businessDate}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Closed by {record.cashierName} · {fmtDate(record.closedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Net Revenue</p>
            <p className="text-base font-bold" style={{ color: accentColor }}>{record.netRevenueFormatted}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: accentColor + '12', color: accentColor }}>
            {balanced ? 'Balanced' : `Off by ${record.varianceFormatted}`}
          </span>
          {open ? <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {[
            { label: 'Sales', value: record.grossRevenueFormatted, sub: `${record.totalSalesCount} transactions` },
            { label: 'VAT Collected', value: record.vatCollectedFormatted, sub: 'GRA obligation' },
            { label: 'Refunds', value: record.refundsFormatted, sub: `${record.refundsCount} refund${record.refundsCount !== 1 ? 's' : ''}` },
            { label: 'Expenses', value: record.expensesFormatted, sub: `${record.expensesCount} expense${record.expensesCount !== 1 ? 's' : ''}` },
            { label: 'Expected Cash', value: record.expectedCashFormatted, sub: 'System total' },
            { label: 'Cash Counted', value: record.cashCountedFormatted, sub: 'Physical cash' },
            { label: 'MoMo Counted', value: record.momoCountedFormatted, sub: 'Mobile money' },
            { label: 'Variance', value: record.varianceFormatted, sub: balanced ? 'Within GH₵1.00' : 'Out of balance' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="text-base font-bold mt-0.5 font-mono" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
            </div>
          ))}
          {record.closingNotes && (
            <div className="col-span-2 sm:col-span-4 rounded-xl p-3"
              style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#a16207' }}>Closing Notes</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{record.closingNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EodClient() {
  const today = todayAccra();

  const { data: statusData, loading: statusLoading, refetch: refetchStatus } = useQuery<{
    todayEodStatus: { isClosed: boolean; record: EodRecord | null };
  }>(TODAY_EOD_STATUS, { fetchPolicy: 'cache-and-network' });

  const { data: historyData, loading: historyLoading } = useQuery<{
    eodHistory: EodRecord[];
  }>(EOD_HISTORY, { variables: { limit: 14 }, fetchPolicy: 'cache-and-network' });

  const [closeRegister, { loading: closing }] = useMutation(CLOSE_REGISTER, {
    onCompleted: () => refetchStatus(),
  });

  const [cashCounted, setCashCounted] = useState('');
  const [momoCounted, setMomoCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isClosed = statusData?.todayEodStatus?.isClosed ?? false;
  const todayRecord = statusData?.todayEodStatus?.record ?? null;
  const history = historyData?.eodHistory ?? [];

  async function handleClose() {
    setError('');
    const cash = parseFloat(cashCounted);
    const momo = parseFloat(momoCounted);
    if (isNaN(cash) || cash < 0) { setError('Enter a valid cash amount (GH₵).'); return; }
    if (isNaN(momo) || momo < 0) { setError('Enter a valid MoMo amount (GH₵).'); return; }

    try {
      await closeRegister({
        variables: {
          input: {
            businessDate: today,
            cashCountedPesewas: Math.round(cash * 100),
            momoCountedPesewas: Math.round(momo * 100),
            closingNotes: notes.trim() || null,
          },
        },
      });
      setSuccess(true);
      setCashCounted('');
      setMomoCounted('');
      setNotes('');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to close register. Please try again.');
    }
  }

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13,148,136,0.07) 0%, rgba(99,102,241,0.05) 100%)',
        borderBottom: '1px solid var(--surface-border)',
      }}>
        <div className="mx-auto max-w-[960px] px-4 pb-6 pt-6 md:px-6">
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
            <ArrowLeft size={13} /> Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <Moon size={18} style={{ color: '#0d9488' }} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  End of Day
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Close the daily register and reconcile cash for <strong>{today}</strong>
              </p>
            </div>
          </div>

          {/* Status strip */}
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{
              background: isClosed ? 'rgba(22,163,74,0.08)' : 'rgba(234,179,8,0.08)',
              border: `1px solid ${isClosed ? 'rgba(22,163,74,0.25)' : 'rgba(234,179,8,0.25)'}`,
            }}>
            {isClosed
              ? <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
              : <AlertTriangle size={16} style={{ color: '#d97706' }} />}
            <span className="text-sm font-semibold"
              style={{ color: isClosed ? '#16a34a' : '#d97706' }}>
              {isClosed ? 'Register closed for today' : "Register is open — not yet closed for today"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-4 py-6 md:px-6 space-y-6">

        {/* Today's closed record */}
        {statusLoading && !statusData && (
          <div className="py-10 flex justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          </div>
        )}

        {todayRecord && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}>Today's Closing Report</h2>
            <EodSummaryCard record={todayRecord} />
          </div>
        )}

        {/* Close Register Form */}
        {!isClosed && !statusLoading && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
              <div className="flex items-center gap-2">
                <ClipboardList size={16} style={{ color: '#0d9488' }} />
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Close Register for {today}</h2>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Count your physical cash and MoMo float, then submit to close the day.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Cash + MoMo inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Physical Cash Counted', icon: Banknote, key: 'cash', value: cashCounted, set: setCashCounted },
                  { label: 'MoMo Float Counted', icon: Smartphone, key: 'momo', value: momoCounted, set: setMomoCounted },
                ].map(({ label, icon: Icon, key, value, set }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Icon size={11} className="inline mr-1" />{label} (GH₵)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-mono font-semibold outline-none transition-all"
                      style={{
                        background: 'var(--surface-base)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Closing Notes (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any notes about discrepancies, incidents, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none transition-all"
                  style={{
                    background: 'var(--surface-base)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Live total preview */}
              {(cashCounted || momoCounted) && (
                <div className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.2)' }}>
                  <span className="text-xs font-bold" style={{ color: '#0d9488' }}>Total Counted</span>
                  <span className="text-base font-bold font-mono" style={{ color: '#0d9488' }}>
                    GH₵{((parseFloat(cashCounted || '0') + parseFloat(momoCounted || '0'))).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                  <span className="text-sm" style={{ color: '#dc2626' }}>{error}</span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }}>
                  <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                  <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>Register closed successfully!</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleClose}
                disabled={closing || !cashCounted}
                className="w-full rounded-xl py-3 text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#0d9488', color: '#fff' }}>
                {closing
                  ? <span className="flex items-center justify-center gap-2"><RefreshCw size={14} className="animate-spin" /> Closing Register…</span>
                  : <span className="flex items-center justify-center gap-2"><Moon size={14} /> Close Register for {today}</span>}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Recent Closing History
            </h2>
          </div>

          {historyLoading && history.length === 0 && (
            <div className="py-8 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="rounded-2xl py-12 text-center"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <History className="mx-auto mb-2 h-9 w-9 opacity-15" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No closing records yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Previous end-of-day records will appear here</p>
            </div>
          )}

          <div className="space-y-3">
            {history.map(record => (
              <EodSummaryCard key={record.id} record={record} />
            ))}
          </div>
        </div>

        <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Records are scoped to your branch · Variance within GH₵1.00 is considered balanced
        </p>
      </div>
    </div>
  );
}
