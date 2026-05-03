'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import {
  ArrowLeft, RotateCcw, CheckCircle2, XCircle, Clock,
  ChevronRight, Receipt,
} from 'lucide-react';
import { REFUND_REQUESTS, MY_REFUND_REQUESTS } from '@/lib/graphql/sales.queries';
import { useAuthStore } from '@/lib/store/auth.store';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: typeof Clock }> = {
  PENDING:  { label: 'Pending',  bg: 'rgba(234,179,8,0.12)', color: '#a16207', icon: Clock },
  APPROVED: { label: 'Approved', bg: 'rgba(22,163,74,0.1)',  color: '#15803d', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', bg: 'rgba(220,38,38,0.1)',  color: '#dc2626', icon: XCircle },
};

type RefundRequest = {
  id: string;
  saleId: string;
  saleTotalFormatted: string;
  reason: string;
  status: string;
  requestedByName: string;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  saleItemCount: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short',
  });
}

const MANAGER_ROLES = ['owner', 'se_admin', 'manager', 'head_pharmacist'];

export default function RefundsPage() {
  const user = useAuthStore(s => s.user);
  const isManager = MANAGER_ROLES.includes(user?.role ?? '');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const { data: mgrData, loading: mgrLoading } = useQuery<{ refundRequests: RefundRequest[] }>(
    REFUND_REQUESTS,
    { fetchPolicy: 'cache-and-network', pollInterval: 30_000, skip: !isManager },
  );

  const { data: myData, loading: myLoading } = useQuery<{ myRefundRequests: RefundRequest[] }>(
    MY_REFUND_REQUESTS,
    { fetchPolicy: 'cache-and-network', pollInterval: 30_000, skip: isManager },
  );

  const loading = isManager ? mgrLoading : myLoading;
  const all = isManager ? (mgrData?.refundRequests ?? []) : (myData?.myRefundRequests ?? []);
  const filtered = filter === 'ALL' ? all : all.filter(r => r.status === filter);

  const counts = {
    ALL: all.length,
    PENDING: all.filter(r => r.status === 'PENDING').length,
    APPROVED: all.filter(r => r.status === 'APPROVED').length,
    REJECTED: all.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.07) 0%, rgba(13,148,136,0.05) 100%)',
        borderBottom: '1px solid var(--surface-border)',
      }}>
        <div className="mx-auto max-w-[1100px] px-4 pb-6 pt-6 md:px-6">
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
            <ArrowLeft size={13} /> Dashboard
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(220,38,38,0.1)' }}>
                  <RotateCcw size={18} style={{ color: '#dc2626' }} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Refund Requests
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {isManager
                  ? 'Review, approve or reject refund requests from your team'
                  : 'Track the status of refund requests you have submitted'}
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => {
              const st = s === 'ALL' ? null : STATUS_CONFIG[s];
              const color = s === 'ALL' ? '#0d9488' : s === 'PENDING' ? '#d97706' : s === 'APPROVED' ? '#16a34a' : '#dc2626';
              return (
                <button key={s} onClick={() => setFilter(s)}
                  className="rounded-2xl p-3 text-left transition-all hover:scale-[1.02]"
                  style={{
                    background: filter === s ? color + '18' : color + '08',
                    border: `1px solid ${filter === s ? color + '40' : color + '18'}`,
                    boxShadow: filter === s ? `0 0 0 2px ${color}30` : undefined,
                  }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {s === 'ALL' ? 'Total' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </span>
                  <p className="text-2xl font-bold mt-0.5" style={{ color }}>{counts[s]}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">
        {/* Filter tabs */}
        <div className="mb-4 flex gap-1 rounded-xl p-1 w-fit"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={filter === s
                ? { background: 'var(--color-teal)', color: '#fff' }
                : { color: 'var(--text-muted)' }}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              {counts[s] > 0 && s !== 'ALL' && (
                <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: filter === s ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                    color: filter === s ? '#fff' : 'var(--text-secondary)',
                  }}>
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="rounded-2xl overflow-x-auto"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>

          {/* Table header */}
          <div className="hidden sm:grid px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '100px 1fr 120px 140px 80px',
              borderBottom: '1px solid var(--surface-border)',
              background: 'var(--surface-base)',
              color: 'var(--text-muted)',
            }}>
            <span>Status</span>
            <span>Request</span>
            <span>Amount</span>
            <span>Date</span>
            <span className="text-right">Action</span>
          </div>

          {loading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <RotateCcw className="mx-auto mb-3 h-10 w-10 opacity-15" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                No {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}refund requests
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {isManager
                  ? 'Requests from cashiers and pharmacists will appear here'
                  : 'Go to a sale and tap “Request Refund” to get started'}
              </p>
            </div>
          )}

          {filtered.map((req, i) => {
            const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
            const StIcon = st.icon;
            return (
              <div key={req.id}
                className="grid items-center gap-3 px-5 py-4 transition-colors hover:bg-[rgba(0,0,0,0.015)]"
                style={{
                  gridTemplateColumns: '100px 1fr 120px 140px 80px',
                  borderTop: i === 0 ? undefined : '1px solid var(--surface-border)',
                }}>

                {/* Status */}
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold w-fit"
                  style={{ background: st.bg, color: st.color }}>
                  <StIcon size={10} /> {st.label}
                </span>

                {/* Request info */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {req.reason}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {isManager && (
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        By <strong>{req.requestedByName}</strong>
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      · {req.saleItemCount} item{req.saleItemCount !== 1 ? 's' : ''}
                    </span>
                    <Link href={`/dashboard/transactions/${req.saleId}`}
                      className="text-[10px] font-mono font-semibold hover:underline"
                      style={{ color: 'var(--color-teal)' }}>
                      <Receipt size={9} className="inline mr-0.5" />
                      {req.saleId.slice(0, 8)}…
                    </Link>
                  </div>
                  {req.reviewedByName && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Reviewed by {req.reviewedByName}
                      {req.reviewNotes ? ` — "${req.reviewNotes}"` : ''}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <span className="font-mono text-sm font-bold" style={{ color: req.status === 'APPROVED' ? '#dc2626' : 'var(--text-primary)' }}>
                  {req.saleTotalFormatted}
                </span>

                {/* Date */}
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {fmtDate(req.createdAt)}
                </span>

                {/* Action */}
                <div className="flex justify-end">
                  <Link href={`/dashboard/refunds/${req.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all hover:scale-105"
                    style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal)', border: '1px solid rgba(0,109,119,0.15)' }}>
                    View <ChevronRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {isManager
            ? 'Auto-refreshes every 30 seconds · Showing all requests for your branch'
            : 'Auto-refreshes every 30 seconds · Showing only your submitted requests'}
        </p>
      </div>
    </div>
  );
}
