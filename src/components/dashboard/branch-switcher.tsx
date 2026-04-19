'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';

const BRANCHES_QUERY = gql`
  query Branches {
    branches {
      id
      name
      type
    }
  }
`;

export function BranchSwitcher() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [open, setOpen] = useState(false);

  const canSwitch = user && ['owner', 'se_admin'].includes(user.role);

  const { data } = useQuery(BRANCHES_QUERY, {
    skip: !canSwitch,
    fetchPolicy: 'cache-first',
  });

  const branches = data?.branches ?? [];

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
            {branches.map((branch: any) => {
              const isActive = branch.id === user?.branch_id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => {
                    if (isActive) { setOpen(false); return; }
                    // Update the user's branch context
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
                    <p className="truncate text-xs font-medium" style={{ color: isActive ? 'var(--color-teal)' : 'var(--text-primary)' }}>
                      {branch.name}
                    </p>
                    <p className="text-[9px] capitalize" style={{ color: 'var(--text-muted)' }}>
                      {branch.type}
                    </p>
                  </div>
                  {isActive && <Check size={14} style={{ color: 'var(--color-teal)' }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
