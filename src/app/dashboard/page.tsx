'use client';

import { useAuthStore } from '@/lib/store/auth.store';
import { ManagementView } from '@/components/dashboard/views/management-view';
import { ClinicalView } from '@/components/dashboard/views/clinical-view';
import { CashierView } from '@/components/dashboard/views/cashier-view';
import { DashboardOverviewSkeleton } from '@/components/dashboard/dashboard-overview-skeleton';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <DashboardOverviewSkeleton />;
  }

  // Role routing
  const isManagement = ['owner', 'se_admin', 'manager'].includes(user.role);
  const isClinical = ['head_pharmacist', 'pharmacist', 'technician'].includes(user.role);
  // Default to cashier for cashier/chemical_cashier or unhandled edge cases

  return (
    <div className="p-6 md:p-10 flex min-h-full" style={{ background: 'var(--surface-base)' }}>
      {isManagement ? (
        <ManagementView user={user} />
      ) : isClinical ? (
        <ClinicalView user={user} />
      ) : (
        <CashierView user={user} />
      )}
    </div>
  );
}
