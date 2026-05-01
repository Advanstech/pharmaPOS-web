'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Save,
  X,
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

type BranchFormState = {
  name: string;
  type: 'pharmaceutical' | 'chemical';
  address: string;
  phone: string;
};

const EMPTY_FORM: BranchFormState = {
  name: '',
  type: 'pharmaceutical',
  address: '',
  phone: '',
};

function fmtDate(value: string): string {
  return new Date(value).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function BranchManagementPage() {
  const user = useAuthStore((s) => s.user);
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<{ branchesAdmin: Branch[] }>(BRANCHES_ADMIN_QUERY, {
    variables: { includeInactive: showInactive },
    fetchPolicy: 'cache-and-network',
  });

  const [createBranch, { loading: creating }] = useMutation(CREATE_BRANCH_MUTATION);
  const [updateBranch, { loading: updating }] = useMutation(UPDATE_BRANCH_MUTATION);
  const [deactivateBranch, { loading: deactivating }] = useMutation(DEACTIVATE_BRANCH_MUTATION);
  const [reactivateBranch, { loading: reactivating }] = useMutation(REACTIVATE_BRANCH_MUTATION);

  const branches = data?.branchesAdmin ?? [];
  const saving = creating || updating;

  const duplicateGroups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of branches) {
      const key = `${b.name.trim().toLowerCase()}::${b.type}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key, count]) => {
        const [name, type] = key.split('::');
        return { name, type, count };
      });
  }, [branches]);

  const activeCount = branches.filter((b) => b.isActive).length;

  const resetForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const startCreate = () => {
    setError(null);
    setSuccess(null);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (branch: Branch) => {
    setError(null);
    setSuccess(null);
    setEditing(branch);
    setForm({
      name: branch.name,
      type: branch.type,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
    });
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!form.name.trim()) {
      setError('Branch name is required.');
      return;
    }

    const input = {
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
    };

    try {
      if (editing) {
        await updateBranch({ variables: { id: editing.id, input } });
        setSuccess('Branch updated successfully.');
      } else {
        await createBranch({ variables: { input } });
        setSuccess('Branch created successfully.');
      }

      await refetch({ includeInactive: showInactive });
      resetForm();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save branch changes.');
    }
  };

  const handleToggleActive = async (branch: Branch) => {
    setError(null);
    setSuccess(null);

    try {
      if (branch.isActive) {
        if (branch.id === user?.branch_id) {
          setError('Switch to another branch before deactivating your current branch.');
          return;
        }
        await deactivateBranch({ variables: { id: branch.id } });
        setSuccess(`Branch "${branch.name}" deactivated.`);
      } else {
        await reactivateBranch({ variables: { id: branch.id } });
        setSuccess(`Branch "${branch.name}" reactivated.`);
      }

      await refetch({ includeInactive: showInactive });
    } catch (e: any) {
      setError(e?.message ?? 'Branch status update failed.');
    }
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(0,109,119,0.04) 100%)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        <div className="mx-auto max-w-[1200px] px-4 pb-5 pt-6 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Branch Management
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                View branch health, resolve duplicate branch records, and manage CRUD operations.
              </p>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
              }}
            >
              <Plus size={15} />
              New Branch
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={branches.length} />
            <StatCard label="Active" value={activeCount} />
            <StatCard label="Inactive" value={Math.max(0, branches.length - activeCount)} />
            <StatCard label="Duplicates" value={duplicateGroups.length} tone={duplicateGroups.length ? 'warn' : 'ok'} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1200px] gap-5 px-4 py-5 md:grid-cols-[1.2fr_0.8fr] md:px-6">
        <section
          className="overflow-hidden rounded-2xl"
          style={{
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-card)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.02)' }}
          >
            <div className="inline-flex items-center gap-2">
              <Building2 size={15} style={{ color: 'var(--color-teal)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Organization Branches</p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => {
                  setShowInactive(e.target.checked);
                  refetch({ includeInactive: e.target.checked });
                }}
              />
              Show inactive
            </label>
          </div>

          {loading && branches.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-teal border-t-transparent" />
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
              {branches.map((branch) => {
                const isCurrent = branch.id === user?.branch_id;
                return (
                  <div key={branch.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{branch.name}</p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                            style={{
                              background: branch.type === 'pharmaceutical' ? 'rgba(13,148,136,0.12)' : 'rgba(234,88,12,0.12)',
                              color: branch.type === 'pharmaceutical' ? '#0d9488' : '#ea580c',
                            }}
                          >
                            {branch.type}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                            style={{
                              background: branch.isActive ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.1)',
                              color: branch.isActive ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {branch.isActive ? 'active' : 'inactive'}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-[rgba(13,148,136,0.14)] px-2 py-0.5 text-[10px] font-bold" style={{ color: '#0d9488' }}>
                              current context
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {branch.address || 'No address'}
                          {branch.phone ? ` · ${branch.phone}` : ''}
                        </p>
                        <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Created {fmtDate(branch.createdAt)} · Updated {fmtDate(branch.updatedAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(branch)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                          style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488' }}
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(branch)}
                          disabled={deactivating || reactivating}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold disabled:opacity-60"
                          style={{
                            background: branch.isActive ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.12)',
                            color: branch.isActive ? '#b91c1c' : '#15803d',
                          }}
                        >
                          {branch.isActive ? <Trash2 size={11} /> : <RefreshCcw size={11} />}
                          {branch.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && branches.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No branches found</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create your first branch to begin.</p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div
            className="rounded-2xl p-4"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Edit Branch' : 'Create Branch'}
              </h2>
              {(editing || form.name || form.address || form.phone) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
                  style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}
                >
                  <X size={11} /> Reset
                </button>
              )}
            </div>

            <div className="space-y-3">
              <FieldLabel>Branch Name *</FieldLabel>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                placeholder="e.g. Azzay Main Branch"
              />

              <FieldLabel>Type</FieldLabel>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as BranchFormState['type'] }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              >
                <option value="pharmaceutical">Pharmaceutical</option>
                <option value="chemical">Chemical</option>
              </select>

              <FieldLabel>Address</FieldLabel>
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                placeholder="Accra, Ghana"
              />

              <FieldLabel>Phone</FieldLabel>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                placeholder="+233 24 000 0000"
              />

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}
              >
                <Save size={14} />
                {saving ? 'Saving...' : editing ? 'Update Branch' : 'Create Branch'}
              </button>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(217,119,6,0.2)', background: 'rgba(217,119,6,0.06)' }}>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={15} style={{ color: '#b45309' }} />
                <h3 className="text-sm font-bold" style={{ color: '#92400e' }}>Duplicate branch records detected</h3>
              </div>
              <ul className="space-y-1.5 text-xs" style={{ color: '#92400e' }}>
                {duplicateGroups.map((g) => (
                  <li key={`${g.name}:${g.type}`}>
                    <strong>{g.name}</strong> ({g.type}) appears {g.count} times.
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px]" style={{ color: '#92400e' }}>
                Keep the preferred branch active and deactivate extra duplicates.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', color: '#15803d' }}>
              <CheckCircle2 size={14} /> {success}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const color = tone === 'warn' ? '#b45309' : tone === 'ok' ? '#15803d' : 'var(--text-primary)';
  const bg = tone === 'warn' ? 'rgba(217,119,6,0.08)' : tone === 'ok' ? 'rgba(22,163,74,0.08)' : 'var(--surface-card)';

  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: bg, border: '1px solid var(--surface-border)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </label>
  );
}
