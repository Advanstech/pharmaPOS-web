import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  ShieldCheck,
  CreditCard,
  BrainCircuit,
  ShieldAlert,
  ClipboardList,
  FlaskConical,
  Receipt,
  Truck,
  BadgeDollarSign,
  Landmark,
  Settings,
  Newspaper,
  Contact,
  CalendarCheck,
  ArrowLeftRight,
  RotateCcw,
  Building2,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

/**
 * Single source for sidebar labels/icons and RBAC path checks (matches API role names in seed).
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    roles: [
      'owner',
      'se_admin',
      'manager',
      'head_pharmacist',
      'pharmacist',
      'technician',
      'cashier',
      'chemical_cashier',
    ],
  },
  {
    href: '/dashboard/market-intelligence',
    label: 'Market intelligence',
    icon: Newspaper,
    roles: [
      'owner',
      'se_admin',
      'manager',
      'head_pharmacist',
      'pharmacist',
      'technician',
      'cashier',
      'chemical_cashier',
    ],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    roles: [
      'owner',
      'se_admin',
      'manager',
      'head_pharmacist',
      'pharmacist',
      'technician',
      'cashier',
      'chemical_cashier',
    ],
  },
  { href: '/dashboard/staff', label: 'Staff', icon: Users, roles: ['owner', 'se_admin', 'manager'] },
  {
    href: '/dashboard/customers',
    label: 'Customers',
    icon: Contact,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist'],
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist'],
  },
  {
    href: '/dashboard/accounting',
    label: 'Accounting',
    icon: Landmark,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist'],
  },
  {
    href: '/dashboard/expenses',
    label: 'Expenses',
    icon: Receipt,
    roles: [
      'owner',
      'se_admin',
      'manager',
      'head_pharmacist',
      'pharmacist',
      'technician',
      'cashier',
      'chemical_cashier',
    ],
  },
  {
    href: '/dashboard/pricing',
    label: 'Pricing Control',
    icon: BadgeDollarSign,
    roles: ['owner', 'se_admin', 'manager'],
  },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, roles: ['owner', 'se_admin'] },
  { href: '/dashboard/cfo', label: 'CFO Briefing', icon: BrainCircuit, roles: ['owner', 'se_admin'] },
  { href: '/dashboard/audit', label: 'Internal Audit', icon: ShieldAlert, roles: ['owner', 'se_admin'] },
  {
    href: '/dashboard/prescriptions',
    label: 'Prescriptions',
    icon: ClipboardList,
    roles: ['head_pharmacist', 'pharmacist'],
  },
  {
    href: '/dashboard/dispensing',
    label: 'Dispensing',
    icon: FlaskConical,
    roles: ['head_pharmacist', 'pharmacist', 'technician'],
  },
  {
    href: '/dashboard/inventory',
    label: 'Inventory',
    icon: Package,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist', 'technician', 'cashier', 'chemical_cashier'],
  },
  {
    href: '/dashboard/suppliers',
    label: 'Suppliers',
    icon: Truck,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist', 'technician', 'cashier', 'chemical_cashier'],
  },
  {
    href: '/dashboard/branches',
    label: 'Branch Management',
    icon: Building2,
    roles: ['owner', 'se_admin', 'manager'],
  },
  {
    href: '/dashboard/invoices',
    label: 'Invoices',
    icon: Receipt,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist', 'technician'],
  },
  {
    href: '/dashboard/compliance',
    label: 'Compliance',
    icon: ShieldCheck,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist'],
  },
  {
    href: '/dashboard/transactions',
    label: 'Sales',
    icon: Receipt,
    roles: ['owner', 'se_admin', 'manager', 'cashier', 'chemical_cashier', 'pharmacist', 'head_pharmacist'],
  },
  {
    href: '/dashboard/refunds',
    label: 'Refunds',
    icon: RotateCcw,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist'],
  },
  {
    href: '/dashboard/end-of-day',
    label: 'End of Day',
    icon: CalendarCheck,
    roles: ['owner', 'se_admin', 'manager', 'cashier', 'chemical_cashier', 'head_pharmacist', 'pharmacist', 'technician'],
  },
  {
    href: '/dashboard/transfers',
    label: 'Stock Transfers',
    icon: ArrowLeftRight,
    roles: ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist', 'technician'],
  },
];
