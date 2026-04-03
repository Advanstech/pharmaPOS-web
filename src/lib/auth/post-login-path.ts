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

/** Narrow API / store role string to our union when known. */
export function asUserRole(role: string): UserRole | null {
  const allowed: UserRole[] = [
    'owner',
    'se_admin',
    'manager',
    'head_pharmacist',
    'pharmacist',
    'technician',
    'cashier',
    'chemical_cashier',
  ];
  return (allowed as string[]).includes(role) ? (role as UserRole) : null;
}
