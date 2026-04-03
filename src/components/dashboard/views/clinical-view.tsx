'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  Pill,
  ClipboardList,
  FlaskConical,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Package,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import type { AuthUser } from '@/types';
import { PENDING_PRESCRIPTIONS } from '@/lib/graphql/pharmacy.queries';
import { RECENT_SALES } from '@/lib/graphql/sales.queries';
import { formatGhs } from '@/lib/utils';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { DashboardMarketPulseFootprint } from '@/components/dashboard/dashboard-market-pulse-footprint';
import { RxStatusChart } from '@/components/dashboard/charts/rx-status-chart';

interface ClinicalViewProps {
  user: AuthUser;
}

interface RxRow {
  id: string;
  status: string;
  items: Array<{ productName: string; quantity: number }>;
}

interface PosSaleRow {
  id: string;
  branchId: string;
  branchName: string;
  totalPesewas: number;
  soldAt?: string | null;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; classification?: string }>;
}

function accraTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GH', {
    timeZone: 'Africa/Accra',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function posLinePreview(items: PosSaleRow['items']): string {
  if (!items?.length) return '—';
  return items
    .map((i) => {
      const t = (i.classification ?? 'OTC').trim();
      return `${i.productName.trim()} (${t}) ×${i.quantity}`;
    })
    .join(' · ');
}

export function ClinicalView({ user }: ClinicalViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const isTechnician = user.role === 'technician';

  const canQueue = ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist'].includes(user.role);
  const showPosFeed = user.role === 'head_pharmacist' || user.role === 'pharmacist';

  const { data, loading } = useQuery<{ pendingPrescriptions: RxRow[] }>(PENDING_PRESCRIPTIONS, {
    skip: !canQueue,
    pollInterval: 60_000,
  });

  const { data: posData, loading: posLoading } = useQuery<{ recentSales: PosSaleRow[] }>(RECENT_SALES, {
    variables: { limit: 8 },
    skip: !showPosFeed,
    pollInterval: 45_000,
  });

  const stats = useMemo(() => {
    const list = data?.pendingPrescriptions ?? [];
    const pending = list.filter((r) => r.status === 'PENDING').length;
    const verified = list.filter((r) => r.status === 'VERIFIED').length;
    return { pending, verified, total: list.length };
  }, [data]);

  const pendingPreview = useMemo(() => {
    const list = data?.pendingPrescriptions ?? [];
    return list
      .filter((r) => r.status === 'PENDING')
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        label: r.items.map((i) => `${i.productName} ×${i.quantity}`).join(' · '),
      }));
  }, [data]);

  const posBranchLine = useMemo(() => {
    const rows = posData?.recentSales ?? [];
    const s = rows[0];
    if (!s) return '';
    return `${s.branchName} · Branch ${s.branchId.slice(0, 8)}…`;
  }, [posData]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <motion.div
        className="mb-6"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <span className="mb-3 inline-block rounded-full bg-teal px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
          {isTechnician ? 'Technician desk' : 'Clinical desk'}
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-content-primary">
          {isTechnician ? 'Preparation hub' : 'Safety & compliance'}
        </h1>
        <p className="mt-1 font-medium text-content-secondary">
          {isTechnician
            ? 'Your dispensing queue and preparation tasks.'
            : 'Approve dispensations — counts sync from GraphQL when your role allows.'}
        </p>
      </motion.div>

      <div className="mb-6 flex flex-col gap-4">
        <AiCopilotBanner role={user.role} />
        <DashboardMarketPulseFootprint />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading && canQueue ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : (
          [
            {
              label: 'Rx in pipeline',
              value: canQueue ? String(stats.total) : '—',
              color: 'var(--color-teal)',
              icon: Activity,
            },
            {
              label: 'Pending review',
              value: canQueue ? String(stats.pending) : '—',
              color: '#d97706',
              icon: AlertTriangle,
            },
            {
              label: 'Verified (prep)',
              value: canQueue ? String(stats.verified) : '—',
              color: '#2563eb',
              icon: CheckCircle2,
            },
            {
              label: 'Compliance focus',
              value: canQueue ? 'Live' : 'N/A',
              color: '#16a34a',
              icon: ShieldAlert,
            },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-card p-5 shadow-[0_4px_16px_rgba(0,109,119,0.06)]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Icon size={16} style={{ color: kpi.color }} />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-content-muted">{kpi.label}</p>
                </div>
                <p className="font-mono text-3xl font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {!isTechnician && (
          <motion.div
            className="rounded-[28px] border-b-8 border-b-amber-500 bg-surface-card p-6 shadow-[0_12px_40px_rgba(0,109,119,0.08)] transition-all hover:-translate-y-1 sm:p-8 flex flex-col"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-content-primary">Rx workflow</h2>
                <p className="text-sm font-medium text-content-muted">
                  {canQueue ? `${stats.pending} pending in API` : 'Open prescriptions workspace for detail.'}
                </p>
              </div>
            </div>

            {canQueue && (
              <div className="mb-4 rounded-xl bg-surface-base/50 p-2">
                <RxStatusChart 
                  pending={stats.pending} 
                  verified={stats.verified} 
                  completed={Math.max(0, stats.total - stats.pending - stats.verified)} 
                  height={120} 
                />
              </div>
            )}

            <div className="mb-4 space-y-3 flex-1">
              {canQueue && pendingPreview.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-content-muted">Priority queue</p>
                  {pendingPreview.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between gap-4 rounded-2xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/30 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="font-mono text-xs font-bold text-teal">RX-{item.id.slice(0, 8).toUpperCase()}…</div>
                        <div className="mt-1 text-sm font-bold text-content-primary">{item.label}</div>
                      </div>
                      <Link
                        href="/dashboard/prescriptions"
                        className="rounded-xl bg-teal px-5 py-2.5 text-center text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,109,119,0.3)] transition-all focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 active:scale-95"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-content-muted">
                  {canQueue ? 'No pending Rx — great work.' : 'Open the prescriptions workspace for the full queue.'}
                </p>
              )}
            </div>

            <Link
              href="/dashboard/prescriptions"
              className="flex items-center gap-2 text-sm font-bold text-teal hover:underline mt-auto pt-2"
            >
              <ClipboardList size={14} aria-hidden />
              View full workspace →
            </Link>
          </motion.div>
        )}

        <motion.div
          className="relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-teal p-6 text-white shadow-[0_12px_40px_rgba(0,109,119,0.3)] sm:p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Pill className="absolute -bottom-8 -right-8 h-64 w-64 rotate-45 text-white opacity-10" aria-hidden />

          <div className="relative z-10">
            <h2 className="mb-2 text-2xl font-bold">{isTechnician ? 'Dispensing queue' : 'Drug operations'}</h2>
            <p className="mb-8 font-medium leading-relaxed text-teal-100">
              {isTechnician
                ? 'Technicians: API read for verified Rx is on the roadmap — coordinate with pharmacists for now.'
                : 'Verify in Clinical, prepare in Dispensing, settle in POS — all tied to the same prescription IDs.'}
            </p>
          </div>

          <div className="relative z-10 space-y-3">
            <Link
              href="/dashboard/inventory"
              className="group flex w-full items-center justify-between rounded-2xl bg-surface-card/15 p-4 font-bold text-white shadow-xl backdrop-blur-sm transition-all hover:bg-surface-card/25 active:scale-95"
            >
              <div className="flex items-center gap-3">
                <Package size={20} aria-hidden />
                <span>Inventory &amp; stocking</span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card/20 transition-transform group-hover:translate-x-1">
                →
              </div>
            </Link>
            <Link
              href="/dashboard/dispensing"
              className="group flex w-full items-center justify-between rounded-2xl bg-surface-card p-4 font-bold text-teal shadow-xl transition-all hover:bg-surface-hover active:scale-95"
            >
              <div className="flex items-center gap-3">
                <FlaskConical size={20} aria-hidden />
                <span>Open dispensing queue</span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 transition-transform group-hover:translate-x-1">
                →
              </div>
            </Link>
            {!isTechnician && (
              <Link
                href="/dashboard/prescriptions"
                className="group flex w-full items-center justify-between rounded-2xl bg-surface-card/15 p-4 font-bold text-white shadow-xl backdrop-blur-sm transition-all hover:bg-surface-card/25 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <Search size={20} aria-hidden />
                  <span>Search & verify Rx</span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-card/20 transition-transform group-hover:translate-x-1">
                  →
                </div>
              </Link>
            )}
          </div>
        </motion.div>

        {isTechnician && (
          <motion.div
            className="rounded-[28px] border-b-8 border-b-indigo-500 bg-surface-card p-6 shadow-[0_12px_40px_rgba(0,109,119,0.08)] transition-all hover:-translate-y-1 sm:p-8"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                <FlaskConical size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-content-primary">Today&apos;s prep</h2>
                <p className="text-sm font-medium text-content-muted">Watch the dispensing queue for verified Rx.</p>
              </div>
            </div>
            <Link
              href="/dashboard/dispensing"
              className="flex items-center gap-2 text-sm font-bold text-teal hover:underline"
            >
              <FlaskConical size={14} aria-hidden />
              Go to dispensing queue →
            </Link>
          </motion.div>
        )}
      </div>

      {showPosFeed && (
        <motion.div
          className="mt-8 rounded-[28px] border border-surface-border bg-surface-card p-6 shadow-[0_12px_40px_rgba(0,109,119,0.08)] sm:p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal/10 text-teal shadow-inner">
                <Receipt size={24} aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold text-content-primary">Your recent POS checkouts</h2>
                <p className="mt-1 text-sm font-medium text-content-muted">
                  Only sales you rang up (same login as POS). Supervisors use Sales for the full branch. Rx counters above
                  stay prescription-only.
                </p>
                {posBranchLine ? (
                  <p className="mt-1 text-xs font-medium text-content-secondary">{posBranchLine}</p>
                ) : null}
              </div>
            </div>
            <Link
              href="/dashboard/transactions"
              className="shrink-0 text-sm font-bold text-teal hover:underline sm:pt-1"
            >
              Open Sales →
            </Link>
          </div>

          {posLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : (posData?.recentSales ?? []).length === 0 ? (
            <p className="text-sm text-content-muted">No completed checkouts in the recent window yet.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {(posData?.recentSales ?? []).map((sale) => (
                <li key={sale.id}>
                  <Link
                    href={`/dashboard/transactions/${sale.id}`}
                    className="flex flex-col gap-1 py-3 transition-colors hover:bg-surface-base/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:rounded-xl sm:px-2"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-teal">…{sale.id.slice(0, 8)}</span>
                      <p className="mt-1 line-clamp-2 text-xs text-content-secondary" title={posLinePreview(sale.items)}>
                        {posLinePreview(sale.items)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm">
                      <span className="text-content-muted">{accraTimeShort(sale.soldAt ?? sale.createdAt)}</span>
                      <span className="font-mono font-bold text-content-primary">
                        {formatGhs(sale.totalPesewas / 100)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </div>
  );
}
