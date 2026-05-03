'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Moon, CheckCircle2, AlertTriangle,
  Banknote, Smartphone, TrendingUp, ClipboardList,
  RefreshCw, History, ChevronDown, ChevronUp, ChevronRight,
  CreditCard, ShieldCheck, ShieldX, Clock, Eye, Search, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  TODAY_EOD_STATUS, EOD_HISTORY, CLOSE_REGISTER, EOD_PREVIEW,
  TODAY_PAYMENT_BREAKDOWN,
  APPROVE_EOD, DECLINE_EOD,
  BRANCH_EOD_FOR_DATE, STAFF_PENDING_EOD,
} from '@/lib/graphql/eod.queries';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type EodRecord = {
  id: string; branchName: string; cashierName: string; businessDate: string;
  totalSalesCount: number;
  grossRevenueFormatted: string; vatCollectedFormatted: string;
  refundsCount: number; refundsFormatted: string;
  expensesCount: number; expensesFormatted: string;
  netRevenueFormatted: string;
  expectedCashPesewas: number; expectedCashFormatted: string;
  expectedMomoPesewas: number; expectedMomoFormatted: string;
  cashCountedPesewas: number; cashCountedFormatted: string;
  momoCountedPesewas: number; momoCountedFormatted: string;
  totalCountedFormatted: string;
  variancePesewas: number; varianceFormatted: string;
  isBalanced: boolean; closingNotes: string | null;
  discrepancyReason: string | null;
  closedAt: string;
  approvalStatus: string; approvedByName: string | null;
  approvedAt: string | null; managerNotes: string | null;
};

type PaymentBreakdown = {
  method: string; count: number; totalPesewas: number; totalFormatted: string;
};

type StaffPendingItem = { id: string; name: string; role: string };

type EodPreview = {
  salesCount: number;
  grossRevenueFormatted: string;
  vatCollectedFormatted: string;
  refundsCount: number; refundsFormatted: string;
  expensesCount: number; expensesFormatted: string;
  netRevenueFormatted: string;
  expectedCashPesewas: number; expectedCashFormatted: string;
  expectedMomoPesewas: number; expectedMomoFormatted: string;
  sourceScope?: string;
  isClosed: boolean;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' });
}
function todayAccra(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
}
function methodLabel(m: string) {
  const map: Record<string, string> = {
    CASH: 'Cash', MTN_MOMO: 'MTN MoMo', VODAFONE_CASH: 'Vodafone Cash',
    AIRTELTIGO_MONEY: 'AirtelTigo', CARD: 'Card / POS', SPLIT: 'Split',
  };
  return map[m] ?? m;
}
function roleLabel(r: string) {
  const map: Record<string, string> = {
    owner: 'Owner', se_admin: 'Admin', manager: 'Manager',
    head_pharmacist: 'Head Pharmacist', pharmacist: 'Pharmacist',
    technician: 'Technician', cashier: 'Cashier', chemical_cashier: 'Chemical Cashier',
  };
  return map[r] ?? r;
}
function ApprovalBadge({ status }: { status: string }) {
  if (status === 'APPROVED')
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}><ShieldCheck size={10} />Approved</span>;
  if (status === 'DECLINED')
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}><ShieldX size={10} />Declined</span>;
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.1)', color: '#d97706' }}><Clock size={10} />Pending Approval</span>;
}

/* ─── Logout Prompt Modal ────────────────────────────────────────────────── */
function LogoutPrompt({ onLogout, onStay }: { onLogout: () => void; onStay: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(13,148,136,0.1)' }}>
            <Moon size={18} style={{ color: '#0d9488' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Shift Complete</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Register closed successfully</p>
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Would you like to sign out now that your shift is done?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: '#0d9488', color: '#fff' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Manager Action Panel ───────────────────────────────────────────────── */
function ManagerActionPanel({ record, onDone }: { record: EodRecord; onDone: () => void }) {
  const [mgrNotes, setMgrNotes] = useState('');
  const [err, setErr] = useState('');
  const refetchQ = ['PendingEodApprovals', 'EodHistory', 'TodayEodStatus'];

  const [approve, { loading: approving }] = useMutation(APPROVE_EOD, {
    onCompleted: onDone, onError: (e) => setErr(e.message), refetchQueries: refetchQ,
  });
  const [decline, { loading: declining }] = useMutation(DECLINE_EOD, {
    onCompleted: onDone, onError: (e) => setErr(e.message), refetchQueries: refetchQ,
  });

  const busy = approving || declining;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.18)' }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6366f1' }}>Manager Review</p>
      <textarea
        rows={2} placeholder="Add a note (optional)..." value={mgrNotes}
        onChange={e => setMgrNotes(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
        style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
      />
      {err && <p className="text-xs" style={{ color: '#dc2626' }}>{err}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => approve({ variables: { input: { eodId: record.id, managerNotes: mgrNotes.trim() || null } } })}
          disabled={busy}
          className="flex-1 rounded-lg py-2 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#16a34a', color: '#fff' }}>
          {approving ? <span className="flex items-center justify-center gap-1"><RefreshCw size={12} className="animate-spin" />Approving…</span> : <span className="flex items-center justify-center gap-1"><ShieldCheck size={14} />Approve</span>}
        </button>
        <button
          onClick={() => decline({ variables: { input: { eodId: record.id, managerNotes: mgrNotes.trim() || null } } })}
          disabled={busy}
          className="flex-1 rounded-lg py-2 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}>
          {declining ? <span className="flex items-center justify-center gap-1"><RefreshCw size={12} className="animate-spin" />Declining…</span> : <span className="flex items-center justify-center gap-1"><ShieldX size={14} />Decline</span>}
        </button>
      </div>
    </div>
  );
}

/* ─── Summary Card ───────────────────────────────────────────────────────── */
function EodSummaryCard({ record, showMgrActions }: { record: EodRecord; showMgrActions?: boolean }) {
  const [open, setOpen] = useState(false);
  const [actioned, setActioned] = useState(false);
  const balanced = record.isBalanced;
  const accent = balanced ? '#16a34a' : '#dc2626';
  const isPending = record.approvalStatus === 'PENDING';

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-card)', border: `1px solid ${accent}22`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
        style={{ borderBottom: open ? '1px solid var(--surface-border)' : undefined }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: accent + '15' }}>
            {balanced ? <CheckCircle2 size={18} style={{ color: accent }} /> : <AlertTriangle size={18} style={{ color: accent }} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{record.businessDate}</p>
              <ApprovalBadge status={record.approvalStatus} />
            </div>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              Closed by {record.cashierName} · {fmtDate(record.closedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Net Revenue</p>
            <p className="text-sm font-bold font-mono" style={{ color: accent }}>{record.netRevenueFormatted}</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: accent + '12', color: accent }}>
            {balanced ? 'Balanced' : `Off ${record.varianceFormatted}`}
          </span>
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Gross Sales', value: record.grossRevenueFormatted, sub: `${record.totalSalesCount} txns` },
              { label: 'VAT Collected', value: record.vatCollectedFormatted, sub: 'GRA obligation' },
              { label: 'Refunds', value: record.refundsFormatted, sub: `${record.refundsCount} item${record.refundsCount !== 1 ? 's' : ''}` },
              { label: 'Expenses', value: record.expensesFormatted, sub: `${record.expensesCount} item${record.expensesCount !== 1 ? 's' : ''}` },
              { label: 'Expected Cash', value: record.expectedCashFormatted, sub: 'System (cash sales)' },
              { label: 'Expected MoMo', value: record.expectedMomoFormatted, sub: 'System (mobile money)' },
              { label: 'Cash Counted', value: record.cashCountedFormatted, sub: 'Physical count' },
              { label: 'MoMo Counted', value: record.momoCountedFormatted, sub: 'Mobile money' },
              { label: 'Variance', value: record.varianceFormatted, sub: balanced ? 'Within GH₵1.00 ✓' : 'Out of balance ⚠' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-sm font-bold mt-0.5 font-mono" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
              </div>
            ))}
          </div>
          {record.closingNotes && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#a16207' }}>Cashier Notes</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{record.closingNotes}</p>
            </div>
          )}
          {record.discrepancyReason && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#dc2626' }}>Discrepancy Explanation</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{record.discrepancyReason}</p>
            </div>
          )}
          {record.managerNotes && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6366f1' }}>
                Manager Note{record.approvedByName ? ` · ${record.approvedByName}` : ''}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{record.managerNotes}</p>
            </div>
          )}
          {showMgrActions && isPending && !actioned && (
            <ManagerActionPanel record={record} onDone={() => setActioned(true)} />
          )}
          {actioned && (
            <p className="text-xs font-semibold text-center py-2" style={{ color: '#16a34a' }}>Action submitted ✓</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Manager Summary Card ───────────────────────────────────────────────── */
function ManagerSummaryCard({ date, onManage }: { date: string; onManage: () => void }) {
  const { data } = useQuery<{ branchEodForDate: EodRecord[] }>(BRANCH_EOD_FOR_DATE, {
    variables: { businessDate: date }, fetchPolicy: 'cache-and-network',
  });
  const { data: pending } = useQuery<{ staffPendingEod: StaffPendingItem[] }>(STAFF_PENDING_EOD, {
    variables: { businessDate: date }, fetchPolicy: 'cache-and-network',
  });

  const submitted = data?.branchEodForDate ?? [];
  const notSubmitted = pending?.staffPendingEod ?? [];
  const approvedCount = submitted.filter(r => r.approvalStatus === 'APPROVED').length;

  return (
    <div onClick={onManage}
      className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 20px rgba(99,102,241,0.08)' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="flex items-center gap-2 text-[#6366f1]">
          <ClipboardList size={16} />
          <span className="text-sm font-bold uppercase tracking-wider">Team EOD Status</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
          {date} <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x px-2 py-4" style={{ borderColor: 'var(--surface-border)' }}>
        {[
          { label: 'Submitted', count: submitted.length, color: '#16a34a' },
          { label: 'Pending', count: notSubmitted.length, color: '#d97706' },
          { label: 'Approved', count: approvedCount, color: '#6366f1' },
        ].map(s => (
          <div key={s.label} className="text-center px-2">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[10px] font-bold uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-widest bg-[var(--surface-base)]" style={{ color: '#6366f1' }}>
        Manage Team Records
      </div>
    </div>
  );
}

/* ─── Close Register Form ────────────────────────────────────────────────── */
function CloseRegisterForm({ onSuccess }: { onSuccess: (r: EodRecord) => void }) {
  const today = todayAccra();
  const [cash, setCash] = useState('');
  const [momo, setMomo] = useState('');
  const [notes, setNotes] = useState('');
  const [discrepancy, setDiscrepancy] = useState('');
  const [err, setErr] = useState('');

  const cashPesewas = Math.round((parseFloat(cash) || 0) * 100);
  const momoPesewas = Math.round((parseFloat(momo) || 0) * 100);

  const { data: previewData, loading: previewLoading } = useQuery<{ eodPreview: EodPreview }>(EOD_PREVIEW, {
    variables: { businessDate: today },
    fetchPolicy: 'network-only',
  });
  const preview = previewData?.eodPreview;

  const [closeRegister, { loading }] = useMutation(CLOSE_REGISTER, {
    onCompleted: (d) => onSuccess(d.closeRegister),
    onError: (e) => setErr(e.message),
    refetchQueries: ['TodayEodStatus', 'EodHistory', 'PendingEodApprovals'],
  });

  function submit() {
    setErr('');
    if (!cash && !momo) { setErr('Please enter at least a cash or MoMo amount.'); return; }
    closeRegister({
      variables: {
        input: {
          businessDate: today,
          cashCountedPesewas: cashPesewas,
          momoCountedPesewas: momoPesewas,
          closingNotes: notes.trim() || null,
          discrepancyReason: discrepancy.trim() || null,
        },
      },
    });
  }

  return (
    <div className="space-y-5">
      {/* System Preview Panel */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(13,148,136,0.04)', border: '1px solid rgba(13,148,136,0.15)' }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#0d9488' }}>System Summary for {today}</p>
          <div className="flex items-center gap-2">
            {preview?.sourceScope === 'BRANCH_FALLBACK' && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309', border: '1px solid rgba(217,119,6,0.2)' }}>
                Branch totals fallback
              </span>
            )}
            {previewLoading && <RefreshCw size={12} className="animate-spin opacity-40" />}
          </div>
        </div>
        {preview ? (
          <>
            {/* Top stats row */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Total Sales', value: preview.grossRevenueFormatted, sub: `${preview.salesCount} txn${preview.salesCount !== 1 ? 's' : ''}` },
                { label: 'Net Revenue', value: preview.netRevenueFormatted, sub: 'After refunds & expenses' },
                { label: 'VAT Collected', value: preview.vatCollectedFormatted, sub: 'NHIL/VAT' },
                { label: 'Refunds', value: preview.refundsFormatted, sub: `${preview.refundsCount} item${preview.refundsCount !== 1 ? 's' : ''}` },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-lg p-2.5" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="mt-0.5 font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Expected amounts — prominent confirm cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Cash */}
              <div className="rounded-xl p-3.5 space-y-2" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.25)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Banknote size={14} style={{ color: '#16a34a' }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#16a34a' }}>Expected Cash</span>
                  </div>
                  <span className="font-mono text-base font-bold" style={{ color: '#15803d' }}>{preview.expectedCashFormatted}</span>
                </div>
                <p className="text-[10px]" style={{ color: '#4ade80' }}>From cash sales recorded today</p>
                <button
                  type="button"
                  onClick={() => setCash((preview.expectedCashPesewas / 100).toFixed(2))}
                  className="w-full rounded-lg py-1.5 text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: 'rgba(22,163,74,0.15)', color: '#15803d', border: '1px solid rgba(22,163,74,0.3)' }}>
                  ✓ Confirm — use this amount
                </button>
              </div>
              {/* MoMo */}
              <div className="rounded-xl p-3.5 space-y-2" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={14} style={{ color: '#2563eb' }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2563eb' }}>Expected MoMo</span>
                  </div>
                  <span className="font-mono text-base font-bold" style={{ color: '#1d4ed8' }}>{preview.expectedMomoFormatted}</span>
                </div>
                <p className="text-[10px]" style={{ color: '#93c5fd' }}>From mobile money sales today</p>
                <button
                  type="button"
                  onClick={() => setMomo((preview.expectedMomoPesewas / 100).toFixed(2))}
                  className="w-full rounded-lg py-1.5 text-xs font-bold transition-all hover:opacity-80"
                  style={{ background: 'rgba(37,99,235,0.12)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.25)' }}>
                  ✓ Confirm — use this amount
                </button>
              </div>
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Confirm the amounts above if they match your physical count, or enter different values below to report a discrepancy.
            </p>
          </>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading today&apos;s sales…</p>
        )}
      </div>

      <div className="rounded-xl p-1" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
        <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Physical Count — enter what you actually counted</p>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {/* Cash */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <Banknote size={13} /> Cash in Drawer (GH₵)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>GH₵</span>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={cash} onChange={e => setCash(e.target.value)}
                className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 font-mono"
                style={{ background: 'var(--surface-card)', borderColor: cashPesewas > 0 && preview ? (cashPesewas === preview.expectedCashPesewas ? '#16a34a' : cashPesewas < preview.expectedCashPesewas ? '#dc2626' : '#d97706') : 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </div>
            {preview && cashPesewas > 0 && (() => {
              const diff = cashPesewas - preview.expectedCashPesewas;
              const color = diff === 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#d97706';
              const label = diff === 0 ? '✓ Matches system' : diff < 0 ? `Short by GH₵${Math.abs(diff / 100).toFixed(2)}` : `Excess GH₵${(diff / 100).toFixed(2)}`;
              return <p className="mt-1 text-[10px] font-bold" style={{ color }}>{label}</p>;
            })()}
          </div>
          {/* MoMo */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <Smartphone size={13} /> MoMo Received (GH₵)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>GH₵</span>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={momo} onChange={e => setMomo(e.target.value)}
                className="w-full rounded-xl border py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 font-mono"
                style={{ background: 'var(--surface-card)', borderColor: momoPesewas > 0 && preview ? (momoPesewas === preview.expectedMomoPesewas ? '#16a34a' : momoPesewas < preview.expectedMomoPesewas ? '#dc2626' : '#d97706') : 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </div>
            {preview && momoPesewas > 0 && (() => {
              const diff = momoPesewas - preview.expectedMomoPesewas;
              const color = diff === 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#d97706';
              const label = diff === 0 ? '✓ Matches system' : diff < 0 ? `Short by GH₵${Math.abs(diff / 100).toFixed(2)}` : `Excess GH₵${(diff / 100).toFixed(2)}`;
              return <p className="mt-1 text-[10px] font-bold" style={{ color }}>{label}</p>;
            })()}
          </div>
        </div>
      </div>

      {/* Closing Notes */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Closing Notes <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          rows={2} placeholder="Any handover notes for the next shift…"
          value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none"
          style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Discrepancy */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Discrepancy Reason <span className="font-normal normal-case">(required if cash is short)</span>
        </label>
        <textarea
          rows={2} placeholder="Explain any cash shortage…"
          value={discrepancy} onChange={e => setDiscrepancy(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none"
          style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
        />
      </div>

      {err && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          {err}
        </div>
      )}

      {/* Total preview */}
      {(cashPesewas > 0 || momoPesewas > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Cash', val: `GH₵${(cashPesewas / 100).toFixed(2)}`, color: '#16a34a' },
            { label: 'MoMo', val: `GH₵${(momoPesewas / 100).toFixed(2)}`, color: '#2563eb' },
            { label: 'Total', val: `GH₵${((cashPesewas + momoPesewas) / 100).toFixed(2)}`, color: '#0d9488' },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <p className="mt-0.5 font-mono text-sm font-bold" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={submit} disabled={loading}
        className="w-full rounded-2xl py-3.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: '#0d9488', color: '#fff' }}
      >
        {loading
          ? <><RefreshCw size={16} className="animate-spin" />Closing Register…</>
          : <><Moon size={16} />Close Register for {today}</>}
      </button>
    </div>
  );
}

/* ─── Payment Breakdown Widget ───────────────────────────────────────────── */
function PaymentBreakdownWidget() {
  const today = todayAccra();
  const periodStart = `${today}T00:00:00`;
  const periodEnd = `${today}T23:59:59`;
  const { data, loading } = useQuery<{ paymentMethodBreakdown: PaymentBreakdown[] }>(
    TODAY_PAYMENT_BREAKDOWN, { variables: { periodStart, periodEnd }, fetchPolicy: 'cache-and-network' },
  );
  const rows = data?.paymentMethodBreakdown ?? [];
  if (loading && rows.length === 0) return (
    <div className="flex items-center justify-center py-6 opacity-40">
      <RefreshCw size={16} className="animate-spin mr-2" /><span className="text-sm">Loading…</span>
    </div>
  );
  if (rows.length === 0) return (
    <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No payment data yet today.</p>
  );
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.method} className="flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center gap-2">
            <CreditCard size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{methodLabel(r.method)}</span>
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}>{r.count}</span>
          </div>
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{r.totalFormatted}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Team Workbench ─────────────────────────────────────────────────────── */
function TeamWorkbench({ selectedDate, onDateChange, onBack }: {
  selectedDate: string; onDateChange: (d: string) => void; onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const { data: branchData, loading: branchLoading, refetch } = useQuery<{ branchEodForDate: EodRecord[] }>(
    BRANCH_EOD_FOR_DATE, { variables: { businessDate: selectedDate }, fetchPolicy: 'cache-and-network' },
  );
  const { data: pendingStaffData } = useQuery<{ staffPendingEod: StaffPendingItem[] }>(
    STAFF_PENDING_EOD, { variables: { businessDate: selectedDate }, fetchPolicy: 'cache-and-network' },
  );

  const submitted = branchData?.branchEodForDate ?? [];
  const notSubmitted = pendingStaffData?.staffPendingEod ?? [];
  const q = search.trim().toLowerCase();
  const filteredSubmitted = q ? submitted.filter(r => r.cashierName.toLowerCase().includes(q)) : submitted;
  const filteredNotSubmitted = q ? notSubmitted.filter(s => s.name.toLowerCase().includes(q)) : notSubmitted;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-xs font-bold text-teal hover:underline">
          <ArrowLeft size={13} /> Back to My Closing
        </button>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={e => onDateChange(e.target.value)}
            className="rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm font-bold outline-none" />
          <button onClick={() => refetch()}
            className="rounded-xl border border-surface-border bg-surface-card p-2 text-text-muted transition-colors hover:text-teal">
            <RefreshCw size={16} className={branchLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff by name..."
              className="w-full rounded-2xl border border-surface-border bg-surface-card py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-teal/50" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-teal/5 border border-teal/10 px-4 py-2">
          <div className="text-center">
            <p className="text-lg font-bold text-teal">{submitted.length}</p>
            <p className="text-[9px] font-bold uppercase text-teal/60 tracking-tighter">Done</p>
          </div>
          <div className="h-6 w-px bg-teal/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{notSubmitted.length}</p>
            <p className="text-[9px] font-bold uppercase text-amber-600/60 tracking-tighter">Pending</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
            Submitted Records ({filteredSubmitted.length})
          </h2>
          {branchLoading && submitted.length === 0 ? (
            <div className="py-20 text-center opacity-40">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
              <p className="text-sm">Loading records...</p>
            </div>
          ) : filteredSubmitted.length > 0 ? (
            <div className="space-y-3">
              {filteredSubmitted.map(r => <EodSummaryCard key={r.id} record={r} showMgrActions={true} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-surface-border py-12 text-center text-sm text-text-muted">
              No submitted records found.
            </div>
          )}
        </section>

        {filteredNotSubmitted.length > 0 && (
          <section>
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600/80">
              Missing Submissions ({filteredNotSubmitted.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotSubmitted.map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-amber-600/10 bg-amber-600/[0.02] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600/10 text-xs font-bold text-amber-600">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text-primary">{s.name}</p>
                    <p className="text-[9px] text-text-muted">{roleLabel(s.role)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
const MANAGER_ROLES = ['owner', 'se_admin', 'manager', 'head_pharmacist'];

export default function EodClient() {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const today = todayAccra();
  const isManager = !!user && MANAGER_ROLES.includes(user.role);

  const [view, setView] = useState<'main' | 'team'>('main');
  const [teamDate, setTeamDate] = useState(today);
  const [justClosed, setJustClosed] = useState<EodRecord | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: statusData, loading: statusLoading, refetch: refetchStatus } = useQuery<{
    todayEodStatus: { isClosed: boolean; record: EodRecord | null };
  }>(TODAY_EOD_STATUS, { fetchPolicy: 'network-only' });

  const { data: historyData, loading: historyLoading } = useQuery<{ eodHistory: EodRecord[] }>(
    EOD_HISTORY, { variables: { limit: 20 }, skip: !showHistory, fetchPolicy: 'cache-and-network' },
  );

  const isClosed = statusData?.todayEodStatus?.isClosed ?? false;
  const todayRecord = statusData?.todayEodStatus?.record ?? null;
  const history = historyData?.eodHistory ?? [];

  function handleClosed(record: EodRecord) {
    setJustClosed(record);
    refetchStatus();
    setShowLogout(true);
  }

  if (view === 'team') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <TeamWorkbench selectedDate={teamDate} onDateChange={setTeamDate} onBack={() => setView('main')} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-20" style={{ minHeight: '100%' }}>
      {showLogout && (
        <LogoutPrompt
          onLogout={() => { clearAuth(); router.push('/login'); }}
          onStay={() => setShowLogout(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
            <Moon size={22} style={{ color: '#0d9488' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>End of Day</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {today} · {user?.name ?? 'Staff'} · {user?.branchName ?? ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setView('team')}
              className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(99,102,241,0.06)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.2)' }}>
              <ClipboardList size={13} /> Team Records
            </button>
          )}
          <button
            onClick={() => setShowHistory(h => !h)}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--surface-card)', color: 'var(--text-secondary)', borderColor: 'var(--surface-border)' }}>
            <History size={13} /> History
          </button>
        </div>
      </div>

      {/* Today's status banner */}
      {statusLoading ? (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border p-4" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
          <RefreshCw size={16} className="animate-spin opacity-40" />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Checking today's status…</span>
        </div>
      ) : isClosed ? (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 rounded-2xl p-4"
            style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#15803d' }}>Register already closed for today</p>
              <p className="text-xs" style={{ color: '#166534' }}>
                {todayRecord ? `Closed at ${fmtDate(todayRecord.closedAt)}` : ''}
              </p>
            </div>
          </div>
          {todayRecord && <EodSummaryCard record={todayRecord} showMgrActions={isManager} />}
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-2 rounded-2xl p-4"
          style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <Clock size={16} style={{ color: '#d97706' }} />
          <p className="text-sm font-medium" style={{ color: '#92400e' }}>
            Register is still open for <span className="font-bold">{today}</span>
          </p>
        </div>
      )}

      {/* Just-closed success */}
      {justClosed && !isClosed && (
        <div className="mb-6">
          <EodSummaryCard record={justClosed} showMgrActions={false} />
        </div>
      )}

      {/* Close Register Form (only if not yet closed today) */}
      {!isClosed && !justClosed && (
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <div className="mb-5 flex items-center gap-2">
            <Banknote size={16} style={{ color: '#0d9488' }} />
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Count Your Register
            </h2>
          </div>
          <CloseRegisterForm onSuccess={handleClosed} />
        </div>
      )}

      {/* Payment Breakdown */}
      <div className="mb-6 rounded-2xl p-6" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={15} style={{ color: '#2563eb' }} />
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Today's Payment Breakdown
          </h2>
        </div>
        <PaymentBreakdownWidget />
      </div>

      {/* Manager team summary card */}
      {isManager && (
        <div className="mb-6">
          <ManagerSummaryCard date={today} onManage={() => setView('team')} />
        </div>
      )}

      {/* EOD History */}
      {showHistory && (
        <div className="mb-6 rounded-2xl p-6" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={15} style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Recent History
              </h2>
            </div>
            {historyLoading && <RefreshCw size={14} className="animate-spin opacity-40" />}
          </div>
          {history.length === 0 && !historyLoading ? (
            <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No history found.</p>
          ) : (
            <div className="space-y-3">
              {history.map(r => <EodSummaryCard key={r.id} record={r} showMgrActions={isManager} />)}
            </div>
          )}
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/transactions"
          className="flex items-center gap-2 rounded-2xl border p-4 text-sm font-bold transition-all hover:opacity-80"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
          <Eye size={16} /> View Sales
        </Link>
        <Link href="/pos"
          className="flex items-center gap-2 rounded-2xl border p-4 text-sm font-bold transition-all hover:opacity-80"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
          <CreditCard size={16} /> POS Terminal
        </Link>
      </div>
    </div>
  );
}
