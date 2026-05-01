'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft, RotateCcw, CheckCircle2, XCircle, Clock, AlertTriangle,
  User, Building2, Package, Receipt, Calendar, Hash, Banknote,
  ShieldCheck, Loader2,
} from 'lucide-react';
import { GET_REFUND_REQUEST, APPROVE_REFUND_REQUEST, REJECT_REFUND_REQUEST } from '@/lib/graphql/sales.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { SmartTextarea } from '@/components/ui/smart-textarea';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: typeof Clock }> = {
  PENDING:  { label: 'Pending Approval', bg: 'rgba(234,179,8,0.1)',  color: '#a16207', border: 'rgba(234,179,8,0.3)',  icon: Clock },
  APPROVED: { label: 'Approved & Refunded', bg: 'rgba(22,163,74,0.1)',  color: '#15803d', border: 'rgba(22,163,74,0.3)',  icon: CheckCircle2 },
  REJECTED: { label: 'Rejected',         bg: 'rgba(220,38,38,0.1)',  color: '#dc2626', border: 'rgba(220,38,38,0.3)',  icon: XCircle },
};

function fmt(pesewas: number) {
  return `GH₵ ${(pesewas / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short',
  });
}

export default function RefundDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const user = useAuthStore(s => s.user);
  const canAct = user && ['owner', 'se_admin', 'manager'].includes(user.role);

  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const { data, loading, error, refetch } = useQuery(GET_REFUND_REQUEST, {
    variables: { id: requestId },
    fetchPolicy: 'cache-and-network',
  });

  const [approve, { loading: approving }] = useMutation(APPROVE_REFUND_REQUEST, {
    onCompleted: () => {
      setAction(null);
      setNotes('');
      showToast('success', '✅ Refund approved — sale reversed, stock returned to inventory, GL updated.');
      refetch();
    },
    onError: e => showToast('error', `❌ ${e.message}`),
  });

  const [reject, { loading: rejecting }] = useMutation(REJECT_REFUND_REQUEST, {
    onCompleted: () => {
      setAction(null);
      setNotes('');
      showToast('success', 'Refund request rejected.');
      refetch();
    },
    onError: e => showToast('error', `❌ ${e.message}`),
  });

  const req = data?.refundRequest;
  const processing = approving || rejecting;

  // ── Loading ──
  if (loading && !req) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal" />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading refund request…</p>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (error || !req) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12" style={{ color: '#dc2626' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Refund request not found</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{error?.message ?? 'It may have been deleted or you lack access.'}</p>
          <Link href="/dashboard/transactions" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-teal hover:underline">
            <ArrowLeft size={14} /> Back to Sales
          </Link>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
  const StIcon = st.icon;
  const isPending = req.status === 'PENDING';
  const totalPesewas = req.subtotalPesewas + req.vatPesewas;

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(220,38,38,0.07) 0%, rgba(13,148,136,0.05) 100%)',
        borderBottom: '1px solid var(--surface-border)',
      }}>
        <div className="mx-auto max-w-[1100px] px-4 pb-6 pt-6 md:px-6">
          <Link href="/dashboard/transactions"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
            <ArrowLeft size={13} /> Back to Sales
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(220,38,38,0.1)' }}>
                  <RotateCcw size={18} style={{ color: '#dc2626' }} />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Refund Request
                  </h1>
                  <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{req.id}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  <StIcon size={12} /> {st.label}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Requested by <strong>{req.requestedByName}</strong> · {fmtDate(req.createdAt)}
              </p>
            </div>

            {/* Amount badge */}
            <div className="rounded-2xl px-6 py-3 text-center shrink-0"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Refund Amount</p>
              <p className="text-2xl font-bold font-mono" style={{ color: '#dc2626' }}>{req.saleTotalFormatted}</p>
            </div>
          </div>

          {/* Action buttons */}
          {isPending && canAct && !action && (
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setAction('approve')}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
                <CheckCircle2 size={16} /> Approve &amp; Refund
              </button>
              <button onClick={() => setAction('reject')}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
                <XCircle size={16} /> Reject
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">
        {/* Toast */}
        {toast && (
          <div className="mb-5 rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2"
            style={{
              background: toast.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
              color: toast.type === 'success' ? '#15803d' : '#b91c1c',
            }}>
            {toast.msg}
          </div>
        )}

        {/* Action form */}
        {action && (
          <div className="mb-6 rounded-2xl overflow-hidden"
            style={{
              border: action === 'approve' ? '2px solid rgba(22,163,74,0.3)' : '2px solid rgba(220,38,38,0.3)',
              background: 'var(--surface-card)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}>
            <div className="flex items-center justify-between px-5 py-3"
              style={{
                background: action === 'approve' ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
                borderBottom: '1px solid var(--surface-border)',
              }}>
              <div className="flex items-center gap-2">
                {action === 'approve'
                  ? <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                  : <XCircle size={18} style={{ color: '#dc2626' }} />
                }
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {action === 'approve' ? 'Approve & Execute Refund' : 'Reject Refund Request'}
                </h3>
              </div>
              <button onClick={() => setAction(null)} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-surface-hover"
                style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>

            <div className="p-5 space-y-4">
              {action === 'approve' && (
                <div className="rounded-xl p-3 text-xs space-y-1"
                  style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <p className="font-bold" style={{ color: '#15803d' }}>✅ On approval this will:</p>
                  <ul className="space-y-0.5 ml-2" style={{ color: 'var(--text-secondary)' }}>
                    <li>• Mark sale as REFUNDED</li>
                    <li>• Return {req.saleItemCount} item{req.saleItemCount !== 1 ? 's' : ''} to inventory</li>
                    <li>• Reverse GL entries (revenue, VAT, COGS)</li>
                    <li>• Publish real-time stock update</li>
                    <li>• Log to audit trail</li>
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {action === 'approve' ? 'Notes (optional)' : 'Reason for rejection *'}
                </label>
                <SmartTextarea
                  value={notes}
                  onChange={setNotes}
                  context={action === 'approve' ? 'refund:approval' : 'refund:rejection'}
                  placeholder={action === 'approve' ? 'e.g. Verified with customer — approved' : 'Why is this refund being rejected?'}
                  rows={2}
                  className="w-full rounded-lg border border-surface-border px-3 py-2.5 text-sm bg-[var(--surface-base)] text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                {action === 'approve' ? (
                  <button
                    onClick={() => approve({ variables: { requestId: req.id, notes: notes || undefined } })}
                    disabled={processing}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: '#16a34a' }}
                  >
                    {approving ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><CheckCircle2 size={14} /> Confirm Approval</>}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!notes.trim()) { showToast('error', 'Add a rejection reason before rejecting.'); return; }
                      reject({ variables: { requestId: req.id, notes: notes.trim() } });
                    }}
                    disabled={processing}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: '#dc2626' }}
                  >
                    {rejecting ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : <><XCircle size={14} /> Confirm Rejection</>}
                  </button>
                )}
                <button onClick={() => setAction(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ── Main ── */}
          <div className="space-y-5 lg:col-span-2">

            {/* Request details */}
            <Card title="Request Details" icon={Hash}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
                <Detail icon={User} label="Requested by" value={req.requestedByName} />
                <Detail icon={Calendar} label="Requested on" value={fmtDate(req.createdAt) ?? '—'} />
                <Detail icon={Building2} label="Branch" value={req.branchName ?? '—'} />
                <Detail icon={Receipt} label="Cashier" value={req.cashierName ?? '—'} />
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"
                    style={{ color: 'var(--text-muted)' }}>
                    <AlertTriangle size={11} /> Reason for refund
                  </p>
                  <p className="text-sm rounded-xl px-3 py-2.5"
                    style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--text-primary)' }}>
                    {req.reason}
                  </p>
                </div>
              </div>
            </Card>

            {/* Sale items */}
            <Card title={`Sale Items (${req.saleItemCount})`} icon={Package}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--surface-base)', borderBottom: '1px solid var(--surface-border)' }}>
                      <th className="px-4 py-2.5 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Product</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Qty</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Unit Price</th>
                      <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(req.items ?? []).map((item: any, i: number) => (
                      <tr key={item.productId + i} style={{ borderTop: '1px solid var(--surface-border)' }}>
                        <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.productName}
                          {item.vatExempt && <span className="ml-1.5 text-[9px] font-bold rounded-full px-1.5 py-0.5"
                            style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)' }}>VAT exempt</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{fmt(item.unitPricePesewas)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {fmt(item.unitPricePesewas * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                      <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Subtotal</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(req.subtotalPesewas)}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                      <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-bold" style={{ color: 'var(--text-muted)' }}>VAT (15%)</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>{fmt(req.vatPesewas)}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                      <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total to Refund</td>
                      <td className="px-4 py-2.5 text-right font-mono text-base font-bold" style={{ color: '#dc2626' }}>{req.saleTotalFormatted}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Review details (if reviewed) */}
            {req.status !== 'PENDING' && (
              <Card title={req.status === 'APPROVED' ? 'Approval Details' : 'Rejection Details'}
                icon={req.status === 'APPROVED' ? CheckCircle2 : XCircle}>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
                  <Detail icon={User} label={req.status === 'APPROVED' ? 'Approved by' : 'Rejected by'} value={req.reviewedByName ?? '—'} />
                  <Detail icon={Calendar} label={req.status === 'APPROVED' ? 'Approved on' : 'Rejected on'} value={fmtDate(req.reviewedAt) ?? '—'} />
                  {req.reviewNotes && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Review notes</p>
                      <p className="text-sm rounded-xl px-3 py-2.5"
                        style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}>
                        {req.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Timeline */}
            <Card title="Timeline" icon={Clock}>
              <div className="p-5 space-y-0">
                <TimelineItem
                  icon={<RotateCcw size={13} style={{ color: '#dc2626' }} />}
                  title="Refund requested"
                  sub={req.requestedByName}
                  date={fmtDate(req.createdAt)}
                  isLast={req.status === 'PENDING'}
                />
                {req.status === 'PENDING' && (
                  <TimelineItem
                    icon={<Clock size={13} style={{ color: '#d97706' }} />}
                    title="Awaiting manager approval"
                    sub="Pending review"
                    date={null}
                    isLast
                    muted
                  />
                )}
                {req.status === 'APPROVED' && (
                  <TimelineItem
                    icon={<CheckCircle2 size={13} style={{ color: '#16a34a' }} />}
                    title="Approved & refunded"
                    sub={req.reviewedByName ?? ''}
                    date={fmtDate(req.reviewedAt)}
                    isLast
                  />
                )}
                {req.status === 'REJECTED' && (
                  <TimelineItem
                    icon={<XCircle size={13} style={{ color: '#dc2626' }} />}
                    title="Rejected"
                    sub={req.reviewedByName ?? ''}
                    date={fmtDate(req.reviewedAt)}
                    isLast
                  />
                )}
              </div>
            </Card>

            {/* What happens on approval */}
            {isPending && (
              <Card title="On Approval" icon={ShieldCheck}>
                <ul className="p-4 space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {[
                    'Sale marked as REFUNDED',
                    `${req.saleItemCount} item${req.saleItemCount !== 1 ? 's' : ''} returned to inventory`,
                    'GL entries reversed (revenue, VAT, COGS)',
                    'Real-time stock update published',
                    'Audit trail entry created',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Quick links */}
            <Card title="Quick Links" icon={Receipt}>
              <div className="p-4 space-y-2">
                <Link href={`/dashboard/transactions/${req.saleId}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all hover:scale-[1.01]"
                  style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
                  <Receipt size={13} /> View original sale
                </Link>
                <Link href="/dashboard/transactions"
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all hover:scale-[1.01]"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}>
                  <ArrowLeft size={13} /> All sales
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <Icon size={14} style={{ color: 'var(--color-teal)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        <Icon size={10} /> {label}
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function TimelineItem({ icon, title, sub, date, isLast, muted }: {
  icon: React.ReactNode; title: string; sub: string; date: string | null; isLast: boolean; muted?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="rounded-full p-1.5" style={{ background: 'var(--surface-base)' }}>{icon}</div>
        {!isLast && <div className="w-px flex-1 my-1" style={{ background: 'var(--surface-border)' }} />}
      </div>
      <div className={isLast ? 'pb-0' : 'pb-4'}>
        <p className="text-sm font-semibold" style={{ color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}>{title}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        {date && <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{date}</p>}
      </div>
    </div>
  );
}
