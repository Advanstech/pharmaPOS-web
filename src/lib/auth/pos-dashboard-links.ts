import { DASHBOARD_NAV } from '@/lib/auth/dashboard-nav';
import type { UserRole } from '@/types';

function rolesForHref(href: string): UserRole[] {
  return DASHBOARD_NAV.find((i) => i.href === href)?.roles ?? [];
}

/** User may open inventory product detail from POS (matches sidebar RBAC). */
export function canOpenInventoryFromPos(role: UserRole | undefined): boolean {
  return !!role && rolesForHref('/dashboard/inventory').includes(role);
}

/** User may open suppliers workspace from POS (matches sidebar RBAC). */
export function canOpenSuppliersFromPos(role: UserRole | undefined): boolean {
  return !!role && rolesForHref('/dashboard/suppliers').includes(role);
}

export function inventoryProductHref(productId: string): string {
  return `/dashboard/inventory/${productId}`;
}

export function suppliersPageHref(supplierId?: string | null): string {
  if (supplierId) {
    return `/dashboard/suppliers/${encodeURIComponent(supplierId)}/products`;
  }
  return '/dashboard/suppliers';
}
