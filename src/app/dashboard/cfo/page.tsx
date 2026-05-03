'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, TrendingUp, TrendingDown, AlertTriangle,
  Lightbulb, Activity, DollarSign, BarChart3, CheckCircle2, Download, Mail,
} from 'lucide-react';
import { CFO_BRIEFING } from '@/lib/graphql/accounting.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { cn, formatGhs } from '@/lib/utils';
import { buildCfoPdfHtml, exportPrintablePdf, openMailClient } from '@/lib/reports/pdf-export';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CfoAlert {
  severity: string;
  title?: string;
  message: string;
  action?: string;
}

interface KeyRatio {
  name: string;
  value: string;
  benchmark: string;
  status: string;
  interpretation: string;
}

interface Investment {
  type: string;
  title: string;
  rationale: string;
  estimatedRoi12MonthPct: number;
  estimatedInvestmentFormatted: string;
  paybackMonths: number;
  urgency: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function alertColor(level: string) {
  return {
    CRITICAL: 'border-red-200 bg-red-50 text-red-800',
    WARNING: 'border-amber-200 bg-amber-50 text-amber-800',
    INFO: 'border-blue-200 bg-blue-50 text-blue-800',
    SUCCESS: 'border-green-200 bg-green-50 text-green-800',
  }[level] ?? 'border-gray-200 bg-surface-hover text-gray-700';
}

function alertIcon(level: string) {
  if (level === 'CRITICAL' || level === 'WARNING') return <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />;
  if (level === 'SUCCESS') return <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />;
  return <Activity size={14} className="mt-0.5 flex-shrink-0" />;
}

function ratioStatusColor(status: string) {
  return {
    ABOVE_BENCHMARK: 'text-green-600 bg-green-50',
    AT_BENCHMARK: 'text-amber-600 bg-amber-50',
    BELOW_BENCHMARK: 'text-red-600 bg-red-50',
  }[status] ?? 'text-gray-600 bg-surface-hover';
}

function trendIcon(signal: string) {
  if (signal === 'GROWING') return <TrendingUp size={16} className="text-green-600" />;
  if (signal === 'DECLINING') return <TrendingDown size={16} className="text-red-500" />;
  return <Activity size={16} className="text-amber-500" />;
}

function priorityColor(p: string) {
  return {
    IMMEDIATE: 'bg-red-100 text-red-700',
    WITHIN_3_MONTHS: 'bg-amber-100 text-amber-700',
    WITHIN_6_MONTHS: 'bg-yellow-100 text-yellow-700',
    MONITOR: 'bg-gray-100 text-gray-600',
  }[p] ?? 'bg-gray-100 text-gray-600';
}

function healthScoreColor(score: number) {
  if (score >= 75) return { ring: '#16a34a', text: 'text-green-600' };
  if (score >= 50) return { ring: '#f59e0b', text: 'text-amber-600' };
  if (score >= 25) return { ring: '#f97316', text: 'text-orange-600' };
  return { ring: '#dc2626', text: 'text-red-600' };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CfoPage() {
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  const { data, loading, error } = useQuery(CFO_BRIEFING, {
    skip: !user,
    pollInterval: 0,
  });

  const errorDetail = useMemo(() => formatApolloError(error), [error]);
  const briefing = data?.cfoBriefing;

  function handleExportPdf(): void {
    if (!briefing) return;
    const html = buildCfoPdfHtml(briefing as Record<string, any>);
    exportPrintablePdf(
      'Virtual CFO Briefing',
      'Financial intelligence and investment signals for leadership decisions',
      html,
    );
  }

  function handleShareMail(): void {
    if (!briefing) return;
    const alerts = ((briefing.alerts as CfoAlert[]) ?? []).slice(0, 4);
    const recommendations = (((briefing.investmentIntelligence as { recommendations?: unknown[] })?.recommendations ?? []) as unknown[]).length;
    const body = [
      'Azzay Pharmacy Pro - CFO Briefing',
      `Generated: ${new Date(briefing.generatedAt as string).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}`,
      '',
      `Health score: ${briefing.healthScoreNumeric}/100`,
      `Month revenue: ${briefing.monthRevenueFormatted}`,
      `Cash runway: ${Math.round((briefing.workingCapital?.cashRunwayDays as number) ?? 0)} days`,
      '',
      'Executive summary:',
      `${briefing.executiveSummary as string}`,
      '',
      'Top alerts:',
      ...alerts.map((a) => `- [${a.severity}] ${a.title ?? 'Alert'}: ${a.message}${a.action ? ` | Action: ${a.action}` : ''}`),
      '',
      `Investment recommendations: ${recommendations}`,
      '',
      'Please see attached/printed PDF briefing for full details.',
    ].join('\n');
    openMailClient('Azzay Pharmacy CFO Briefing - Decision Report', body);
  }

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-teal)]">
          <BrainCircuit size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Virtual CFO Briefing</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Financial intelligence · Investment signals · Real-time health score
          </p>
        </div>
        {briefing && (
          <div className="ml-auto flex items-center gap-2">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Generated {new Date(briefing.generatedAt as string).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}
            </p>
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}
            >
              <Download size={13} />
              Export PDF
            </button>
            <button
              onClick={handleShareMail}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ border: '1px solid rgba(0,109,119,0.25)', background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)' }}
            >
              <Mail size={13} />
              Share email
            </button>
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-48 rounded-xl" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <AlertTriangle size={14} className="mr-2 inline" aria-hidden />
          <span className="font-semibold">Could not load CFO briefing.</span>
          {errorDetail ? (
            <p className="mt-2 text-xs opacity-90">{errorDetail}</p>
          ) : null}
        </div>
      )}

      {briefing && (
        <AnimatePresence mode="wait">
          <motion.div
            key="briefing"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Health score + KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <HealthScoreCard score={briefing.healthScoreNumeric as number} />
              <KpiCard
                label="Cash runway"
                value={briefing.workingCapital?.cashRunwayDays as number ?? 0}
                format={(n) => `${Math.round(n)} days`}
                icon={<DollarSign size={16} />}
              />
              <KpiCard
                label="Revenue this month"
                value={(briefing.monthRevenuePesewas as number ?? 0) / 100}
                format={(n) => formatGhs(n)}
                delta={briefing.revenueIntelligence?.momGrowthPct as number}
                icon={<TrendingUp size={16} />}
              />
              <KpiCard
                label="Investment signals"
                value={((briefing.investmentIntelligence as { recommendations?: unknown[] })?.recommendations ?? []).length}
                icon={<Lightbulb size={16} />}
              />
            </div>

            {/* Executive summary */}
            <div className="rounded-xl p-5"
              style={{ border: '1px solid var(--color-teal-light)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-3 flex items-center gap-2">
                <BrainCircuit size={16} style={{ color: 'var(--color-teal)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Executive Summary</h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {briefing.executiveSummary as string}
              </p>
            </div>

            {/* Two-column: alerts + revenue intelligence */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* CFO Alerts */}
              <div className="rounded-xl p-5"
                style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
                <div className="mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} style={{ color: '#d97706' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CFO Alerts</h2>
                </div>
                <div className="space-y-2">
                  {((briefing.alerts as CfoAlert[]) ?? []).length === 0 && (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No alerts — all financial indicators healthy.</p>
                  )}
                  {((briefing.alerts as CfoAlert[]) ?? []).map((alert, i) => (
                    <motion.div
                      key={i}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn('flex items-start gap-2 rounded-lg border p-3 text-xs', alertColor(alert.severity))}
                    >
                      {alertIcon(alert.severity)}
                      <div>
                        {alert.title && <p className="font-semibold mb-0.5">{alert.title}</p>}
                        <p>{alert.message}</p>
                        {alert.action && <p className="mt-0.5 font-semibold">{alert.action}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Revenue intelligence */}
              <div className="rounded-xl p-5"
                style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 size={16} style={{ color: 'var(--color-teal)' }} />
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue Intelligence</h2>
                </div>
                {briefing.revenueIntelligence && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Trend signal</span>
                      <div className="flex items-center gap-1.5">
                        {trendIcon(briefing.revenueIntelligence.trendSignal as string)}
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {briefing.revenueIntelligence.trendSignal as string}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Next month projection</span>
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {briefing.revenueIntelligence.projectedNextMonthFormatted as string}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Growth rate</span>
                      <span className="font-mono text-sm font-semibold"
                        style={{ color: (briefing.revenueIntelligence.momGrowthPct as number) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {(briefing.revenueIntelligence.momGrowthPct as number) >= 0 ? '+' : ''}
                        {(briefing.revenueIntelligence.momGrowthPct as number).toFixed(1)}%
                      </span>
                    </div>
                    <p className="rounded-lg p-3 text-xs leading-relaxed" style={{ background: 'var(--surface-base)', color: 'var(--text-secondary)' }}>
                      {briefing.revenueIntelligence.insight as string}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Key financial ratios */}
            <div className="rounded-xl border border-gray-100 bg-surface-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Activity size={16} className="text-[var(--color-teal)]" />
                <h2 className="text-sm font-semibold text-gray-900">Key Financial Ratios</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {((briefing.keyRatios as KeyRatio[]) ?? []).map((ratio, i) => (
                  <motion.div
                    key={ratio.name}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-lg border border-gray-100 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-medium text-gray-600">{ratio.name}</p>
                      <span className={cn('rounded px-1.5 py-0.5 text-xs font-semibold', ratioStatusColor(ratio.status))}>
                        {ratio.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-lg font-bold text-gray-900">{ratio.value}</p>
                    <p className="text-xs text-gray-400">Benchmark: {ratio.benchmark}</p>
                    <p className="mt-1 text-xs text-gray-500">{ratio.interpretation}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Investment intelligence */}
            {briefing.investmentIntelligence &&
              ((briefing.investmentIntelligence as { recommendations?: unknown[] }).recommendations ?? []).length > 0 && (
              <div className="rounded-xl border border-[var(--color-gold-surface)] bg-[var(--color-gold-surface)] p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Lightbulb size={16} className="text-[var(--color-gold)]" />
                  <h2 className="text-sm font-semibold text-gray-900">Investment Intelligence</h2>
                  <span className="ml-auto rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-xs font-semibold text-white">
                    {((briefing.investmentIntelligence as { recommendations?: unknown[] }).recommendations ?? []).length} signal{((briefing.investmentIntelligence as { recommendations?: unknown[] }).recommendations ?? []).length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {((briefing.investmentIntelligence as { recommendations: Investment[] }).recommendations ?? []).map((rec, i) => (
                    <InvestmentCard key={i} rec={rec} index={i} shouldReduceMotion={shouldReduceMotion ?? false} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HealthScoreCard({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const { ring, text } = healthScoreColor(score);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-surface-card p-5 shadow-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Health score</p>
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={ring}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center font-mono text-xl font-bold', text)}>
          {score}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-400">out of 100</p>
    </div>
  );
}

function InvestmentCard({
  rec, index, shouldReduceMotion,
}: {
  rec: Investment;
  index: number;
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-amber-200 bg-surface-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('rounded px-1.5 py-0.5 text-xs font-semibold', priorityColor(rec.urgency))}>
              {rec.urgency}
            </span>
            <span className="text-xs text-gray-400">{rec.type.replace(/_/g, ' ')}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-900">{rec.title}</p>
          <p className="mt-1 text-xs text-gray-600">{rec.rationale}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-mono text-sm font-bold text-green-600">+{rec.estimatedRoi12MonthPct.toFixed(0)}% ROI</p>
          <p className="text-xs text-gray-500">{rec.estimatedInvestmentFormatted}</p>
          <p className="text-xs text-gray-400">{rec.paybackMonths}mo payback</p>
        </div>
      </div>
    </motion.div>
  );
}
