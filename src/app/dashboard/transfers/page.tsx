'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowLeft, ArrowRight, Plus, Truck, CheckCircle, XCircle, Clock,
  Package, Send, Download as DownloadIcon, AlertTriangle, Search,
} from 'lucide-react';
import Link from 'next/link';
import {
  LIST_STOCK_TRANSFERS, CREATE_STOCK_TRANSFER, BRANCHES_QUERY,
  APPROVE_STOCK_TRANSFER, RECEIVE_STOCK_TRANSFER, CANCEL_STOCK_TRANSFER,
} from '@/lib/graphql/stock-transfers';
import { SEARCH_PRODUCTS_QUERY } from '@/lib/graphql/products.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { SmartTextarea } from '@/components/ui/smart-textarea';
import { useToast, useConfirm, usePrompt } from '@/components/ui/toast';

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: typeof Clock; label: string }> = {
  PENDING:    { bg: 'rgba(234,179,8,0.12)', color: '#a16207', icon: Clock, label: 'Pending' },
  IN_TRANSIT: { bg: 'rgba(59,130,246,0.1)', color: '#1d4ed8', icon: Truck, label: 'In Transit' },
  RECEIVED:   { bg: 'rgba(22,163,74,0.1)', color: '#15803d', icon: CheckCircle, label: 'Received' },
  CANCELLED:  { bg: 'rgba(220,38,38,0.1)', color: '#dc2626', icon: XCircle, label: 'Cancelled' },
};

export default function StockTransfersPage() {
  const user = useAuthStore(s => s.user);
  const canManage = user && ['owner', 'se_admin', 'manager'].includes(user.role);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const { prompt } = usePrompt();
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(LIST_STOCK_TRANSFERS, {
    variables: statusFilter ? { status: statusFilter } : {},
    fetchPolicy: 'cache-and-network',
  });

  const [approveMutation] = useMutation(APPROVE_STOCK_TRANSFER, { onCompleted: () => refetch() });
  const [receiveMutation] = useMutation(RECEIVE_STOCK_TRANSFER, { onCompleted: () => refetch() });
  const [cancelMutation] = useMutation(CANCEL_STOCK_TRANSFER, { onCompleted: () => refetch() });

  const transfers = (data?.stockTransfers ?? []) as any[];

  const stats = useMemo(() => {
    let pending = 0, inTransit = 0, received = 0;
    for (const t of transfers) {
      if (t.status === 'PENDING') pending++;
      if (t.status === 'IN_TRANSIT') inTransit++;
      if (t.status === 'RECEIVED') received++;
    }
    return { pending, inTransit, received, total: transfers.length };
  }, [transfers]);

  const handleApprove = async (id: string) => {
    const ok = await confirm({ title: 'Approve this transfer?', message: 'Stock will be deducted from the source branch.', confirmLabel: 'Approve & Ship', danger: false });
    if (!ok) return;
    try { await approveMutation({ variables: { transferId: id } }); success('Transfer approved', 'Stock deducted from source branch.'); }
    catch (e: any) { toastError('Failed to approve', e?.message); }
  };

  const handleReceive = async (id: string) => {
    const ok = await confirm({ title: 'Confirm receipt?', message: 'Stock will be added to your branch inventory.', confirmLabel: 'Confirm Receipt' });
    if (!ok) return;
    try { await receiveMutation({ variables: { transferId: id } }); success('Receipt confirmed', 'Stock added to your branch.'); }
    catch (e: any) { toastError('Failed to receive', e?.message); }
  };

  const handleCancel = async (id: string) => {
    const reason = await prompt({ title: 'Cancel transfer', message: 'Provide a reason for cancellation.', placeholder: 'e.g. Wrong products selected', required: true, confirmLabel: 'Cancel Transfer' });
    if (!reason) return;
    try { await cancelMutation({ variables: { transferId: id, reason } }); success('Transfer cancelled'); }
    catch (e: any) { toastError('Failed to cancel', e?.message); }
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(59,130,246,0.06) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1400px] px-4 pt-5 pb-4 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
              </Link>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Inter-Branch Transfers</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Move stock between Azzay Pharmacy branches</p>
            </div>
            {canManage && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}>
                <Plus size={16} /> New Transfer
              </button>
            )}
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: stats.total, color: '#0d9488', onClick: () => setStatusFilter('') },
              { label: 'Pending', value: stats.pending, color: '#d97706', onClick: () => setStatusFilter('PENDING') },
              { label: 'In Transit', value: stats.inTransit, color: '#1d4ed8', onClick: () => setStatusFilter('IN_TRANSIT') },
              { label: 'Received', value: stats.received, color: '#16a34a', onClick: () => setStatusFilter('RECEIVED') },
            ].map(k => (
              <button key={k.label} onClick={k.onClick} className="rounded-2xl p-3 text-left transition-all hover:scale-[1.02]"
                style={{ background: k.color + '08', border: '1px solid ' + k.color + '20' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        {/* Filter */}
        <div className="mb-4 flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          {[
            { key: '', label: 'All' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'IN_TRANSIT', label: 'In Transit' },
            { key: 'RECEIVED', label: 'Received' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
              style={statusFilter === f.key ? { background: '#0d9488', color: '#fff' } : { color: 'var(--text-muted)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Transfer list */}
        <div className="space-y-3">
          {loading && transfers.length === 0 && (
            <div className="text-center py-12"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" /></div>
          )}

          {transfers.length === 0 && !loading && (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <Truck className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No transfers found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Create a transfer to move stock between branches</p>
            </div>
          )}

          {transfers.map((t: any) => {
            const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
            const StIcon = st.icon;
            const isExpanded = expandedId === t.id;
            const isIncoming = t.toBranchId === user?.branch_id;
            const isOutgoing = t.fromBranchId === user?.branch_id;

            return (
              <div key={t.id} className="rounded-2xl overflow-hidden transition-all" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
                {/* Header row */}
                <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(0,0,0,0.015)] transition-colors">
                  {/* Direction indicator */}
                  <div className="rounded-xl p-2" style={{ background: isIncoming ? 'rgba(22,163,74,0.1)' : 'rgba(59,130,246,0.1)' }}>
                    {isIncoming ? <DownloadIcon size={16} style={{ color: '#16a34a' }} /> : <Send size={16} style={{ color: '#3b82f6' }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.fromBranchName}</span>
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.toBranchName}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {t.totalItems} items &bull; {t.totalQuantity} units &bull; by {t.createdByName} &bull; {new Date(t.createdAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>

                  {/* Status */}
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap"
                    style={{ background: st.bg, color: st.color }}>
                    <StIcon size={11} /> {st.label}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--surface-border)' }}>
                    {/* Items */}
                    <div className="px-5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Items</p>
                      <div className="space-y-1.5">
                        {t.items.map((item: any) => (
                          <div key={item.productId} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--surface-base)' }}>
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.productName}</span>
                            <span className="text-xs font-bold font-mono" style={{ color: '#0d9488' }}>x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      {t.notes && (
                        <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>Note: {t.notes}</p>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="px-5 py-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
                      <div className="flex flex-wrap gap-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <span>Created: {new Date(t.createdAt).toLocaleString('en-GH')}</span>
                        {t.approvedAt && <span>Approved: {t.approvedByName} &bull; {new Date(t.approvedAt).toLocaleString('en-GH')}</span>}
                        {t.receivedAt && <span>Received: {t.receivedByName} &bull; {new Date(t.receivedAt).toLocaleString('en-GH')}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.015)' }}>
                      {t.status === 'PENDING' && canManage && (
                        <>
                          <button onClick={() => handleApprove(t.id)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ background: '#16a34a' }}>
                            <CheckCircle size={13} /> Approve & Ship
                          </button>
                          <button onClick={() => handleCancel(t.id)}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                            <XCircle size={13} /> Cancel
                          </button>
                        </>
                      )}
                      {t.status === 'IN_TRANSIT' && isIncoming && (
                        <button onClick={() => handleReceive(t.id)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ background: '#0d9488' }}>
                          <Package size={13} /> Confirm Receipt
                        </button>
                      )}
                      {t.status === 'IN_TRANSIT' && !isIncoming && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Waiting for destination branch to confirm receipt</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Transfer Modal */}
      {showCreate && <CreateTransferModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); refetch(); }} />}
    </div>
  );
}

/* ── Create Transfer Modal ── */
function CreateTransferModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const user = useAuthStore(s => s.user);
  const [toBranchId, setToBranchId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; productName: string; quantity: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch all org branches dynamically — filter out current user's branch
  const { data: branchData } = useQuery(BRANCHES_QUERY, { fetchPolicy: 'cache-and-network' });
  const branches = ((branchData?.branches ?? []) as Array<{ id: string; name: string; type: string }>)
    .filter(b => b.id !== user?.branch_id);

  // Product search using the existing SearchProducts query
  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_PRODUCTS_QUERY, {
    variables: { query: searchQuery, branchId: user?.branch_id ?? '', limit: 8 },
    skip: searchQuery.trim().length < 2,
    fetchPolicy: 'cache-and-network',
  });
  const searchResults = (searchData?.searchProducts ?? []) as Array<{
    id: string; name: string; genericName: string | null;
    inventory: { quantityOnHand: number } | null;
  }>;

  const [createMutation, { loading }] = useMutation(CREATE_STOCK_TRANSFER);

  const addItem = (productId: string, productName: string) => {
    if (items.find(i => i.productId === productId)) return;
    setItems(prev => [...prev, { productId, productName, quantity: 1 }]);
    setSearchQuery('');
  };

  const updateQty = (productId: string, qty: number) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!toBranchId) { setError('Select a destination branch'); return; }
    if (items.length === 0) { setError('Add at least one product'); return; }
    try {
      await createMutation({
        variables: {
          input: {
            toBranchId,
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            notes: notes.trim() || undefined,
          },
        },
      });
      onCreated();
    } catch (e: any) {
      setError(e?.message || 'Failed to create transfer');
    }
  };

  const selectedBranchName = branches.find(b => b.id === toBranchId)?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New Stock Transfer</h2>
            {user?.branchName && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                From: <span className="font-semibold" style={{ color: 'var(--color-teal-dark)' }}>{user.branchName}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Destination branch */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Transfer To
            </label>
            {branches.length === 0 ? (
              <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: 'rgba(180,83,9,0.06)', border: '1px solid rgba(180,83,9,0.2)', color: '#b45309' }}>
                No other branches found in your organisation.
              </div>
            ) : (
              <select
                value={toBranchId}
                onChange={e => setToBranchId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              >
                <option value="">Select destination branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.type === 'chemical' ? '🧪' : '💊'}
                  </option>
                ))}
              </select>
            )}
            {toBranchId && selectedBranchName && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                ✓ Sending to <strong>{selectedBranchName}</strong>
              </p>
            )}
          </div>

          {/* Product search */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Products to Transfer
            </label>

            {/* Added items */}
            {items.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                    <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.productName}
                    </span>
                    <input
                      type="number" min={1} value={item.quantity}
                      onChange={e => updateQty(item.productId, parseInt(e.target.value) || 1)}
                      className="w-16 rounded border px-2 py-1 text-xs text-center font-mono"
                      style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={() => removeItem(item.productId)}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}>
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {items.length} product{items.length !== 1 ? 's' : ''} · {items.reduce((s, i) => s + i.quantity, 0)} total units
                </p>
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products to add…"
                className="w-full rounded-lg border pl-8 pr-3 py-2 text-xs"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Search results dropdown */}
            {searchQuery.trim().length >= 2 && (
              <div className="mt-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                {searchLoading && (
                  <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>Searching…</p>
                )}
                {!searchLoading && searchResults.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No products found</p>
                )}
                {searchResults.map(p => {
                  const alreadyAdded = items.some(i => i.productId === p.id);
                  const stock = p.inventory?.quantityOnHand ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => !alreadyAdded && addItem(p.id, p.name)}
                      disabled={alreadyAdded || stock === 0}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-50"
                      style={{ borderTop: '1px solid var(--surface-border)' }}
                    >
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                        {p.genericName && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>({p.genericName})</span>}
                      </div>
                      <span className="ml-2 shrink-0 font-mono text-[10px]"
                        style={{ color: stock === 0 ? '#dc2626' : stock <= 5 ? '#b45309' : '#15803d' }}>
                        {alreadyAdded ? '✓ Added' : stock === 0 ? 'Out of stock' : `${stock} in stock`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
            <SmartTextarea
              value={notes}
              onChange={setNotes}
              rows={2}
              context="transfer:notes"
              placeholder="Reason for transfer…"
              className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm bg-[var(--surface-base)] text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-xs font-semibold"
            style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !toBranchId || items.length === 0}
            className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: '#0d9488' }}
          >
            {loading ? 'Creating…' : 'Create Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
