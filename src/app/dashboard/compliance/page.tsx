'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Download, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { formatAccraDate } from '@/lib/utils';
import { DISPENSING_COMPLIANCE_AUDIT } from '@/lib/graphql/audit.queries';
import { Pagination } from '@/components/ui/pagination';

const TYPE_LABELS: Record<string, string> = {
  POM_WITHOUT_RX: 'POM dispensed without approved Rx',
  EXPIRED_RX_DISPENSED: 'Expired prescription dispensed',
  RX_PDF_MISSING: 'Missing prescription PDF evidence',
  MAJOR_INTERACTION_OVERRIDE: 'Major interaction override',
  CONTRAINDICATED_ATTEMPT: 'Contraindicated combination attempt',
};

export default function CompliancePage() {
  const shouldReduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<'all' | 'violations'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const periodEnd = new Date().toISOString().slice(0, 10);
  const periodStart = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data, loading, error } = useQuery(DISPENSING_COMPLIANCE_AUDIT, {
    variables: { input: { periodStart, periodEnd } },
    fetchPolicy: 'cache-and-network',
    pollInterval: 15_000,
  });

  const errorMessage = useMemo(() => {
    if (!error) return null;
    const gql = error.graphQLErrors?.[0]?.message;
    const net = error.networkError && 'message' in error.networkError ? String(error.networkError.message) : null;
    return gql ?? net ?? error.message ?? 'Unknown error';
  }, [error]);

  const audit = data?.dispensingComplianceAudit;
  const findings = audit?.findings ?? [];
  const entries = filter === 'violations'
    ? findings.filter((e: { severity: string }) => e.severity === 'CRITICAL' || e.severity === 'HIGH')
    : findings;
  const violations = findings.filter((e: { severity: string }) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;

  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const paginatedEntries = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const stats = [
    { label: 'POM without Rx', value: audit?.pomSalesWithoutRxCount ?? 0, icon: ShieldAlert, color: '#dc2626' },
    { label: 'Expired Rx dispensed', value: audit?.expiredRxDispensedCount ?? 0, icon: FileText, color: '#b45309' },
    { label: 'Rx PDF compliance %', value: Math.round(audit?.rxPdfCompliancePct ?? 0), icon: CheckCircle2, color: '#2563eb' },
    { label: 'Violations (high/critical)', value: violations, icon: ShieldCheck, color: '#16a34a' },
  ];

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Compliance</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>Ghana FDA audit trail · GMDC validation log</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}
        >
          <Download size={15} />
          Export for FDA
        </button>
      </div>

      {loading && (
        <div className="mb-4 rounded-lg px-4 py-2.5 text-sm" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-muted)' }}>
          Loading live compliance intelligence...
        </div>
      )}

      {error && (
        <div
          className="mb-4 rounded-lg px-4 py-2.5 text-sm"
          style={{ border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#b91c1c' }}
          role="alert"
        >
          <p className="font-semibold">Could not load compliance report.</p>
          {errorMessage ? (
            <p className="mt-1 text-xs opacity-90" style={{ color: '#7f1d1d' }}>
              {errorMessage}
            </p>
          ) : null}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-4"
              style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} style={{ color: stat.color }} aria-hidden="true" />
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Audit log */}
      <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Audit log</h2>
          <div className="flex gap-1 rounded-lg p-1" style={{ border: '1px solid var(--surface-border)' }}>
            {(['all', 'violations'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors"
                style={filter === f
                  ? { background: 'var(--color-teal)', color: '#fff' }
                  : { color: 'var(--text-secondary)' }}
              >
                {f === 'violations' ? `Violations (${violations})` : 'All events'}
              </button>
            ))}
          </div>
        </div>

        <div>
          {paginatedEntries.map((entry: {
            id: string;
            severity: string;
            category: string;
            title: string;
            description: string;
            detectedAt: string;
          }, i: number) => (
            <motion.div
              key={entry.id}
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-4 px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--surface-border)' }}
            >
              {entry.severity === 'CRITICAL' || entry.severity === 'HIGH'
                ? <XCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#dc2626' }} aria-hidden="true" />
                : <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} aria-hidden="true" />
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={entry.severity === 'CRITICAL' || entry.severity === 'HIGH'
                      ? { background: 'rgba(220,38,38,0.1)', color: '#b91c1c' }
                      : { background: 'rgba(22,163,74,0.1)', color: '#15803d' }}
                  >
                    {TYPE_LABELS[entry.category] ?? entry.title}
                  </span>
                </div>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.description}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {entry.severity} · {formatAccraDate(entry.detectedAt)}
                </p>
              </div>
            </motion.div>
          ))}
          {!loading && paginatedEntries.length === 0 && (
            <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
              No compliance events in this period.
            </div>
          )}
        </div>

        {!loading && entries.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={entries.length}
            itemsPerPage={itemsPerPage}
          />
        )}

        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Audit log is immutable — PostgreSQL RULE prevents UPDATE/DELETE. All times in Africa/Accra (GMT+0).
          </p>
        </div>
      </div>
    </div>
  );
}
