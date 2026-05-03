'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { BRANCHES_QUERY } from '@/lib/graphql/branches';

type BranchOption = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
};

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s\-–—_]+$/, '')
    .replace(/\s+/g, ' ');
}

function dedupeBranches(branches: BranchOption[], currentBranchId?: string): BranchOption[] {
  // 1. De-dupe by id first (guard against API returning the same row twice)
  const byId = new Map<string, BranchOption>();
  for (const b of branches) byId.set(b.id, b);
  const unique = [...byId.values()];

  // 2. Only active branches
  const active = unique.filter((b) => b.isActive);

  // 3. Collapse near-identical names (same normalised name + same type)
  const grouped = new Map<string, BranchOption[]>();
  for (const branch of active) {
    const key = `${normalizeName(branch.name)}::${branch.type.trim().toLowerCase()}`;
    const list = grouped.get(key) ?? [];
    list.push(branch);
    grouped.set(key, list);
  }

  const deduped: BranchOption[] = [];
  for (const list of grouped.values()) {
    const current = list.find((b) => b.id === currentBranchId);
    deduped.push(current ?? list[0]!);
  }

  return deduped.sort((a, b) => a.name.localeCompare(b.name));
}

export function BranchSwitcher() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [open, setOpen] = useState(false);

  const canSwitch = user && ['owner', 'se_admin'].includes(user.role);

  const { data } = useQuery(BRANCHES_QUERY, {
    skip: !canSwitch,
    fetchPolicy: 'cache-first',
  });

  const rawBranches = (data?.branches ?? []) as BranchOption[];
  const branches = dedupeBranches(rawBranches, user?.branch_id);

  if (!canSwitch || branches.length <= 1) return null;

  const currentBranch = branches.find((b: any) => b.id === user?.branch_id);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
      >
        <Building2 size={12} style={{ color: 'var(--color-teal)' }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {currentBranch?.name || user?.branchName || 'Branch'}
          </p>
          <p className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {currentBranch?.type === 'pharmaceutical' ? '💊 Pharmacy' : '🧪 Chemical'}
          </p>
        </div>
        <ChevronDown size={10} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl shadow-lg"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
          >
            <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--surface-border)' }}>
              Switch Branch
            </div>
            {branches.filter((b: any) => b.id !== user?.branch_id).map((branch: any) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => {
                  if (user && accessToken && refreshToken) {
                    setAuth(
                      { ...user, branch_id: branch.id, branchName: branch.name, branchType: branch.type },
                      accessToken,
                      refreshToken,
                    );
                  }
                  setOpen(false);
                  // Reload to refresh all branch-scoped data
                  window.location.reload();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
              >
                <span className="text-xs">{branch.type === 'pharmaceutical' ? '💊' : '🧪'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {branch.name}
                  </p>
                  <p className="text-[9px] capitalize" style={{ color: 'var(--text-muted)' }}>
                    {branch.type}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
