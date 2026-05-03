'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FlaskConical, CheckCircle2, Package, User, Pill } from 'lucide-react';
import { PENDING_PRESCRIPTIONS } from '@/lib/graphql/pharmacy.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatAccraDate } from '@/lib/utils';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { Pagination } from '@/components/ui/pagination';

interface RxRow {
  id: string;
  status: string;
  customerId: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number }>;
  prescriberName: string;
}

function shortId(uuid: string) {
  return uuid.slice(0, 8).toUpperCase();
}

/** Roles that can read the shared pharmacy queue via GraphQL */
const QUEUE_ROLES = ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist'];

export default function DispensingPage() {
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();
  const [filter, setFilter] = useState<'active' | 'done'>('active');
  const [preparedIds, setPreparedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const canQuery = user && QUEUE_ROLES.includes(user.role);

  const { data, loading } = useQuery<{ pendingPrescriptions: RxRow[] }>(PENDING_PRESCRIPTIONS, {
    skip: !canQuery,
    pollInterval: 60_000,
  });

  const verifiedQueue = useMemo(() => {
    const rows = data?.pendingPrescriptions ?? [];
    return rows.filter((r) => r.status === 'VERIFIED');
  }, [data]);

  const displayItems = useMemo(() => {
    const open = verifiedQueue.filter((r) => !preparedIds.has(r.id));
    const done = verifiedQueue.filter((r) => preparedIds.has(r.id));
    if (filter === 'done') return done;
    return open;
  }, [verifiedQueue, preparedIds, filter]);

  const readyCount = verifiedQueue.filter((r) => !preparedIds.has(r.id)).length;
  const doneLocal = preparedIds.size;

  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const paginatedItems = displayItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [filter]);

  const markPrepared = (id: string) => {
    setPreparedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <motion.div
        className="mb-6"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <span className="mb-3 inline-block rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
          Dispensing
        </span>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Preparation queue
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Verified prescriptions from the API. Marking prepared is tracked in-session until a dispense mutation ships.
        </p>
      </motion.div>

      {user && (
        <div className="mb-6">
          <AiCopilotBanner role={user.role} />
        </div>
      )}

      {!canQuery && user?.role === 'technician' && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(37,99,235,0.25)',
            background: 'rgba(37,99,235,0.06)',
            color: 'var(--text-secondary)',
          }}
        >
          Technicians will receive a dedicated <span className="font-mono text-xs">verifiedForDispensing</span> query when the API exposes it.
          Ask a pharmacist to verify Rx first — then items appear for pharmacist-led prep.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Ready to prepare', value: canQuery ? readyCount : '—', color: '#d97706' },
          { label: 'In progress', value: canQuery ? 0 : '—', color: '#2563eb' },
          { label: 'Marked prepared (session)', value: doneLocal, color: '#16a34a' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <p className="mb-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </p>
            <p className="font-mono text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div
        className="mb-6 flex w-fit gap-1 rounded-xl p-1"
        style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}
      >
        {(['active', 'done'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
            style={
              filter === f
                ? { background: 'var(--color-teal)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {f === 'active' ? `Open (${readyCount})` : `Prepared (${doneLocal})`}
          </button>
        ))}
      </div>

      {canQuery && loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {canQuery && !loading && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {paginatedItems.map((rx, i) => {
              const drug = rx.items.map((it) => `${it.productName} ×${it.quantity}`).join(' · ');
              const done = preparedIds.has(rx.id);

              return (
                <motion.div
                  key={rx.id}
                  layout
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: done && filter === 'active' ? 0.6 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                  className="rounded-2xl p-5 transition-all"
                  style={{
                    background: 'var(--surface-card)',
                    border: '2px solid var(--surface-border)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-teal)' }}>
                          RX-{shortId(rx.id)}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: 'rgba(22,163,74,0.1)', color: '#15803d' }}
                        >
                          Verified
                        </span>
                      </div>
                      <div className="mb-1 flex items-center gap-3">
                        <Pill size={14} className="opacity-40" aria-hidden />
                        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                          {drug}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Package size={12} aria-hidden />
                          Branch fulfilment
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} aria-hidden />
                          Customer {shortId(rx.customerId)}
                        </span>
                        <span>{rx.prescriberName}</span>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Received {formatAccraDate(rx.createdAt)}
                      </p>
                    </div>

                    {filter === 'active' && !done && (
                      <button
                        type="button"
                        onClick={() => markPrepared(rx.id)}
                        className="h-10 shrink-0 rounded-xl bg-teal px-5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_3px_0_0_var(--color-teal-dark)] transition-all hover:bg-teal-dark active:translate-y-[3px] active:shadow-none"
                      >
                        <CheckCircle2 size={14} className="mr-1.5 inline" aria-hidden />
                        Mark prepared
                      </button>
                    )}
                    {done && (
                      <div className="flex shrink-0 items-center gap-2 text-sm font-semibold" style={{ color: '#15803d' }}>
                        <CheckCircle2 size={16} aria-hidden />
                        Prepared
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {displayItems.length === 0 && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <FlaskConical size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {filter === 'done'
                  ? 'Nothing marked prepared yet this session.'
                  : 'No verified prescriptions waiting — pharmacists will verify Rx in the clinical workspace.'}
              </p>
            </div>
          )}

          {!loading && displayItems.length > 0 && (
            <div className="mt-6 rounded-xl overflow-hidden" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={displayItems.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
