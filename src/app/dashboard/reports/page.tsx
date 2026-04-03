'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { formatGhs, compactGhsLabel } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth.store';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { ReportsRevenueVisual } from '@/components/dashboard/executive/reports-revenue-visual';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { REPORTS_DASHBOARD } from '@/lib/graphql/reports.queries';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';

type Period = '7d' | '30d' | '90d';
const DAYS_BY_PERIOD: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Calendar YYYY-MM-DD in Africa/Accra — matches how sales/revenue are stored for the branch. */
function fmtAccraDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
}

function getRanges(period: Period): { start: string; end: string; prevStart: string; prevEnd: string } {
  const days = DAYS_BY_PERIOD[period];
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  const prevEnd = new Date(start);
  prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - (days - 1));

  return {
    start: fmtAccraDate(start),
    end: fmtAccraDate(end),
    prevStart: fmtAccraDate(prevStart),
    prevEnd: fmtAccraDate(prevEnd),
  };
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();
  const [period, setPeriod] = useState<Period>('30d');
  const range = getRanges(period);

  const { data, loading, error } = useQuery(REPORTS_DASHBOARD, {
    variables: {
      periodStart: range.start,
      periodEnd: range.end,
      prevStart: range.prevStart,
      prevEnd: range.prevEnd,
      limit: 8,
    },
    skip: !user,
  });

  const reportsErrorDetail = useMemo(() => formatApolloError(error), [error]);
  const summary = data?.current as
    | {
        totalRevenuePesewas: number;
        salesCount: number;
        vatCollectedPesewas: number;
        refundsPesewas: number;
      }
    | undefined;
  const prev = data?.previous as { totalRevenuePesewas: number } | undefined;
  const topProducts = (data?.topProducts ?? []) as Array<{
    productId: string;
    productName: string;
    unitsSold: number;
    revenuePesewas: number;
    revenueFormatted: string;
  }>;

  const revDelta =
    prev && prev.totalRevenuePesewas > 0 && summary
      ? ((summary.totalRevenuePesewas - prev.totalRevenuePesewas) / prev.totalRevenuePesewas) * 100
      : 0;
  const maxRevenue = topProducts.length ? Math.max(...topProducts.map((p) => p.revenuePesewas)) : 1;

  return (
    <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Reports</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>Sales trends, VAT, and product performance analytics</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.assign('/dashboard/accounting')}
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}
        >
          <Download size={15} />
          Open accounting workspace
        </button>
      </div>

      {user && (
        <div className="mb-6">
          <AiCopilotBanner role={user.role} />
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-lg p-1 w-fit" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="rounded-md px-4 py-1.5 text-xs font-medium transition-colors"
            style={period === p ? { background: 'var(--color-teal)', color: '#fff' } : { color: 'var(--text-secondary)' }}
          >
            {p === '7d' ? 'Last 7 days' : p === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      {loading && <div className="skeleton h-28 rounded-xl mb-6" />}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p className="font-semibold">Failed to load reports</p>
          {reportsErrorDetail ? <p className="mt-1 text-xs opacity-90">{reportsErrorDetail}</p> : null}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 lg:col-span-8 lg:grid-cols-4">
          {[
            { label: 'Total revenue', value: formatGhs((summary?.totalRevenuePesewas ?? 0) / 100), delta: revDelta, up: revDelta >= 0 },
            { label: 'Total sales', value: (summary?.salesCount ?? 0).toLocaleString('en-GH'), delta: null, up: true },
            { label: 'VAT collected', value: formatGhs((summary?.vatCollectedPesewas ?? 0) / 100), delta: null, up: true },
            { label: 'Refunds', value: formatGhs((summary?.refundsPesewas ?? 0) / 100), delta: null, up: false },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-3 [transform-style:preserve-3d] shadow-[0_10px_36px_rgba(0,109,119,0.07)]"
              style={{ border: '1px solid var(--surface-border)', background: 'linear-gradient(155deg, var(--surface-card) 0%, rgba(0,109,119,0.05) 100%)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              <p className="mt-1 font-mono text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
              {card.delta !== null && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold" style={{ color: card.up ? '#16a34a' : '#dc2626' }}>
                  {card.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {card.delta.toFixed(1)}% vs prior
                </p>
              )}
            </motion.div>
          ))}
        </div>
        <motion.div
          className="rounded-2xl border p-4 lg:col-span-4"
          style={{ borderColor: 'var(--surface-border)', background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(45,212,191,0.06) 100%)', boxShadow: '0 12px 40px rgba(0,109,119,0.08)' }}
          initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Revenue vs prior window</p>
          <ReportsRevenueVisual currentPesewas={summary?.totalRevenuePesewas ?? 0} previousPesewas={prev?.totalRevenuePesewas ?? 0} height={132} />
        </motion.div>
      </div>

      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--surface-border)', background: 'linear-gradient(180deg, var(--surface-card) 0%, rgba(0,109,119,0.03) 100%)', boxShadow: 'var(--shadow-card)' }}>
        <h2 className="mb-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Top movers · revenue</h2>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {topProducts.map((product, i) => (
            <motion.div
              key={product.productId || `${product.productName}-${i}`}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex w-[min(100%,220px)] shrink-0 flex-col rounded-2xl border p-3 [perspective:800px]"
              style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)', boxShadow: '0 12px 32px rgba(0,109,119,0.07)' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}>
                  {i + 1}
                </span>
                <PharmaProductVisual productName={product.productName} productId={product.productId} size="sm" />
              </div>
              <p className="line-clamp-2 text-xs font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{product.productName}</p>
              <p className="mt-1 font-mono text-sm font-bold text-teal">{compactGhsLabel(product.revenueFormatted)}</p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{product.unitsSold} units</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-border)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(product.revenuePesewas / maxRevenue) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.06, type: 'spring', stiffness: 70 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #0f766e, #2dd4bf)' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        VAT calculated at 15% (12.5% VAT + 2.5% NHIL) on non-exempt items. Prescription medicines are VAT exempt per Ghana GRA.
        Monthly return due 30th of following month.
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Financial model is branch-scoped and supports both licensed pharmacy and chemical-shop dealership operations.
      </p>
    </div>
  );
}
