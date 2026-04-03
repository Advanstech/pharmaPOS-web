import type { UserRole } from '@/types';

/** Matches `DASHBOARD_NAV` inventory item — roles that can open the inventory workspace. */
export function canAccessInventoryWorkspace(role: UserRole): boolean {
  return ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist', 'technician'].includes(role);
}

/** Matches API `receiveStock` — inbound stocking without a full GRN. */
export function canReceiveStock(role: UserRole): boolean {
  return ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist', 'technician'].includes(role);
}

/** Matches API `adjustStock` — corrections, write-offs, cycle count fixes. */
export function canAdjustStock(role: UserRole): boolean {
  return ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(role);
}

/** Matches API `createProduct` — catalog creation for management/clinical leads. */
export function canCreateProduct(role: UserRole): boolean {
  return ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(role);
}
