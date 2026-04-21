'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Wifi, WifiOff, Briefcase, Building2, Calendar, BadgeCheck,
  Banknote, GraduationCap, Phone, Mail, Activity, Clock, Shield, Loader2,
  AlertTriangle,
} from 'lucide-react';
import { STAFF_MEMBER, STAFF_ACTIVITY_LOG } from '@/lib/graphql/dashboard.queries';
import { useAuthStore } from '@/lib/store/auth.store';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', se_admin: 'SE Admin', manager: 'Manager',
  head_pharmacist: 'Head Pharmacist', pharmacist: 'Pharmacist',
  technician: 'Technician', cashier: 'Cashier', chemical_cashier: 'Chemical Cashier',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  owner: { bg: 'rgba(147,51,234,0.1)', text: '#7e22ce', dot: '#9333ea' },
  se_admin: { bg: 'rgba(220,38,38,0.1)', text: '#b91c1c', dot: '#dc2626' },
  manager: { bg: 'rgba(37,99,235,0.1)', text: '#1d4ed8', dot: '#2563eb' },
  head_pharmacist: { bg: 'rgba(0,109,119,0.12)', text: '#004e57', dot: '#006d77' },
  pharmacist: { bg: 'rgba(22,163,74,0.1)', text: '#15803d', dot: '#16a34a' },
  technician: { bg: 'rgba(202,138,4,0.1)', text: '#854d0e', dot: '#ca8a04' },
  cashier: { bg: 'rgba(100,116,139,0.1)', text: '#475569', dot: '#64748b' },
  chemical_cashier: { bg: 'rgba(234,88,12,0.1)', text: '#9a3412', dot: '#ea580c' },
};

const ACTIVITY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  STAFF_ACTIVITY: { label: 'Service', color: '#2563eb', icon: '🔵' },
  STOCK_RECEIVED: { label: 'Stock In', color: '#0f766e', icon: '📦' },
  STOCK_ADJUSTED: { label: 'Stock Adj.', color: '#d97706', icon: '⚖️' },
  SALE_COMPLETED: { label: 'Sale', color: '#16a34a', icon: '💰' },
  SALE_REFUNDED: { label: 'Refund', color: '#dc2626', icon: '↩️' },
  GRN_CREATED_FROM_OCR: { label: 'Invoice OCR', color: '#7c3aed', icon: '📄' },
  LOW_STOCK_ALERT_NOTIFICATION: { label: 'Alert', color: '#ea580c', icon: '⚠️' },
  PRICE_CHANGED: { label: 'Price', color: '#7c3aed', icon: '💲' },
  STAFF_INVITED: { label: 'Staff', color: '#2563eb', icon: '👤' },
  STAFF_DEACTIVATED: { label: 'Deactivated', color: '#dc2626', icon: '🚫' },
  PASSWORD_RESET: { label: 'Password', color: '#d97706', icon: '🔑' },
};

function formatGhs(pesewas?: number): string {
  if (!pesewas) return '—';
  return `GH₵ ${(pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function avatarGradient(name: string): string {
  const g = ['#006d77','#1d4ed8','#7e22ce','#15803d','#b45309','#0e7490','#be185d'];
  return g[name.charCodeAt(0) % g.length];
}

export default function StaffDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const user = useAuthStore(s => s.user);
  const ACTIVITY_PAGE_SIZE = 15;
  const [activityPage, setActivityPage] = useState(1);

  const { data, loading, error } = useQuery(STAFF_MEMBER, {
    variables: { userId },
    fetchPolicy: 'cache-and-network',
  });

  const { data: actData } = useQuery(STAFF_ACTIVITY_LOG, {
    variables: { userId, limit: ACTIVITY_PAGE_SIZE, offset: (activityPage - 1) * ACTIVITY_PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
  });

  const member = data?.staffMember;
  const activities = actData?.staffActivityLog ?? [];
  const hasMoreActivity = activities.length === ACTIVITY_PAGE_SIZE;
  const rc = ROLE_COLORS[member?.role] ?? ROLE_COLORS.cashier;

  if (loading && !member) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-red-700">Staff member not found</h2>
          <Link href="/dashboard/staff" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">
            Back to Staff
          </Link>
        </div>
      </div>
    );
  }

  const lastSeen = member.last_seen_at || member.created_at;
  const lastSeenFormatted = new Date(lastSeen).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short',
  });

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <Link href="/dashboard/staff" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Staff
      </Link>

      {/* Profile Header */}
      <div className="mb-6 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #004e57 0%, #006d77 50%, #0e7490 100%)', boxShadow: '0 4px 24px rgba(0,109,119,0.3)' }}>
        <div className="relative px-6 py-8">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="relative z-10 flex items-center gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white"
              style={{ background: avatarGradient(member.name), border: '3px solid rgba(255,255,255,0.3)' }}>
              {getInitials(member.name)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{member.name}</h1>
                {member.is_on_duty ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(74,222,128,0.2)', color: '#86efac', border: '1px solid rgba(74,222,128,0.3)' }}>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: '#4ade80' }} />
                      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#4ade80' }} />
                    </span>
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                    Offline
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
                {member.position && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{member.position}</span>}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Clock size={11} /> Last seen: {lastSeenFormatted}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Employment */}
          <InfoCard title="Employment" icon={Briefcase}>
            <InfoRow label="Department" value={member.department} />
            <InfoRow label="Employment Type" value={member.employment_type === 'full_time' ? 'Full-time' : member.employment_type === 'part_time' ? 'Part-time' : member.employment_type} />
            <InfoRow label="Start Date" value={member.start_date ? new Date(member.start_date).toLocaleDateString('en-GH') : undefined} />
            <InfoRow label="Branch" value={member.branch_id} mono />
          </InfoCard>

          {/* Compensation */}
          <InfoCard title="Compensation (GHS)" icon={Banknote}>
            <InfoRow label="Salary" value={member.salary_amount_pesewas ? `${formatGhs(member.salary_amount_pesewas)} / ${member.salary_period ?? 'monthly'}` : undefined} />
            <InfoRow label="Bank" value={member.bank_name} />
          </InfoCard>

          {/* Compliance */}
          {(member.role === 'pharmacist' || member.role === 'head_pharmacist' || member.professional_licence_no) && (
            <InfoCard title="Ghana FDA Compliance" icon={Shield}>
              <InfoRow label="Licence No." value={member.professional_licence_no} mono />
              <InfoRow label="Licence Expiry" value={member.licence_expiry_date ? new Date(member.licence_expiry_date).toLocaleDateString('en-GH') : undefined} />
              <InfoRow label="Certificates" value={(member.certificate_s3_keys?.length ?? 0) > 0 ? `${member.certificate_s3_keys?.length} file(s)` : undefined} />
            </InfoCard>
          )}

          {/* Account */}
          <InfoCard title="Account" icon={Mail}>
            <InfoRow label="Email" value={member.email} />
            <InfoRow label="Joined" value={new Date(member.created_at).toLocaleDateString('en-GH')} />
            <InfoRow label="Status" value={member.is_active ? 'Active' : 'Deactivated'} valueColor={member.is_active ? '#15803d' : '#dc2626'} />
            <InfoRow label="Online" value={member.is_on_duty ? '🟢 Online now' : '⚫ Offline'} />
          </InfoCard>
        </div>

        {/* Right: Activity */}
        <div>
          <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
            <div className="mb-4 flex items-center gap-2">
              <Activity size={16} style={{ color: 'var(--color-teal)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
            </div>
            {activities.length === 0 ? (
              <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No activity recorded yet</p>
            ) : (
              <>
                <div className="space-y-0 divide-y" style={{ borderColor: 'var(--surface-border)' }}>
                  {activities.map((a: any) => {
                    const info = ACTIVITY_LABELS[a.type] ?? { label: a.type.replace(/_/g, ' '), color: '#64748b', icon: '📋' };
                    return (
                      <div key={a.id} className="flex items-start gap-2.5 py-3">
                        <span className="mt-0.5 text-sm">{info.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: info.color }}>{info.label}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {new Date(a.createdAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra', timeStyle: 'short', dateStyle: 'short' })}
                            </span>
                          </div>
                          {a.operation && (
                            <p className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                              {a.operation}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Page {activityPage}{hasMoreActivity ? ' - more available' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={activityPage <= 1}
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      className="rounded-md border px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
                      style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!hasMoreActivity}
                      onClick={() => setActivityPage((p) => p + 1)}
                      className="rounded-md border px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
                      style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
      <div className="flex items-center gap-2 border-b px-5 py-3" style={{ borderColor: 'var(--surface-border)' }}>
        <Icon size={14} style={{ color: 'var(--color-teal)' }} />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</h3>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, valueColor }: { label: string; value?: string | null; mono?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: valueColor ?? (value ? 'var(--text-primary)' : 'var(--text-muted)') }}>
        {value ?? '—'}
      </span>
    </div>
  );
}
