import type { UserRole } from '@/types';

/** Aligned with `SalesService` — may list any branch member’s sales. */
export const BRANCH_WIDE_SALES_ROLES: readonly UserRole[] = ['owner', 'se_admin', 'manager'];

export function isBranchWideSalesRole(role: UserRole): boolean {
  return (BRANCH_WIDE_SALES_ROLES as readonly string[]).includes(role);
}
