import type { UserRole } from '@/types';

/**
 * First screen after JWT login — POS floor vs clinical vs back office (aligned with seeded API roles).
 */
export function postLoginPathForRole(role: string): string {
  switch (role) {
    case 'cashier':
    case 'chemical_cashier':
      return '/pos';
    case 'technician':
      return '/dashboard/dispensing';
    case 'pharmacist':
    case 'head_pharmacist':
      return '/dashboard/prescriptions';
    case 'manager':
    case 'owner':
    case 'se_admin':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

const ALLOWED_ROLES: UserRole[] = [
  'owner',
  'se_admin',
  'manager',
  'head_pharmacist',
  'pharmacist',
  'technician',
  'cashier',
  'chemical_cashier',
];

/** Normalize API / JWT role strings (e.g. Owner, SE_ADMIN, chemical cashier) for RBAC. */
export function normalizeRoleString(role: string | undefined | null): string {
  if (!role) return '';
  return role
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/** Narrow API / store role string to our union when known. */
export function asUserRole(role: string): UserRole | null {
  const r = normalizeRoleString(role);
  return (ALLOWED_ROLES as string[]).includes(r) ? (r as UserRole) : null;
}

/** Safe role for sidebar + route guards when persisted user.role may vary in casing. */
export function roleForAccess(role: string | undefined | null): UserRole | null {
  if (!role) return null;
  return asUserRole(role);
}
