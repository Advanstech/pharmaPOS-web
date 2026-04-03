import { DASHBOARD_NAV } from '@/lib/auth/dashboard-nav';
import type { UserRole } from '@/types';

const OVERVIEW = DASHBOARD_NAV.find((i) => i.href === '/dashboard');
const OVERVIEW_ROLES = OVERVIEW?.roles ?? [];

/** Longest path first so `/dashboard/staff` wins over `/dashboard`. */
const PREFIX_RULES = DASHBOARD_NAV.filter((i) => i.href !== '/dashboard')
  .map((i) => ({ prefix: i.href, roles: i.roles }))
  .sort((a, b) => b.prefix.length - a.prefix.length);

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const p = pathname.replace(/\/+$/, '') || '/';
  return p;
}

/**
 * Returns true if this role may view the given dashboard path.
 */
export function canAccessDashboardPath(role: UserRole, pathname: string): boolean {
  const p = normalizePath(pathname);
  if (p === '/dashboard') return OVERVIEW_ROLES.includes(role);

  for (const { prefix, roles } of PREFIX_RULES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      return roles.includes(role);
    }
  }

  return false;
}
