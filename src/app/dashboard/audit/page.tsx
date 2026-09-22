'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown,
  Users, Package, FileText, Scale, BadgeCheck, ChevronDown, ChevronRight, Download, Mail,
} from 'lucide-react';
import { INTERNAL_AUDIT_REPORT } from '@/lib/graphql/audit.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { cn } from '@/lib/utils';
import { buildAuditPdfHtml, exportPrintablePdf, openMailClient } from '@/lib/reports/pdf-export';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditFinding {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  regulatoryReference?: string;
  recommendation: string;
  financialImpactFormatted?: string;
  implicatedUserId?: string;
  detectedAt: string;
}

interface StaffAnomaly {
  anomalyType: string;
  description: string;
  occurrenceCount: number;
  riskLevel: string;
}

interface StaffProfile {
  userId: string;
  role: string;
  totalSalesCount: number;
  totalRevenueFormatted: string;
  voidCount: number;
  pomAttemptBlockCount: number;
  riskRating: string;
  riskScore: number;
  summary: string;
  anomalies: StaffAnomaly[];
}

interface RiskMatrixEntry {
  riskTitle: string;
  riskType: string;
  likelihood: string;
  impact: string;
  inherentRisk: string;
  mitigationStatus: string;
  recommendedControl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function severityColor(s: string) {
  return {
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    INFO: 'bg-gray-100 text-gray-700 border-gray-200',
  }[s] ?? 'bg-gray-100 text-gray-700';
}

function riskBadgeColor(r: string) {
  return {
    ESCALATE: 'bg-red-600 text-white',
    INVESTIGATE: 'bg-orange-500 text-white',
    WATCH: 'bg-amber-400 text-amber-900',
    CLEAN: 'bg-green-100 text-green-800',
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-amber-400 text-amber-900',
    LOW: 'bg-green-100 text-green-800',
  }[r] ?? 'bg-gray-100 text-gray-700';
}

function opinionColor(o: string) {
  return {
    UNQUALIFIED: 'text-green-700 bg-green-50 border-green-200',
    QUALIFIED: 'text-amber-700 bg-amber-50 border-amber-200',
    ADVERSE: 'text-red-700 bg-red-50 border-red-200',
    DISCLAIMER: 'text-gray-700 bg-surface-hover border-gray-200',
  }[o] ?? 'text-gray-700 bg-surface-hover';
}

function riskScoreColor(score: number) {
  if (score >= 75) return 'text-red-600';
  if (score >= 50) return 'text-orange-500';
  if (score >= 25) return 'text-amber-500';
  return 'text-green-600';
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  // useState initializer runs client-side only — avoids Next.js 16 prerender warning
  const [periodStart, setPeriodStart] = useState(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return start.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [activeTab, setActiveTab] = useState<
    'overview' | 'dispensing' | 'financial' | 'inventory' | 'tax' | 'staff' | 'risk'
  >('overview');

  const { data, loading, error, refetch } = useQuery(INTERNAL_AUDIT_REPORT, {
    variables: { input: { periodStart, periodEnd } },
    skip: !user,
  });

  const report = data?.internalAuditReport;

  function handleExportPdf(): void {
    if (!report) return;
    const html = buildAuditPdfHtml(report as Record<string, any>);
    exportPrintablePdf(
      'Internal Audit Report',
      `Audit period ${periodStart} to ${periodEnd} · Financial, compliance, and staff intelligence`,
      html,
    );
  }

  function handleShareMail(): void {
    if (!report) return;
    const topFindings = ((report.allFindings as AuditFinding[]) ?? []).slice(0, 5);
    const body = [
      'Azzay Pharmacy Pro - Internal Audit Report',
      `Period: ${periodStart} to ${periodEnd}`,
      '',
      `Overall risk score: ${report.overallRiskScore}/100 (${report.overallRiskRating})`,
      `Critical findings: ${report.criticalFindingsCount}`,
      `Total findings: ${report.totalFindingsCount}`,
      `Financial exposure: ${report.totalFinancialExposureFormatted}`,
      '',
      `Auditor opinion: ${report.auditorOpinion}`,
      `${report.opinionNarrative}`,
      '',
      'Top findings:',
      ...topFindings.map((f) => `- [${f.severity}] ${f.title}: ${f.recommendation}`),
      '',
      'Please review the full exported PDF for details and action plan.',
    ].join('\n');
    openMailClient('Azzay Pharmacy Internal Audit - Decision Report', body);
  }

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-[var(--color-teal)]" />
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Internal Audit Report</h1>
          </div>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Financial police · Compliance watchdog · Staff intelligence
          </p>
        </div>

        {/* Period picker */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-[var(--color-teal)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-teal-dark)] transition-colors"
          >
            Run audit
          </button>
          {report && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={14} className="mr-2 inline" />
          Failed to load audit report: {error.message}
        </div>
      )}

      {report && (
        <AnimatePresence mode="wait">
          <motion.div
            key="report"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Headline risk cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <RiskScoreCard score={report.overallRiskScore} rating={report.overallRiskRating} />
              <HeadlineCard
                label="Critical findings"
                value={report.criticalFindingsCount}
                icon={<ShieldAlert size={16} />}
                danger={report.criticalFindingsCount > 0}
              />
              <HeadlineCard
                label="Total findings"
                value={report.totalFindingsCount}
                icon={<FileText size={16} />}
              />
              <HeadlineCard
                label="Financial exposure"
                value={report.totalFinancialExposureFormatted}
                icon={<TrendingDown size={16} />}
                danger={report.totalFinancialExposurePesewas > 0}
                isString
              />
            </div>

            {/* Auditor opinion banner */}
            <div className={cn(
              'mb-6 rounded-xl border p-4',
              opinionColor(report.auditorOpinion),
            )}>
              <div className="flex items-start gap-3">
                <BadgeCheck size={18} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Auditor Opinion: {report.auditorOpinion}
                  </p>
                  <p className="mt-1 text-sm">{report.opinionNarrative}</p>
                  {report.immediateActionPlan !== 'No immediate actions required. Schedule next audit in 30 days.' && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide opacity-70">
                        Immediate action plan
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">
                        {report.immediateActionPlan}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl p-1"
              style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
              {(
                [
                  { key: 'overview', label: 'Overview', icon: <ShieldCheck size={14} /> },
                  { key: 'dispensing', label: 'Dispensing', icon: <FileText size={14} /> },
                  { key: 'financial', label: 'Financial', icon: <Scale size={14} /> },
                  { key: 'inventory', label: 'Inventory', icon: <Package size={14} /> },
                  { key: 'tax', label: 'Tax (GRA)', icon: <BadgeCheck size={14} /> },
                  { key: 'staff', label: 'Staff Intel', icon: <Users size={14} /> },
                  { key: 'risk', label: 'Risk Matrix', icon: <AlertTriangle size={14} /> },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  )}
                  style={activeTab === tab.key
                    ? { background: 'var(--color-teal)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && <OverviewTab report={report} />}
                {activeTab === 'dispensing' && <FindingsSection section={report.dispensingCompliance} title="Ghana FDA Dispensing Compliance" />}
                {activeTab === 'financial' && <FindingsSection section={report.financialIntegrity} title="Financial Integrity" />}
                {activeTab === 'inventory' && <FindingsSection section={report.inventoryIntegrity} title="Inventory Integrity" />}
                {activeTab === 'tax' && <FindingsSection section={report.taxCompliance} title="Ghana GRA Tax Compliance" />}
                {activeTab === 'staff' && <StaffTab profiles={report.staffProfiles} />}
                {activeTab === 'risk' && <RiskMatrixTab matrix={report.riskMatrix} />}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RiskScoreCard({ score, rating }: { score: number; rating: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl p-5"
      style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Risk score</p>
      <div className="relative h-20 w-20">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--surface-border)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={score >= 75 ? '#dc2626' : score >= 50 ? '#f97316' : score >= 25 ? '#f59e0b' : '#16a34a'}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center font-mono text-xl font-bold', riskScoreColor(score))}>
          {score}
        </span>
      </div>
      <span className={cn('mt-2 rounded-full px-2 py-0.5 text-xs font-semibold', riskBadgeColor(rating))}>
        {rating}
      </span>
    </div>
  );
}

function HeadlineCard({
  label, value, icon, danger = false, isString = false,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  danger?: boolean;
  isString?: boolean;
}) {
  return (
    <div className="rounded-xl p-5"
      style={{
        border: danger ? '1px solid rgba(220,38,38,0.25)' : '1px solid var(--surface-border)',
        background: danger ? 'rgba(220,38,38,0.05)' : 'var(--surface-card)',
        boxShadow: 'var(--shadow-card)',
      }}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <span style={{ color: danger ? '#dc2626' : 'var(--color-teal)' }}>{icon}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold" style={{ color: danger ? '#b91c1c' : 'var(--text-primary)' }}>
        {isString ? value : (value as number).toLocaleString('en-GH')}
      </p>
    </div>
  );
}

function OverviewTab({ report }: { report: Record<string, unknown> }) {
  const allFindings = (report.allFindings as AuditFinding[]) ?? [];
  const critical = allFindings.filter((f) => f.severity === 'CRITICAL');
  const high = allFindings.filter((f) => f.severity === 'HIGH');
  const rest = allFindings.filter((f) => f.severity !== 'CRITICAL' && f.severity !== 'HIGH');

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <FindingGroup title="Critical — Immediate Action Required" findings={critical} />
      )}
      {high.length > 0 && (
        <FindingGroup title="High — Action Within 30 Days" findings={high} />
      )}
      {rest.length > 0 && (
        <FindingGroup title="Medium / Low / Info" findings={rest} />
      )}
      {allFindings.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-10 text-center">
          <ShieldCheck size={32} className="text-green-600" />
          <p className="font-semibold text-green-800">No findings for this period</p>
          <p className="text-sm text-green-600">The branch is operating cleanly. Keep it up.</p>
        </div>
      )}
    </div>
  );
}

function FindingsSection({
  section, title,
}: {
  section: { findings: AuditFinding[]; overallStatus?: string; integrityStatus?: string; overallTaxStatus?: string };
  title: string;
}) {
  const status = section.overallStatus ?? section.integrityStatus ?? section.overallTaxStatus ?? '';
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', riskBadgeColor(status))}>
          {status}
        </span>
      </div>
      {section.findings.length === 0 ? (
        <div className="rounded-xl p-6 text-center text-sm"
          style={{ border: '1px solid rgba(22,163,74,0.25)', background: 'rgba(22,163,74,0.05)', color: '#15803d' }}>
          <ShieldCheck size={20} className="mx-auto mb-2" />
          No findings in this section.
        </div>
      ) : (
        <FindingGroup title="" findings={section.findings} />
      )}
    </div>
  );
}

function FindingGroup({ title, findings }: { title: string; findings: AuditFinding[] }) {
  return (
    <div>
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>}
      <div className="space-y-2">
        {findings.map((f, i) => (
          <FindingCard key={f.id} finding={f} index={i} />
        ))}
      </div>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: AuditFinding; index: number }) {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('rounded-xl border p-4', severityColor(finding.severity))}
    >
      <button
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5 rounded px-1.5 py-0.5 text-xs font-bold', severityColor(finding.severity))}>
            {finding.severity}
          </span>
          <div>
            <p className="text-sm font-semibold">{finding.title}</p>
            {finding.financialImpactFormatted && (
              <p className="text-xs opacity-70">Impact: {finding.financialImpactFormatted}</p>
            )}
          </div>
        </div>
        {open ? <ChevronDown size={14} className="mt-1 flex-shrink-0" /> : <ChevronRight size={14} className="mt-1 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t border-current border-opacity-20 pt-3 text-sm">
              <p>{finding.description}</p>
              {finding.regulatoryReference && (
                <p className="text-xs opacity-70">
                  <span className="font-semibold">Regulatory ref:</span> {finding.regulatoryReference}
                </p>
              )}
              <div className="rounded-lg bg-surface-card bg-opacity-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Recommendation</p>
                <p className="mt-1 text-sm">{finding.recommendation}</p>
              </div>
              {finding.implicatedUserId && (
                <p className="text-xs opacity-60">User ID: {finding.implicatedUserId.slice(0, 8)}…</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StaffTab({ profiles }: { profiles: StaffProfile[] }) {
  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Ranked by risk score — highest risk first. Ghana DPA 2012: user IDs only, no names.
      </p>
      {profiles.length === 0 && (
        <div className="rounded-xl p-8 text-center text-sm"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-muted)' }}>
          No staff activity in this period.
        </div>
      )}
      {profiles.map((p, i) => (
        <StaffProfileCard key={p.userId} profile={p} index={i} />
      ))}
    </div>
  );
}

function StaffProfileCard({ profile, index }: { profile: StaffProfile; index: number }) {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl"
      style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
    >
      <button
        className="flex w-full items-center gap-4 p-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {/* Risk score ring */}
        <div className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold',
          profile.riskScore >= 75 ? 'bg-red-100 text-red-700' :
          profile.riskScore >= 50 ? 'bg-orange-100 text-orange-700' :
          profile.riskScore >= 25 ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700',
        )}>
          {profile.riskScore}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{profile.userId.slice(0, 8)}…</p>
            <span className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--surface-border)', color: 'var(--text-secondary)' }}>{profile.role}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', riskBadgeColor(profile.riskRating))}>
              {profile.riskRating}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{profile.summary}</p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.totalSalesCount} sales</p>
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{profile.totalRevenueFormatted}</p>
        </div>

        {open ? <ChevronDown size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t p-4" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                <StatPill label="Voids" value={profile.voidCount} warn={profile.voidCount > 5} />
                <StatPill label="POM blocks" value={profile.pomAttemptBlockCount} warn={profile.pomAttemptBlockCount > 0} />
                <StatPill label="Anomalies" value={profile.anomalies.length} warn={profile.anomalies.length > 0} />
              </div>
              {profile.anomalies.length > 0 && (
                <div className="space-y-2">
                  {profile.anomalies.map((a, i) => (
                    <div key={i} className={cn(
                      'rounded-lg border p-3 text-xs',
                      a.riskLevel === 'HIGH' ? 'border-orange-200 bg-orange-50' : 'border-amber-200 bg-amber-50',
                    )}>
                      <p className="font-semibold">{a.anomalyType.replace(/_/g, ' ')}</p>
                      <p className="mt-0.5 text-gray-600">{a.description}</p>
                      <p className="mt-1 text-gray-500">{a.occurrenceCount} occurrence(s)</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatPill({ label, value, warn }: { label: string; value: number; warn: boolean }) {
  return (
    <div className="rounded-lg p-2" style={{ background: warn ? 'rgba(217,119,6,0.08)' : 'var(--surface-base)' }}>
      <p className="font-mono text-lg font-bold" style={{ color: warn ? '#92400e' : 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function RiskMatrixTab({ matrix }: { matrix: RiskMatrixEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide"
            style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
            <th className="px-4 py-3 text-left">Risk</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-center">Likelihood</th>
            <th className="px-4 py-3 text-center">Impact</th>
            <th className="px-4 py-3 text-center">Inherent risk</th>
            <th className="px-4 py-3 text-left">Control</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} className="last:border-0" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.riskTitle}</td>
              <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{row.riskType}</td>
              <td className="px-4 py-3 text-center">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', riskBadgeColor(row.likelihood))}>
                  {row.likelihood}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', riskBadgeColor(row.impact))}>
                  {row.impact}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', riskBadgeColor(row.inherentRisk))}>
                  {row.inherentRisk}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{row.recommendedControl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
