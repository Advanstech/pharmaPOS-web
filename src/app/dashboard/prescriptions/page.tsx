'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ClipboardList, CheckCircle2, XCircle, Clock, ShieldAlert,
  Pill, User,
} from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { PENDING_PRESCRIPTIONS, VERIFY_PRESCRIPTION } from '@/lib/graphql/pharmacy.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatAccraDate } from '@/lib/utils';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { Pagination } from '@/components/ui/pagination';

interface RxRow {
  id: string;
  customerId: string;
  prescriberLicenceNo: string;
  prescriberName: string;
  prescribedDate: string;
  expiryDate: string;
  status: string;
  approvalCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    dosageInstructions?: string | null;
  }>;
}

function shortId(uuid: string) {
  return uuid.slice(0, 8).toUpperCase();
}

const STATUS_UI: Record<
  string,
  { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  PENDING: { label: 'Pending review', bg: 'rgba(217,119,6,0.1)', text: '#92400e', icon: Clock },
  VERIFIED: { label: 'Verified', bg: 'rgba(22,163,74,0.1)', text: '#15803d', icon: CheckCircle2 },
  DISPENSED: { label: 'Dispensed', bg: 'rgba(37,99,235,0.1)', text: '#1d4ed8', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', bg: 'rgba(220,38,38,0.1)', text: '#b91c1c', icon: XCircle },
};

export default function PrescriptionsPage() {
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const canVerify = user && ['head_pharmacist', 'pharmacist'].includes(user.role);

  const { data, loading, refetch } = useQuery<{ pendingPrescriptions: RxRow[] }>(PENDING_PRESCRIPTIONS, {
    skip: !user,
    pollInterval: 60_000,
  });

  const [verifyRx] = useMutation(VERIFY_PRESCRIPTION, {
    onCompleted: () => {
      setBusyId(null);
      void refetch();
    },
    onError: (e) => {
      setBusyId(null);
      setActionError(e.message);
    },
  });

  const list = data?.pendingPrescriptions ?? [];

  const filtered = useMemo(() => {
    return list.filter((rx) => {
      const drugLine = rx.items.map((i) => i.productName).join(' ');
      const matchSearch =
        rx.id.toLowerCase().includes(search.toLowerCase()) ||
        drugLine.toLowerCase().includes(search.toLowerCase()) ||
        rx.customerId.toLowerCase().includes(search.toLowerCase()) ||
        rx.prescriberName.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'pending') return rx.status === 'PENDING';
      if (filter === 'verified') return rx.status === 'VERIFIED';
      return true;
    });
  }, [list, search, filter]);

  const pendingCount = list.filter((r) => r.status === 'PENDING').length;

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filter or search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [filter, search]);

  async function onVerify(prescriptionId: string) {
    setActionError('');
    setBusyId(prescriptionId);
    await verifyRx({ variables: { input: { prescriptionId } } });
  }

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <motion.div
        className="mb-6"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <span className="mb-3 inline-block rounded-full bg-teal px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm">
          Clinical
        </span>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Prescriptions
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Live queue from GraphQL <code className="text-xs font-mono">pendingPrescriptions</code> — verify against GMDC on each action.
        </p>
      </motion.div>

      {user && (
        <div className="mb-6">
          <AiCopilotBanner role={user.role} />
        </div>
      )}

      {actionError && (
        <motion.div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'rgba(220,38,38,0.25)',
            background: 'rgba(220,38,38,0.06)',
            color: '#b91c1c',
          }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{actionError}</span>
        </motion.div>
      )}

      <div className="mb-6 space-y-2">
        {pendingCount > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium"
            style={{ background: 'rgba(217,119,6,0.08)', color: '#92400e', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            <ShieldAlert size={16} aria-hidden />
            <span>
              {pendingCount} prescription{pendingCount !== 1 ? 's' : ''} awaiting review
            </span>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchFieldWithClear
          wrapperClassName="min-w-48 flex-1"
          value={search}
          onValueChange={setSearch}
          iconSize={15}
          type="text"
          placeholder="Search Rx, prescriber, customer ID…"
          className="w-full rounded-xl py-2.5 pl-9 pr-10 text-sm outline-none transition-shadow focus:ring-2 focus:ring-teal/30"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
        />
        <div className="flex gap-1 rounded-xl p-1" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
          {(['all', 'pending', 'verified'] as const).map((f) => (
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
              {f === 'pending' ? `Pending (${pendingCount})` : f === 'verified' ? 'Verified' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-36 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {paginatedItems.map((rx, i) => {
              const config = STATUS_UI[rx.status] ?? STATUS_UI.PENDING;
              const StatusIcon = config.icon;
              const drugSummary = rx.items.map((it) => `${it.productName} ×${it.quantity}`).join(' · ');

              return (
                <motion.div
                  key={rx.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                  className="group rounded-2xl p-5 transition-all hover:shadow-lg"
                  style={{
                    background: 'var(--surface-card)',
                    border: '2px solid var(--surface-border)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-teal)' }}>
                          RX-{shortId(rx.id)}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: config.bg, color: config.text }}
                        >
                          <StatusIcon size={10} className="mr-1 inline" aria-hidden />
                          {config.label}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                          title="Sign-offs recorded"
                        >
                          Approvals: {rx.approvalCount}
                        </span>
                      </div>
                      <h3 className="mb-1 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        <Pill size={14} className="mr-1.5 inline opacity-50" aria-hidden />
                        {drugSummary}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <User size={12} aria-hidden />
                          Customer {shortId(rx.customerId)}
                        </span>
                        <span>Prescriber: {rx.prescriberName}</span>
                        <span>Licence: {rx.prescriberLicenceNo}</span>
                      </div>
                      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Written {formatAccraDate(rx.prescribedDate)} · Expires {formatAccraDate(rx.expiryDate)}
                      </p>
                    </div>

                    {rx.status === 'PENDING' && canVerify && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busyId === rx.id}
                          onClick={() => void onVerify(rx.id)}
                          className="h-10 rounded-xl bg-teal px-5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_3px_0_0_var(--color-teal-dark)] transition-all hover:bg-teal-dark active:translate-y-[3px] active:shadow-none disabled:opacity-50"
                        >
                          {busyId === rx.id ? 'Verifying…' : 'Verify'}
                        </button>
                      </div>
                    )}
                    {rx.status === 'VERIFIED' && (
                      <div className="flex shrink-0 items-center gap-2 text-sm font-semibold" style={{ color: '#15803d' }}>
                        <CheckCircle2 size={16} aria-hidden />
                        Ready for dispensing
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && !loading && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {list.length === 0 ? 'No prescriptions in the queue for this branch.' : 'No prescriptions match your filter.'}
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="mt-6 rounded-xl overflow-hidden" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
