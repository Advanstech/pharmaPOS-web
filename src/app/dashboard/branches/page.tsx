'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Building2,
  Plus,
  Pencil,
  PowerOff,
  RefreshCcw,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  BRANCHES_ADMIN_QUERY,
  CREATE_BRANCH_MUTATION,
  UPDATE_BRANCH_MUTATION,
  DEACTIVATE_BRANCH_MUTATION,
  REACTIVATE_BRANCH_MUTATION,
} from '@/lib/graphql/branches';
import { useAuthStore } from '@/lib/store/auth.store';

type Branch = {
  id: string;
  organizationId: string;
  name: string;
  type: 'pharmaceutical' | 'chemical';
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  name: string;
  type: 'pharmaceutical' | 'chemical';
  address: string;
  phone: string;
};

const EMPTY: FormState = { name: '', type: 'pharmaceutical', address: 'Accra, Ghana', phone: '' };

const TYPE_CONFIG = {
  pharmaceutical: { label: 'Pharmacy', emoji: '💊', bg: 'rgba(13,148,136,0.1)', color: '#0d9488' },
  chemical:       { label: 'Chemical', emoji: '🧪', bg: 'rgba(234,88,12,0.1)',   color: '#ea580c' },
};

export default function BranchManagementPage() {
  const user = useAuthStore((s) => s.user);

  // Only show active branches by default — clean view
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, loading, refetch } = useQuery<{ branchesAdmin: Branch[] }>(BRANCHES_ADMIN_QUERY, {
    variables: { includeInactive: true }, // always fetch all, filter client-side
    fetchPolicy: 'cache-and-network',
  });

  const [createBranch, { loading: creating }] = useMutation(CREATE_BRANCH_MUTATION);
  const [updateBranch, { loading: updating }] = useMutation(UPDATE_BRANCH_MUTATION);
  const [deactivateBranch, { loading: deactivating }] = useMutation(DEACTIVATE_BRANCH_MUTATION);
  const [reactivateBranch, { loading: reactivating }] = useMutation(REACTIVATE_BRANCH_MUTATION);

  const allBranches = data?.branchesAdmin ?? [];
  const branches = showInactive ? allBranches : allBranches.filter((b) => b.isActive);
  const activeCount = allBranches.filter((b) => b.isActive).length;
  const saving = creating || updating;

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setForm({
      name: branch.name,
      type: branch.type,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Branch name is required.'); return; }

    const input = {
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    };

    try {
      if (editing) {
        await updateBranch({ variables: { id: editing.id, input } });
        showToast('success', `"${input.name}" updated.`);
      } else {
        await createBranch({ variables: { input } });
        showToast('success', `"${input.name}" created.`);
      }
      await refetch();
      closeForm();
    } catch (e: any) {
      showToast('error', e?.message ?? 'Could not save branch.');
    }
  };

  const handleToggle = async (branch: Branch) => {
    if (branch.isActive && branch.id === user?.branch_id) {
      showToast('error', 'Switch to another branch before deactivating your current one.');
      return;
    }
    try {
      if (branch.isActive) {
        await deactivateBranch({ variables: { id: branch.id } });
        showToast('success', `"${branch.name}" deactivated.`);
      } else {
        await reactivateBranch({ variables: { id: branch.id } });
        showToast('success', `"${branch.name}" reactivated.`);
      }
      await refetch();
    } catch (e: any) {
      showToast('error', e?.message ?? 'Status update failed.');
    }
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13,148,136,0.07) 0%, rgba(0,109,119,0.04) 100%)',
        borderBottom: '1px solid var(--surface-border)',
      }}>
        <div className="mx-auto max-w-[860px] px-4 pb-5 pt-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'rgba(13,148,136,0.1)' }}>
                <Building2 size={18} style={{ color: '#0d9488' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Branch Management
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {activeCount} active branch{activeCount !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 4px 14px rgba(13,148,136,0.3)' }}
            >
              <Plus size={15} /> New Branch
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[860px] px-4 py-5 md:px-6 space-y-4">
        {/* Toast */}
        {toast && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            style={{
              background: toast.type === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.08)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
              color: toast.type === 'success' ? '#15803d' : '#b91c1c',
            }}>
            {toast.type === 'success'
              ? <CheckCircle2 size={15} />
              : <AlertTriangle size={15} />}
            {toast.msg}
          </div>
        )}

        {/* Inline create/edit form */}
        {formOpen && (
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '2px solid rgba(13,148,136,0.3)', background: 'var(--surface-card)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
              <div className="flex items-center gap-2">
                <Building2 size={15} style={{ color: '#0d9488' }} />
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {editing ? `Edit — ${editing.name}` : 'New Branch'}
                </h2>
              </div>
              <button onClick={closeForm} className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-muted)' }}>
                <X size={15} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Branch Name *
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
                  placeholder="e.g. Azzay Pharmacy — Spintex"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30"
                  style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FormState['type'] }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                >
                  <option value="pharmaceutical">💊 Pharmaceutical</option>
                  <option value="chemical">🧪 Chemical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+233 24 000 0000"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Accra, Ghana"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#0d9488' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Branch'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium"
                style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Branch list */}
        <div className="rounded-2xl overflow-x-auto"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {branches.length} branch{branches.length !== 1 ? 'es' : ''}
            </p>
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer select-none"
              style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Show inactive
            </label>
          </div>

          {loading && branches.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#0d9488' }} />
            </div>
          ) : branches.length === 0 ? (
            <div className="py-14 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 opacity-15" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>No branches yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click "New Branch" to add one.</p>
            </div>
          ) : (
            <div>
              {branches.map((branch, i) => {
                const tc = TYPE_CONFIG[branch.type];
                const isCurrent = branch.id === user?.branch_id;
                const isActing = deactivating || reactivating;

                return (
                  <div key={branch.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(0,0,0,0.015)]"
                    style={{ borderTop: i === 0 ? undefined : '1px solid var(--surface-border)' }}>
                    {/* Type icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ background: tc.bg }}>
                      {tc.emoji}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {branch.name}
                        </p>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                        {!branch.isActive && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: 'rgba(220,38,38,0.1)', color: '#b91c1c' }}>
                            Inactive
                          </span>
                        )}
                        {isCurrent && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                            Current
                          </span>
                        )}
                      </div>
                      {(branch.address || branch.phone) && (
                        <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {[branch.address, branch.phone].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(branch)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105"
                        style={{ background: 'rgba(13,148,136,0.08)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.15)' }}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggle(branch)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
                        style={branch.isActive
                          ? { background: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.15)' }
                          : { background: 'rgba(22,163,74,0.08)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }}
                      >
                        {branch.isActive
                          ? <><PowerOff size={11} /> Deactivate</>
                          : <><RefreshCcw size={11} /> Reactivate</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
