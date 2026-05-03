'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import Link from 'next/link';
import {
  ArrowLeft, Moon, CheckCircle2, AlertTriangle,
  Banknote, Smartphone, TrendingUp, ClipboardList,
  RefreshCw, History, ChevronDown, ChevronUp, ChevronRight,
  CreditCard, ShieldCheck, ShieldX, Clock, Eye, Search, CalendarDays,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  TODAY_EOD_STATUS, EOD_HISTORY, CLOSE_REGISTER,
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
  netRevenueFormatted: string; expectedCashFormatted: string;
  cashCountedPesewas: number; cashCountedFormatted: string;
  momoCountedPesewas: number; momoCountedFormatted: string;
  totalCountedFormatted: string;
  variancePesewas: number; varianceFormatted: string;
  isBalanced: boolean; closingNotes: string | null; closedAt: string;
  approvalStatus: string; approvedByName: string | null;
  approvedAt: string | null; managerNotes: string | null;
};

type PaymentBreakdown = {
  method: string; count: number; totalPesewas: number; totalFormatted: string;
};

type StaffPendingItem = { id: string; name: string; role: string };

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' });
}
function todayAccra(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
}
function shiftYmd(dateYmd: string, deltaDays: number): string {
  const d = new Date(`${dateYmd}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
function methodLabel(m: string) {
  const map: Record<string, string> = {
    CASH: 'Cash', MTN_MOMO: 'MTN MoMo', VODAFONE_CASH: 'Vodafone Cash',
    AIRTELTIGO_MONEY: 'AirtelTigo', CARD: 'Card / POS', SPLIT: 'Split',
  };
  return map[m] ?? m;
}
function ApprovalBadge({ status }: { status: string }) {
  if (status === 'APPROVED')
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}><ShieldCheck size={10} />Approved</span>;
  if (status === 'DECLINED')
    return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}><ShieldX size={10} />Declined</span>;
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(234,179,8,0.1)', color: '#d97706' }}><Clock size={10} />Pending Approval</span>;
}

/* ─── Manager Action Panel (approve / decline) ───────────────────────────── */
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
              { label: 'Expected Cash', value: record.expectedCashFormatted, sub: 'System computed' },
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
function ManagerSummaryCard({
  date,
  onManage,
}: {
  date: string;
  onManage: () => void;
}) {
  const { data } = useQuery<{ branchEodForDate: EodRecord[] }>(BRANCH_EOD_FOR_DATE, {
    variables: { businessDate: date },
    fetchPolicy: 'cache-and-network',
  });
  const { data: pending } = useQuery<{ staffPendingEod: StaffPendingItem[] }>(STAFF_PENDING_EOD, {
    variables: { businessDate: date },
    fetchPolicy: 'cache-and-network',
  });

  const submitted = data?.branchEodForDate ?? [];
  const notSubmitted = pending?.staffPendingEod ?? [];
  const approvedCount = submitted.filter(r => r.approvalStatus === 'APPROVED').length;

  return (
    <div
      onClick={onManage}
      className="group relative cursor-pointer rounded-2xl overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        boxShadow: '0 4px 20px rgba(99,102,241,0.08)',
      }}
    >
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

/* ─── Team Workbench View ────────────────────────────────────────────────── */
function TeamWorkbench({
  selectedDate,
  onDateChange,
  onBack,
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const { data: branchData, loading: branchLoading, refetch } = useQuery<{
    branchEodForDate: EodRecord[];
  }>(BRANCH_EOD_FOR_DATE, {
    variables: { businessDate: selectedDate },
    fetchPolicy: 'cache-and-network',
  });

  const { data: pendingStaffData, loading: pendingStaffLoading } = useQuery<{
    staffPendingEod: StaffPendingItem[];
  }>(STAFF_PENDING_EOD, {
    variables: { businessDate: selectedDate },
    fetchPolicy: 'cache-and-network',
  });

  const submitted = branchData?.branchEodForDate ?? [];
  const notSubmitted = pendingStaffData?.staffPendingEod ?? [];
  const q = search.trim().toLowerCase();

  const filteredSubmitted = q
    ? submitted.filter(r => r.cashierName.toLowerCase().includes(q))
    : submitted;
  const filteredNotSubmitted = q
    ? notSubmitted.filter(s => s.name.toLowerCase().includes(q))
    : notSubmitted;

  return (
    <div className="space-y-6 pb-20">
      {/* Workbench Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="flex w-fit items-center gap-1.5 text-xs font-bold text-teal hover:underline"
        >
          <ArrowLeft size={13} /> Back to My Closing
        </button>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            className="rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm font-bold outline-none"
          />
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-surface-border bg-surface-card p-2 text-text-muted transition-colors hover:text-teal"
          >
            <RefreshCw size={16} className={branchLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats and Search */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name..."
              className="w-full rounded-2xl border border-surface-border bg-surface-card py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-teal/50"
            />
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

      {/* Lists */}
      <div className="space-y-8">
        {/* Submitted Section */}
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
              {filteredSubmitted.map(r => (
                <EodSummaryCard key={r.id} record={r} showMgrActions={true} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-surface-border py-12 text-center text-sm text-text-muted">
              No submitted records found for this criteria.
            </div>
          )}
        </section>

        {/* Not Submitted Section */}
        {filteredNotSubmitted.length > 0 && (
          <section>
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600/80">
              Missing Submissions ({filteredNotSubmitted.length})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotSubmitted.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-600/10 bg-amber-600/[0.02] p-3"
                >
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

/* ─── Role label ─────────────────────────────────────────────────────────── */
function roleLabel(r: string) {
  const map: Record<string, string> = {
    owner: 'Owner', se_admin: 'Admin', manager: 'Manager',
    head_pharmacist: 'Head Pharmacist', pharmacist: 'Pharmacist',
    technician: 'Technician', cashier: 'Cashier', chemical_cashier: 'Chemical Cashier',
  };
  return map[r] ?? r;
}

export default function EodClient() {
  const today = todayAccra();
  const [managerDate, setManagerDate] = useState(today);
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my');
  const user = useAuthStore(s => s.user);
  const isManager = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user?.role ?? '');

  /* ── Queries ── */
  const { data: statusData, loading: statusLoading, refetch: refetchStatus } = useQuery<{
    todayEodStatus: { isClosed: boolean; record: EodRecord | null };
  }>(TODAY_EOD_STATUS, { fetchPolicy: 'cache-and-network' });

  const { data: historyData, loading: historyLoading } = useQuery<{
    eodHistory: EodRecord[];
  }>(EOD_HISTORY, { variables: { limit: 14 }, fetchPolicy: 'cache-and-network' });

  const { data: breakdownData, loading: breakdownLoading } = useQuery<{
    paymentMethodBreakdown: PaymentBreakdown[];
  }>(TODAY_PAYMENT_BREAKDOWN, {
    variables: { periodStart: today, periodEnd: today },
    fetchPolicy: 'cache-and-network',
  });

  /* ── Mutation ── */
  const [closeRegister, { loading: closing }] = useMutation(CLOSE_REGISTER, {
    onCompleted: () => { refetchStatus(); setStep('done'); },
    onError: (e) => setError(e.message),
    refetchQueries: ['EodHistory'],
  });

  /* ── Local state ── */
  const [step, setStep] = useState<'enter' | 'confirm' | 'done'>('enter');
  const [cashCounted, setCashCounted] = useState('');
  const [momoCounted, setMomoCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const isClosed = statusData?.todayEodStatus?.isClosed ?? false;
  const todayRecord = statusData?.todayEodStatus?.record ?? null;
  const history = historyData?.eodHistory ?? [];
  const breakdown = breakdownData?.paymentMethodBreakdown ?? [];

  /* ── Derived totals ── */
  const cashSystemPesewas = breakdown.find(b => b.method === 'CASH')?.totalPesewas ?? 0;
  const momoSystemPesewas = breakdown
    .filter(b => ['MTN_MOMO', 'VODAFONE_CASH', 'AIRTELTIGO_MONEY'].includes(b.method))
    .reduce((s, b) => s + b.totalPesewas, 0);

  const totalSystemPesewas = breakdown.reduce((s, b) => s + b.totalPesewas, 0);

  const cashVal = parseFloat(cashCounted || '0') || 0;
  const momoVal = parseFloat(momoCounted || '0') || 0;
  const totalCounted = cashVal + momoVal;

  /* Pre-fill from system when entering step */
  function prefillFromSystem() {
    if (!cashCounted) setCashCounted((cashSystemPesewas / 100).toFixed(2));
    if (!momoCounted) setMomoCounted((momoSystemPesewas / 100).toFixed(2));
  }

  function goToConfirm() {
    setError('');
    if (cashVal < 0 || momoVal < 0) { setError('Amounts cannot be negative.'); return; }
    setStep('confirm');
  }

  async function handleSubmit() {
    setError('');
    try {
      await closeRegister({
        variables: {
          input: {
            businessDate: today,
            cashCountedPesewas: Math.round(cashVal * 100),
            momoCountedPesewas: Math.round(momoVal * 100),
            closingNotes: notes.trim() || null,
          },
        },
      });
    } catch { /* handled in onError */ }
  }

  /* ── Render ── */
  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>

      {/* ── Hero ─────────────────────────────────────── */}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <Moon size={18} style={{ color: '#0d9488' }} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Register & Reconciliation</h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Close the daily register and reconcile cash for <strong>{today}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{
              background: isClosed ? 'rgba(22,163,74,0.08)' : 'rgba(234,179,8,0.08)',
              border: `1px solid ${isClosed ? 'rgba(22,163,74,0.25)' : 'rgba(234,179,8,0.25)'}`,
            }}>
            {isClosed ? <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> : <AlertTriangle size={16} style={{ color: '#d97706' }} />}
            <span className="text-sm font-semibold" style={{ color: isClosed ? '#16a34a' : '#d97706' }}>
              {isClosed ? 'Register closed for today' : 'Register is open — not yet closed for today'}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-4 py-6 md:px-6 space-y-8">

        {statusLoading && !statusData && (
          <div className="py-10 flex justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-teal border-t-transparent" />
          </div>
        )}

        {/* ── MANAGER VIEW ── */}
        {isManager && viewMode === 'team' && (
          <TeamWorkbench
            selectedDate={managerDate}
            onDateChange={setManagerDate}
            onBack={() => setViewMode('my')}
          />
        )}

        {/* ── PERSONAL VIEW ── */}
        {(!isManager || viewMode === 'my') && (
          <div className="space-y-8">
            {/* Manager Entry Point */}
            {isManager && (
              <ManagerSummaryCard
                date={today}
                onManage={() => setViewMode('team')}
              />
            )}

            {/* Today's closed record */}
            {todayRecord && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-teal" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
                    Your Closing Report
                  </h2>
                </div>
                <EodSummaryCard record={todayRecord} showMgrActions={isManager} />
              </div>
            )}

            {/* Close Register Form */}
            {!isClosed && !statusLoading && step !== 'done' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Moon size={14} className="text-text-muted" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-muted">
                    Complete Your Shift
                  </h2>
                </div>
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>

                  {/* Header */}
                  <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={16} style={{ color: '#0d9488' }} />
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          Close Register — {today}
                        </h2>
                      </div>
                      {/* Step pills */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { id: 'enter', label: '1 Count' },
                          { id: 'confirm', label: '2 Review' },
                        ].map(s => (
                          <span key={s.id} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                            style={{
                              background: step === s.id ? 'rgba(13,148,136,0.15)' : 'var(--surface-base)',
                              color: step === s.id ? '#0d9488' : 'var(--text-muted)',
                              border: `1px solid ${step === s.id ? 'rgba(13,148,136,0.3)' : 'var(--surface-border)'}`,
                            }}>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── STEP 1: Enter counts ── */}
                  {step === 'enter' && (
                    <div className="p-5 space-y-5">

                      {/* Today's system sales breakdown */}
                      {breakdown.length > 0 && (
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--surface-border)' }}>
                          <div className="px-4 py-2.5 flex items-center justify-between"
                            style={{ background: 'rgba(13,148,136,0.05)', borderBottom: '1px solid var(--surface-border)' }}>
                            <div className="flex items-center gap-1.5">
                              <TrendingUp size={13} style={{ color: '#0d9488' }} />
                              <span className="text-xs font-bold" style={{ color: '#0d9488' }}>Today's Sales by Payment Method</span>
                            </div>
                            <button
                              onClick={prefillFromSystem}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
                              style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                              Auto-fill
                            </button>
                          </div>
                          <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
                            {breakdown.map(b => (
                              <div key={b.method} className="flex items-center justify-between px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    {b.method === 'CASH' ? <Banknote size={13} /> : b.method === 'CARD' ? <CreditCard size={13} /> : <Smartphone size={13} />}
                                  </span>
                                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{methodLabel(b.method)}</span>
                                  <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold"
                                    style={{ background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
                                    {b.count} txn{b.count !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{b.totalFormatted}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between px-4 py-2.5"
                              style={{ background: 'rgba(13,148,136,0.04)' }}>
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Total System Sales</span>
                              <span className="text-sm font-bold font-mono" style={{ color: '#0d9488' }}>
                                GH₵{(totalSystemPesewas / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {breakdownLoading && breakdown.length === 0 && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading today's sales…</span>
                        </div>
                      )}

                      {/* Physical count inputs */}
                      <div>
                        <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Physical Count</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {[
                            { label: 'Cash in Drawer (GH₵)', icon: Banknote, value: cashCounted, set: setCashCounted, hint: cashSystemPesewas > 0 ? `System: GH₵${(cashSystemPesewas / 100).toFixed(2)}` : undefined },
                            { label: 'MoMo Received (GH₵)', icon: Smartphone, value: momoCounted, set: setMomoCounted, hint: momoSystemPesewas > 0 ? `System: GH₵${(momoSystemPesewas / 100).toFixed(2)}` : undefined },
                          ].map(({ label, icon: Icon, value, set, hint }) => (
                            <div key={label}>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                  <Icon size={11} className="inline mr-1" />{label}
                                </label>
                                {hint && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
                              </div>
                              <input
                                type="number" min="0" step="0.01" placeholder="0.00"
                                value={value} onChange={e => set(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-sm font-mono font-semibold outline-none transition-all"
                                style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Live total + variance preview */}
                      {(cashCounted || momoCounted) && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {[
                            { label: 'Cash Counted', value: `GH₵${cashVal.toFixed(2)}`, color: '#0d9488' },
                            { label: 'MoMo Counted', value: `GH₵${momoVal.toFixed(2)}`, color: '#6366f1' },
                            { label: 'Total Counted', value: `GH₵${totalCounted.toFixed(2)}`, color: totalCounted * 100 >= totalSystemPesewas - 100 ? '#16a34a' : '#dc2626' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-xl px-3 py-2.5 text-center"
                              style={{ background: color + '08', border: `1px solid ${color}25` }}>
                              <p className="text-[10px] font-bold uppercase" style={{ color }}>{label}</p>
                              <p className="text-base font-bold font-mono mt-0.5" style={{ color }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                          Closing Notes (optional)
                        </label>
                        <textarea
                          rows={2} placeholder="Any notes about discrepancies, incidents, etc."
                          value={notes} onChange={e => setNotes(e.target.value)}
                          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                          style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                          <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                          <span className="text-sm" style={{ color: '#dc2626' }}>{error}</span>
                        </div>
                      )}

                      <button
                        onClick={goToConfirm}
                        disabled={!cashCounted && !momoCounted}
                        className="w-full rounded-xl py-3 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ background: '#0d9488', color: '#fff' }}>
                        <Eye size={14} /> Review Before Submitting
                      </button>
                    </div>
                  )}

                  {/* ── STEP 2: Confirm ── */}
                  {step === 'confirm' && (
                    <div className="p-5 space-y-5">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Confirm your counts before sending to manager for approval.
                      </p>

                      {/* Confirmation grid */}
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--surface-border)' }}>
                        {[
                          { label: 'Business Date', value: today, icon: <ClipboardList size={13} /> },
                          { label: 'Cash in Drawer', value: `GH₵${cashVal.toFixed(2)}`, icon: <Banknote size={13} />, sys: cashSystemPesewas > 0 ? `GH₵${(cashSystemPesewas / 100).toFixed(2)} system` : undefined },
                          { label: 'MoMo Received', value: `GH₵${momoVal.toFixed(2)}`, icon: <Smartphone size={13} />, sys: momoSystemPesewas > 0 ? `GH₵${(momoSystemPesewas / 100).toFixed(2)} system` : undefined },
                          { label: 'Total Counted', value: `GH₵${totalCounted.toFixed(2)}`, icon: <TrendingUp size={13} /> },
                        ].map(({ label, value, icon, sys }: any) => (
                          <div key={label} className="flex items-center justify-between px-4 py-3"
                            style={{ borderBottom: '1px solid var(--surface-border)' }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                              {sys && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>({sys})</span>}
                            </div>
                            <span className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{value}</span>
                          </div>
                        ))}
                        {notes.trim() && (
                          <div className="px-4 py-3">
                            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Notes: </span>
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl px-4 py-3 flex items-start gap-2"
                        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <Clock size={14} className="mt-0.5 shrink-0" style={{ color: '#6366f1' }} />
                        <p className="text-xs" style={{ color: '#6366f1' }}>
                          After submission, this will be sent to a manager for review. They will <strong>approve</strong> or <strong>decline</strong> the closing.
                        </p>
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                          <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                          <span className="text-sm" style={{ color: '#dc2626' }}>{error}</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep('enter')}
                          className="flex-1 rounded-xl py-3 text-sm font-bold transition-all hover:opacity-80"
                          style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                          ← Edit Counts
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={closing}
                          className="flex-[2] rounded-xl py-3 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ background: '#0d9488', color: '#fff' }}>
                          {closing
                            ? <><RefreshCw size={14} className="animate-spin" /> Submitting…</>
                            : <><Moon size={14} /> Submit for Approval</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Done state */}
            {(isClosed || step === 'done') && todayRecord === null && (
              <div className="rounded-2xl px-6 py-10 text-center"
                style={{ background: 'var(--surface-card)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: '#16a34a' }} />
                <p className="text-base font-bold" style={{ color: '#16a34a' }}>Register closed & submitted!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Awaiting manager approval. You'll see the result in the history below.
                </p>
              </div>
            )}

            {/* Recent History */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={14} className="text-text-muted" />
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
                  <EodSummaryCard key={record.id} record={record} showMgrActions={isManager} />
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] uppercase tracking-widest opacity-30">
          Records scoped to {user?.branchName ?? 'your branch'} · GH₵1.00 variance tolerance
        </p>
      </div>
    </div>
  );
}
