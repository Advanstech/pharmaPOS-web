'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import {
  UserPlus, MoreVertical, ShieldOff, KeyRound, LogIn, PencilLine, Eye, EyeOff,
  LayoutGrid, List, Search, Filter, X, Wifi, WifiOff, Clock, Building2,
  TrendingUp, Users, UserCheck, AlertCircle, ChevronDown, Banknote,
  GraduationCap, Phone, MapPin, Calendar, BadgeCheck, Briefcase, Activity, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  LIST_STAFF, STAFF_MEMBER, STAFF_SESSION_HISTORY,
  INVITE_STAFF, DEACTIVATE_STAFF, DELETE_STAFF, RESET_STAFF_PASSWORD, UPDATE_STAFF_PROFILE,
  STAFF_ACTIVITY_LOG, GENERATE_STAFF_PASSWORD,
} from '@/lib/graphql/dashboard.queries';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatAccraDate, cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { useToast, useConfirm } from '@/components/ui/toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  branch_id: string;
  is_active: boolean;
  is_on_duty: boolean;
  last_seen_at?: string;
  position?: string;
  department?: string;
  employment_type?: string;
  professional_licence_no?: string;
  licence_expiry_date?: string;
  start_date?: string;
  photo_url?: string;
  certificate_s3_keys?: string[];
  salary_amount_pesewas?: number;
  salary_period?: string;
  bank_name?: string;
  created_at: string;
}

interface StaffSessionRow {
  id: string;
  userId: string;
  user_name: string;
  user_role: string;
  branchId: string;
  branch_name: string;
  sessionId: string;
  started_at: string;
  ended_at?: string | null;
  last_seen_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_open: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', se_admin: 'SE Admin', manager: 'Manager',
  head_pharmacist: 'Head Pharmacist', pharmacist: 'Pharmacist',
  technician: 'Technician', cashier: 'Cashier', chemical_cashier: 'Chemical Cashier',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  owner:            { bg: 'rgba(147,51,234,0.1)',  text: '#7e22ce', dot: '#9333ea' },
  se_admin:         { bg: 'rgba(220,38,38,0.1)',   text: '#b91c1c', dot: '#dc2626' },
  manager:          { bg: 'rgba(37,99,235,0.1)',   text: '#1d4ed8', dot: '#2563eb' },
  head_pharmacist:  { bg: 'rgba(0,109,119,0.12)',  text: '#004e57', dot: '#006d77' },
  pharmacist:       { bg: 'rgba(22,163,74,0.1)',   text: '#15803d', dot: '#16a34a' },
  technician:       { bg: 'rgba(202,138,4,0.1)',   text: '#854d0e', dot: '#ca8a04' },
  cashier:          { bg: 'rgba(100,116,139,0.1)', text: '#475569', dot: '#64748b' },
  chemical_cashier: { bg: 'rgba(234,88,12,0.1)',   text: '#9a3412', dot: '#ea580c' },
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract',
};

const INVITE_ROLES = ['manager','head_pharmacist','pharmacist','technician','cashier','chemical_cashier'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGhs(pesewas?: number): string {
  if (!pesewas) return '—';
  return `GH₵ ${(pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function formatAccraDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GH', {
    timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short',
  });
}

function toDateInputValue(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function computeProfileCompletion(m: StaffMember): number {
  const fields = [
    m.position, m.department, m.employment_type, m.start_date,
    ...(m.role === 'pharmacist' || m.role === 'head_pharmacist'
      ? [m.professional_licence_no, m.licence_expiry_date] : []),
  ];
  const filled = fields.filter((v) => !!v && String(v).trim().length > 0).length;
  return fields.length > 0 ? Math.round((filled / fields.length) * 100) : 100;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

// Deterministic avatar gradient from name
function avatarGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg,#006d77,#004e57)',
    'linear-gradient(135deg,#1d4ed8,#1e40af)',
    'linear-gradient(135deg,#7e22ce,#6b21a8)',
    'linear-gradient(135deg,#15803d,#166534)',
    'linear-gradient(135deg,#b45309,#92400e)',
    'linear-gradient(135deg,#0e7490,#155e75)',
    'linear-gradient(135deg,#be185d,#9d174d)',
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

// ── Avatar component ──────────────────────────────────────────────────────────

function StaffAvatar({ member, size = 48 }: { member: StaffMember; size?: number }) {
  const [broken, setBroken] = useState(false);
  const rc = ROLE_COLORS[member.role];

  if (member.photo_url && !broken) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <img
          src={member.photo_url}
          alt={member.name}
          className="rounded-full object-cover w-full h-full"
          style={{ border: `2px solid ${rc?.dot ?? '#006d77'}33` }}
          onError={() => setBroken(true)}
        />
        {member.is_on_duty && (
          <span
            className="absolute bottom-0 right-0 rounded-full border-2"
            style={{ width: 12, height: 12, background: '#16a34a', borderColor: 'var(--surface-card)' }}
            title="On duty"
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative shrink-0 rounded-full flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, background: avatarGradient(member.name), fontSize: size * 0.33 }}>
      {getInitials(member.name)}
      {member.is_on_duty && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{ width: 12, height: 12, background: '#16a34a', borderColor: 'var(--surface-card)' }}
          title="On duty"
        />
      )}
    </div>
  );
}

// ── KPI bar ───────────────────────────────────────────────────────────────────

function StaffKpiBar({ staff }: { staff: StaffMember[] }) {
  const total = staff.length;
  const onDuty = staff.filter((s) => s.is_on_duty).length;
  const offline = staff.filter((s) => !s.is_on_duty).length;
  const active = staff.filter((s) => s.is_active).length;
  const incomplete = staff.filter((s) => computeProfileCompletion(s) < 100).length;

  const kpis = [
    { icon: Users, label: 'Total staff', value: total, color: '#006d77', gradient: 'linear-gradient(135deg, rgba(0,109,119,0.12), rgba(0,109,119,0.03))' },
    { icon: Wifi, label: 'On duty now', value: onDuty, color: '#16a34a', pulse: onDuty > 0, gradient: 'linear-gradient(135deg, rgba(22,163,74,0.12), rgba(22,163,74,0.03))' },
    { icon: WifiOff, label: 'Offline', value: offline, color: '#64748b', gradient: 'linear-gradient(135deg, rgba(100,116,139,0.12), rgba(100,116,139,0.03))' },
    { icon: UserCheck, label: 'Active accounts', value: active, color: '#2563eb', gradient: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.03))' },
    { icon: AlertCircle, label: 'Profiles incomplete', value: incomplete, color: incomplete > 0 ? '#b45309' : '#64748b', gradient: incomplete > 0 ? 'linear-gradient(135deg, rgba(180,83,9,0.12), rgba(180,83,9,0.03))' : 'linear-gradient(135deg, rgba(100,116,139,0.12), rgba(100,116,139,0.03))' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-5">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl p-4 relative overflow-hidden"
          style={{
            background: k.gradient,
            border: '1px solid var(--surface-border)',
            boxShadow: 'var(--shadow-card)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {/* Glass highlight */}
          <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
              <div className="rounded-lg p-1.5" style={{ background: `${k.color}18`, boxShadow: `0 0 12px ${k.color}15` }}>
                <k.icon size={14} style={{ color: k.color }} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{k.value}</span>
              {k.pulse && k.value > 0 && (
                <span className="mb-1 flex items-center gap-1 text-xs font-medium" style={{ color: '#16a34a' }}>
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  live
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Staff card (grid view) ────────────────────────────────────────────────────

function StaffCard({
  member, canManage, currentUserId, onView, onEdit, onDeactivate, onDelete, onResetPw, onGeneratePw,
}: {
  member: StaffMember;
  canManage: boolean;
  currentUserId?: string;
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onResetPw: () => void;
  onGeneratePw: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rc = ROLE_COLORS[member.role] ?? ROLE_COLORS.cashier;
  const completion = computeProfileCompletion(member);

  // "Last seen" — use last_seen_at from sessions, fallback to created_at
  const lastSeen = member.last_seen_at || member.created_at;
  const lastSeenLabel = (() => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatAccraDate(lastSeen);
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      whileHover={{ y: -2, boxShadow: member.is_on_duty ? '0 8px 32px rgba(22,163,74,0.18)' : '0 8px 32px rgba(0,109,119,0.12)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="relative rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: 'var(--surface-card)',
        border: member.is_on_duty
          ? '1.5px solid rgba(22,163,74,0.45)'
          : '1px solid var(--surface-border)',
        boxShadow: member.is_on_duty
          ? '0 0 0 1px rgba(22,163,74,0.1), 0 4px 20px rgba(22,163,74,0.08), var(--shadow-card)'
          : 'var(--shadow-card)',
      }}
    >
      {/* On-duty / Off-duty indicator */}
      <div className="absolute top-3 left-3">
        {member.is_on_duty ? (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: '#4ade80' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#16a34a' }} />
            </span>
            On duty
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
            style={{ background: 'var(--surface-base)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
            <span className="h-2 w-2 rounded-full" style={{ background: '#94a3b8' }} />
            Offline
          </div>
        )}
      </div>

      {/* Menu */}
      {canManage && (
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Actions"
          >
            <MoreVertical size={15} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="absolute right-0 top-8 z-20 w-44 rounded-xl py-1"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: 'var(--shadow-modal)' }}
              >
                {[
                  { icon: Eye, label: 'View details', action: onView },
                  { icon: PencilLine, label: 'Edit profile', action: onEdit },
                  { icon: KeyRound, label: 'Generate password', action: onGeneratePw },
                  { icon: KeyRound, label: 'Reset password', action: onResetPw },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={() => { setMenuOpen(false); action(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
                {member.is_active && member.id !== currentUserId && (
                  <button onClick={() => { setMenuOpen(false); onDeactivate(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-red-50"
                    style={{ color: '#dc2626' }}>
                    <ShieldOff size={13} /> Deactivate
                  </button>
                )}
                {!member.is_active && member.id !== currentUserId && (
                  <button onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-red-50"
                    style={{ color: '#b91c1c' }}>
                    <Trash2 size={13} /> Delete permanently
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <StaffAvatar member={member} size={64} />
        <div className="text-center">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
          {member.position && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{member.position}</p>
          )}
        </div>
      </div>

      {/* Role badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: rc.bg, color: rc.text }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: rc.dot }} />
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg p-2" style={{ background: 'var(--surface-base)' }}>
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Employment</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {member.employment_type ? (EMPLOYMENT_LABELS[member.employment_type] ?? member.employment_type) : '—'}
          </p>
        </div>
        <div className="rounded-lg p-2" style={{ background: 'var(--surface-base)' }}>
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Profile</p>
          <p className="text-xs font-semibold mt-0.5"
            style={{ color: completion === 100 ? '#15803d' : '#b45309' }}>
            {completion === 100 ? 'Complete' : `${completion}%`}
          </p>
        </div>
      </div>

      {/* Profile completion bar */}
      {completion < 100 && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ background: completion > 60 ? '#ca8a04' : '#dc2626' }}
          />
        </div>
      )}

      {/* Status */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1" style={{ color: member.is_active ? '#15803d' : 'var(--text-muted)' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: member.is_active ? '#16a34a' : '#94a3b8' }} />
          {member.is_active ? 'Active' : 'Inactive'}
        </span>
        {member.salary_amount_pesewas && (
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {formatGhs(member.salary_amount_pesewas)}/{member.salary_period?.replace('ly','') ?? 'mo'}
          </span>
        )}
      </div>

      {/* Last seen */}
      <div className="flex items-center gap-1.5 text-[10px] pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--surface-border)' }}>
        <Clock size={10} />
        <span>Last seen {lastSeenLabel}</span>
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 space-y-3"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="flex flex-col items-center gap-2 pt-2">
            <div className="skeleton h-16 w-16 rounded-full" />
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-2.5 w-16 rounded" />
          </div>
          <div className="skeleton h-5 w-20 rounded-full mx-auto" />
          <div className="grid grid-cols-2 gap-2">
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <div className="skeleton h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-2.5 w-24 rounded" />
          </div>
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full hidden md:block" />
          <div className="skeleton h-5 w-14 rounded-full hidden lg:block" />
        </div>
      ))}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  search, setSearch, roleFilter, setRoleFilter,
  statusFilter, setStatusFilter, dutyFilter, setDutyFilter,
}: {
  search: string; setSearch: (v: string) => void;
  roleFilter: string; setRoleFilter: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  dutyFilter: string; setDutyFilter: (v: string) => void;
}) {
  const hasFilters = roleFilter !== 'all' || statusFilter !== 'all' || dutyFilter !== 'all';

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, role, position…"
          className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
        className="rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}>
        <option value="all">All roles</option>
        {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'se_admin').map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}>
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <select value={dutyFilter} onChange={(e) => setDutyFilter(e.target.value)}
        className="rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}>
        <option value="all">All duty</option>
        <option value="on">On duty</option>
        <option value="off">Off duty</option>
      </select>

      {hasFilters && (
        <button onClick={() => { setRoleFilter('all'); setStatusFilter('all'); setDutyFilter('all'); }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium"
          style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <X size={13} /> Clear filters
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const shouldReduceMotion = useReducedMotion();
  const [tab, setTab] = useState<'roster' | 'activity'>('roster');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dutyFilter, setDutyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailTarget, setDetailTarget] = useState<StaffMember | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(true);
  const [resetPwTarget, setResetPwTarget] = useState<StaffMember | null>(null);
  const [resetPwNew, setResetPwNew] = useState('');
  const [resetPwConfirm, setResetPwConfirm] = useState('');
  const [resetPwShow, setResetPwShow] = useState(false);
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [resetPwError, setResetPwError] = useState('');

  const {
    data,
    loading,
    refetch,
    error: listStaffError,
  } = useQuery<{ listStaff: StaffMember[] }>(LIST_STAFF, {
    skip: !user,
    variables: user?.branch_id ? { branchId: user.branch_id } : {},
    pollInterval: 30_000,
  });

  const { data: sessionData, loading: sessionLoading, error: sessionError } =
    useQuery<{ staffSessionHistory: StaffSessionRow[] }>(STAFF_SESSION_HISTORY, {
      skip: !user || tab !== 'activity',
      variables: { limit: itemsPerPage, offset: (activityPage - 1) * itemsPerPage },
      fetchPolicy: 'network-only',
    });

  const { data: detailData, loading: detailLoading, error: detailError } =
    useQuery<{ staffMember: StaffMember }>(STAFF_MEMBER, {
      skip: !showDetails || !detailTarget,
      variables: detailTarget ? { userId: detailTarget.id } : undefined,
      fetchPolicy: 'network-only',
    });

  const [deactivate] = useMutation(DEACTIVATE_STAFF, { onCompleted: () => refetch() });
  const [deleteStaff] = useMutation(DELETE_STAFF, { onCompleted: () => refetch() });
  const [resetPassword] = useMutation(RESET_STAFF_PASSWORD);
  const [generatePassword] = useMutation(GENERATE_STAFF_PASSWORD);
  const [updateStaffProfile] = useMutation(UPDATE_STAFF_PROFILE, { onCompleted: () => refetch() });
  const [generatedPw, setGeneratedPw] = useState<{ name: string; email?: string; password: string } | null>(null);

  const canManage = user && ['owner', 'se_admin', 'manager'].includes(user.role);
  const showBranchColumn = user && ['owner', 'se_admin'].includes(user.role);

  const allStaff = data?.listStaff ?? [];

  const filtered = useMemo(() => {
    return allStaff.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        (s.position ?? '').toLowerCase().includes(q) ||
        (s.department ?? '').toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || s.role === roleFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' ? s.is_active : !s.is_active);
      const matchDuty = dutyFilter === 'all' ||
        (dutyFilter === 'on' ? s.is_on_duty : !s.is_on_duty);
      return matchSearch && matchRole && matchStatus && matchDuty;
    });
  }, [allStaff, search, roleFilter, statusFilter, dutyFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const incompleteCount = allStaff.filter((s) => computeProfileCompletion(s) < 100).length;
  const sessions = sessionData?.staffSessionHistory ?? [];
  const sessionHasNext = sessions.length === itemsPerPage;

  useEffect(() => { setCurrentPage(1); }, [search, roleFilter, statusFilter, dutyFilter]);
  useEffect(() => { setActivityPage(1); }, [tab]);

  function handleGeneratePw(member: StaffMember) {
    void (async () => {
      try {
        const { data } = await generatePassword({ variables: { userId: member.id } });
        setGeneratedPw({ name: member.name, email: member.email, password: data.generateStaffPassword.temporaryPassword });
      } catch (err: unknown) {
        toastError('Failed to generate password', err instanceof Error ? err.message : 'Unknown error');
      }
    })();
  }

  function handleDelete(member: StaffMember) {
    void (async () => {
      const ok = await confirm({
        title: `Delete ${member.name} permanently?`,
        message: 'This only works for deactivated staff without historical records. This action cannot be undone.',
        confirmLabel: 'Delete permanently',
        danger: true,
      });
      if (!ok) return;
      try {
        await deleteStaff({ variables: { userId: member.id } });
        toastSuccess(`${member.name} deleted`);
      } catch (err: unknown) {
        toastError('Delete failed', err instanceof Error ? err.message : 'Unknown error');
      }
    })();
  }

  function handleResetPw(member: StaffMember) {
    setResetPwTarget(member);
    setResetPwNew('');
    setResetPwConfirm('');
    setResetPwShow(false);
    setResetPwError('');
  }

  async function submitResetPw() {
    if (!resetPwTarget) return;
    if (resetPwNew.length < 8) { setResetPwError('Password must be at least 8 characters.'); return; }
    if (resetPwNew !== resetPwConfirm) { setResetPwError('Passwords do not match.'); return; }
    setResetPwLoading(true);
    setResetPwError('');
    try {
      await resetPassword({ variables: { input: { userId: resetPwTarget.id, newPassword: resetPwNew } } });
      toastSuccess(`Password reset for ${resetPwTarget.name}`);
      setResetPwTarget(null);
    } catch (err: unknown) {
      setResetPwError(err instanceof Error ? err.message : 'Reset failed. Please try again.');
    } finally {
      setResetPwLoading(false);
    }
  }

  function handleDeactivate(member: StaffMember) {
    void (async () => {
      const ok = await confirm({ title: `Deactivate ${member.name}?`, message: 'They will be logged out immediately and cannot sign in.', confirmLabel: 'Deactivate', danger: true });
      if (!ok) return;
      void deactivate({ variables: { userId: member.id } });
    })();
  }

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Reset password modal */}
      <AnimatePresence>
        {resetPwTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !resetPwLoading && setResetPwTarget(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(13,148,136,0.1)' }}>
                    <KeyRound size={18} style={{ color: '#0d9488' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{resetPwTarget.name}</p>
                  </div>
                </div>
                <button onClick={() => setResetPwTarget(null)} className="rounded-lg p-1.5 hover:bg-[rgba(0,0,0,0.06)] transition-colors" disabled={resetPwLoading}>
                  <X size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  New password
                  <div className="relative mt-1">
                    <input
                      autoFocus
                      type={resetPwShow ? 'text' : 'password'}
                      value={resetPwNew}
                      onChange={e => { setResetPwNew(e.target.value); setResetPwError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') void submitResetPw(); }}
                      placeholder="Min 8 characters"
                      className="w-full rounded-xl border px-3 py-2.5 pr-10 text-sm outline-none"
                      style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setResetPwShow(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {resetPwShow ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>

                <label className="block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Confirm password
                  <input
                    type={resetPwShow ? 'text' : 'password'}
                    value={resetPwConfirm}
                    onChange={e => { setResetPwConfirm(e.target.value); setResetPwError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') void submitResetPw(); }}
                    placeholder="Repeat new password"
                    className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--surface-base)', borderColor: resetPwError && resetPwConfirm && resetPwNew !== resetPwConfirm ? '#dc2626' : 'var(--surface-border)', color: 'var(--text-primary)' }}
                  />
                </label>
              </div>

              {resetPwError && (
                <p className="rounded-lg px-3 py-2 text-xs font-medium text-red-700" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  {resetPwError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setResetPwTarget(null)}
                  disabled={resetPwLoading}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void submitResetPw()}
                  disabled={resetPwLoading || resetPwNew.length < 8 || resetPwNew !== resetPwConfirm}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-teal)' }}
                >
                  {resetPwLoading ? 'Saving…' : 'Reset Password'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated password modal */}
      {generatedPw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(13,148,136,0.1)' }}>
                <KeyRound size={18} style={{ color: '#0d9488' }} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Password Generated</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{generatedPw.name}</p>
              </div>
            </div>

            {/* Email delivery status */}
            {generatedPw.email ? (
              <div className="rounded-xl px-3 py-2.5 text-xs font-medium flex items-center gap-2" style={{ background: 'rgba(6,95,70,0.08)', border: '1px solid rgba(6,95,70,0.2)', color: '#065f46' }}>
                <span>✅</span>
                <span>Login details sent to <strong>{generatedPw.email}</strong></span>
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2.5 text-xs font-medium flex items-center gap-2" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: '#92400e' }}>
                <span>⚠️</span>
                <span>No email on file — share this password manually</span>
              </div>
            )}

            {/* Password box */}
            <div className="rounded-xl p-4 space-y-1" style={{ background: 'rgba(232,168,56,0.08)', border: '1px solid rgba(232,168,56,0.3)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#92400e' }}>Temporary password</p>
              <p className="select-all font-mono text-xl font-bold tracking-wide break-all" style={{ color: '#78350f' }}>{generatedPw.password}</p>
              <p className="text-[10px]" style={{ color: '#b45309' }}>Shown once — staff must change it on first login.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => { void navigator.clipboard.writeText(generatedPw.password); toastSuccess('Password copied'); }}
                className="flex-1 rounded-xl py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.2)' }}
              >
                Copy password
              </button>
              <button
                onClick={() => setGeneratedPw(null)}
                className="flex-1 rounded-xl py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface-base)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {listStaffError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <p className="font-semibold">Could not load staff</p>
          <p className="mt-1 text-xs font-medium">{formatApolloError(listStaffError)}</p>
        </div>
      ) : null}
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #004e57 0%, #006d77 50%, #0e7490 100%)',
          boxShadow: '0 4px 24px rgba(0,109,119,0.3)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <Users size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Staff Command Center</h1>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {allStaff.length} team member{allStaff.length !== 1 ? 's' : ''} ·{' '}
                  <span className="inline-flex items-center gap-1" style={{ color: '#86efac' }}>
                    <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
                    {allStaff.filter((s) => s.is_on_duty).length} on duty now
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Tab switcher */}
            <div className="inline-flex rounded-xl p-0.5"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
              {(['roster', 'activity'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors capitalize"
                  style={{
                    background: tab === t ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  }}>
                  {t === 'activity' ? <span className="flex items-center gap-1.5"><LogIn size={13} />Sign-in activity</span> : 'Team roster'}
                </button>
              ))}
            </div>

            {/* View toggle (roster only) */}
            {tab === 'roster' && (
              <div className="inline-flex rounded-xl p-0.5"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                {([['grid', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
                  <button key={mode} type="button" onClick={() => setViewMode(mode)}
                    className="rounded-lg p-2 transition-colors"
                    style={{
                      background: viewMode === mode ? 'rgba(255,255,255,0.2)' : 'transparent',
                      color: viewMode === mode ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    }}>
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            )}

            {canManage && tab === 'roster' && (
              <button onClick={() => setShowInvite(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', minHeight: 44, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
                <UserPlus size={15} /> Invite staff
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {tab === 'roster' && (
        <>
          <StaffKpiBar staff={allStaff} />

          {/* Incomplete banner */}
          <AnimatePresence>
            {canManage && showCompletionBanner && incompleteCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.22)' }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} style={{ color: '#b45309' }} />
                  <p className="text-sm font-medium" style={{ color: '#92400e' }}>
                    {incompleteCount} staff profile{incompleteCount > 1 ? 's' : ''} need completion
                  </p>
                </div>
                <button onClick={() => setShowCompletionBanner(false)}
                  className="rounded-lg px-3 py-1 text-xs font-medium"
                  style={{ border: '1px solid rgba(217,119,6,0.35)', color: '#9a3412' }}>
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <FilterBar
            search={search} setSearch={setSearch}
            roleFilter={roleFilter} setRoleFilter={setRoleFilter}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            dutyFilter={dutyFilter} setDutyFilter={setDutyFilter}
          />

          {/* View toggle — prominent below filters */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} staff member{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="inline-flex rounded-xl p-1" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              {([['grid', LayoutGrid, 'Cards'], ['list', List, 'List']] as const).map(([mode, Icon, label]) => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: viewMode === mode ? 'var(--color-teal)' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                    boxShadow: viewMode === mode ? '0 2px 8px rgba(13,148,136,0.3)' : 'none',
                  }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid view */}
          {viewMode === 'grid' && (
            loading ? <GridSkeleton /> : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {paginated.map((member) => (
                      <StaffCard
                        key={member.id}
                        member={member}
                        canManage={!!canManage}
                        currentUserId={user?.id}
                        onView={() => { setDetailTarget(member); setShowDetails(true); }}
                        onEdit={() => { setEditingMember(member); setShowEdit(true); }}
                        onDeactivate={() => handleDeactivate(member)}
                        onDelete={() => handleDelete(member)}
                        onResetPw={() => handleResetPw(member)}
                        onGeneratePw={() => handleGeneratePw(member)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {filtered.length === 0 && (
                  <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No staff members match your filters.
                  </div>
                )}
              </>
            )
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div className="rounded-2xl overflow-x-auto"
              style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
              {loading ? <TableSkeleton /> : (
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wide"
                      style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-muted)' }}>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 hidden md:table-cell">Position</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Salary</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Profile</th>
                      <th className="px-4 py-3">Status</th>
                      {canManage && <th className="px-4 py-3 w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {paginated.map((member, i) => {
                        const rc = ROLE_COLORS[member.role] ?? ROLE_COLORS.cashier;
                        const completion = computeProfileCompletion(member);
                        return (
                          <motion.tr key={member.id}
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{ borderBottom: '1px solid var(--surface-border)' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <StaffAvatar member={member} size={40} />
                                <div>
                                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                                  {member.email && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{member.email}</p>}
                                  {completion < 100 && (
                                    <p className="text-[11px] font-semibold" style={{ color: '#b45309' }}>Profile incomplete</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{ background: rc.bg, color: rc.text }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: rc.dot }} />
                                {ROLE_LABELS[member.role] ?? member.role}
                              </span>
                            </td>
                            <td className="hidden px-4 py-3 text-xs md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                              {member.position ?? '—'}
                            </td>
                            <td className="hidden px-4 py-3 text-xs lg:table-cell font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {member.salary_amount_pesewas
                                ? `${formatGhs(member.salary_amount_pesewas)}/${member.salary_period?.replace('ly','') ?? 'mo'}`
                                : '—'}
                            </td>
                            <td className="hidden px-4 py-3 lg:table-cell">
                              <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                                style={completion === 100
                                  ? { background: 'rgba(22,163,74,0.1)', color: '#15803d' }
                                  : { background: 'rgba(217,119,6,0.12)', color: '#92400e' }}>
                                {completion === 100 ? 'Complete' : `${completion}%`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                                style={member.is_active
                                  ? { background: 'rgba(22,163,74,0.1)', color: '#15803d' }
                                  : { background: 'var(--surface-border)', color: 'var(--text-muted)' }}>
                                <span className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: member.is_active ? '#16a34a' : '#94a3b8' }} />
                                {member.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {canManage && (
                              <td className="relative px-4 py-3">
                                <ListRowMenu
                                  member={member}
                                  isLast={i >= paginated.length - 2 && paginated.length > 2}
                                  currentUserId={user?.id}
                                  onView={() => { setDetailTarget(member); setShowDetails(true); }}
                                  onEdit={() => { setEditingMember(member); setShowEdit(true); }}
                                  onDeactivate={() => handleDeactivate(member)}
                                  onDelete={() => handleDelete(member)}
                                  onResetPw={() => handleResetPw(member)}
                                  onGeneratePw={() => handleGeneratePw(member)}
                                />
                              </td>
                            )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                    {!loading && paginated.length === 0 && (
                      <tr>
                        <td colSpan={canManage ? 7 : 6} className="px-4 py-12 text-center text-sm"
                          style={{ color: 'var(--text-muted)' }}>
                          No staff members match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {!loading && filtered.length > 0 && (
                <Pagination currentPage={currentPage} totalPages={totalPages}
                  onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
              )}
            </div>
          )}

          {/* Grid pagination */}
          {viewMode === 'grid' && !loading && filtered.length > itemsPerPage && (
            <div className="mt-4">
              <Pagination currentPage={currentPage} totalPages={totalPages}
                onPageChange={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
            </div>
          )}
        </>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <ActivityTab
          sessions={sessions}
          loading={sessionLoading}
          error={sessionError ? formatApolloError(sessionError) : null}
          showBranchColumn={!!showBranchColumn}
          page={activityPage}
          hasNext={sessionHasNext}
          onPrev={() => setActivityPage((p) => Math.max(1, p - 1))}
          onNext={() => setActivityPage((p) => p + 1)}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {showInvite && (
          <InviteModal
            onClose={() => setShowInvite(false)}
            onSuccess={() => { setShowInvite(false); void refetch(); }}
            onCompleteProfile={(invited) => {
              setShowInvite(false);
              const existing = allStaff.find((s) => s.id === invited.userId);
              setEditingMember(existing ?? {
                id: invited.userId, name: invited.name, email: invited.email ?? undefined,
                role: invited.role, branch_id: user?.branch_id ?? '', is_active: true,
                is_on_duty: false, created_at: new Date().toISOString(),
              });
              setShowEdit(true);
              void refetch();
            }}
          />
        )}
        {showEdit && editingMember && (
          <EditStaffModal
            member={editingMember}
            onClose={() => { setShowEdit(false); setEditingMember(null); }}
            onSave={async (input) => {
              await updateStaffProfile({ variables: { input } });
              setShowEdit(false);
              setEditingMember(null);
            }}
          />
        )}
        {showDetails && detailTarget && (
          <StaffDetailsModal
            member={detailData?.staffMember ?? detailTarget}
            loading={detailLoading}
            errorMessage={formatApolloError(detailError)}
            onEdit={() => {
              setShowDetails(false);
              setDetailTarget(null);
              setEditingMember(detailData?.staffMember ?? detailTarget);
              setShowEdit(true);
            }}
            onClose={() => { setShowDetails(false); setDetailTarget(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── List row menu ─────────────────────────────────────────────────────────────

function ListRowMenu({ member, isLast, currentUserId, onView, onEdit, onDeactivate, onDelete, onResetPw, onGeneratePw }: {
  member: StaffMember; isLast: boolean; currentUserId?: string;
  onView: () => void; onEdit: () => void; onDeactivate: () => void; onDelete: () => void; onResetPw: () => void; onGeneratePw: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} className="rounded p-1 transition-colors"
        style={{ color: 'var(--text-muted)' }} aria-label="Actions">
        <MoreVertical size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn('absolute right-4 z-10 w-44 rounded-xl py-1', isLast ? 'bottom-8 mb-2' : 'top-10')}
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}>
            {[
              { icon: Eye, label: 'View details', action: onView },
              { icon: PencilLine, label: 'Edit profile', action: onEdit },
              { icon: KeyRound, label: 'Generate password', action: onGeneratePw },
              { icon: KeyRound, label: 'Reset password', action: onResetPw },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={() => { setOpen(false); action(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-secondary)' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
            {member.is_active && member.id !== currentUserId && (
              <button onClick={() => { setOpen(false); onDeactivate(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-red-50"
                style={{ color: '#dc2626' }}>
                <ShieldOff size={13} /> Deactivate
              </button>
            )}
            {!member.is_active && member.id !== currentUserId && (
              <button onClick={() => { setOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-red-50"
                style={{ color: '#b91c1c' }}>
                <Trash2 size={13} /> Delete permanently
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({ sessions, loading, error, showBranchColumn, page, hasNext, onPrev, onNext }: {
  sessions: StaffSessionRow[]; loading: boolean; error: string | null;
  showBranchColumn: boolean; page: number; hasNext: boolean;
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: 'var(--surface-border)', background: 'linear-gradient(135deg, rgba(0,109,119,0.06), rgba(0,109,119,0.02))' }}>
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5" style={{ background: 'rgba(22,163,74,0.12)' }}>
            <Wifi size={14} style={{ color: '#16a34a' }} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Live Sign-In Activity</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Last 14 Accra calendar days · auto-refreshes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#16a34a' }} />
            Active
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: '#94a3b8' }} />
            Ended
          </span>
        </div>
      </div>
      {error && <p className="px-5 py-3 text-sm" style={{ color: '#dc2626' }}>{error}</p>}
      {loading ? <TableSkeleton /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider"
                style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-4 py-3">Role</th>
                {showBranchColumn && <th className="px-4 py-3 hidden md:table-cell">Branch</th>}
                <th className="px-4 py-3">Signed In</th>
                <th className="px-4 py-3 hidden lg:table-cell">Last Active</th>
                <th className="px-4 py-3">Ended</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => {
                const rc = ROLE_COLORS[row.user_role] ?? ROLE_COLORS.cashier;
                return (
                  <tr key={row.id}
                    className="transition-colors hover:bg-[rgba(0,0,0,0.015)]"
                    style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: avatarGradient(row.user_name) }}>
                          {getInitials(row.user_name)}
                          {row.is_open && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                              style={{ background: '#16a34a', borderColor: 'var(--surface-card)' }} />
                          )}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{row.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: rc.bg, color: rc.text }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: rc.dot }} />
                        {ROLE_LABELS[row.user_role] ?? row.user_role}
                      </span>
                    </td>
                    {showBranchColumn && (
                      <td className="hidden px-4 py-3 text-xs md:table-cell" style={{ color: 'var(--text-muted)' }}>
                        {row.branch_name}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {formatAccraDateTime(row.started_at)}
                    </td>
                    <td className="hidden px-4 py-3 text-xs font-mono lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {formatAccraDateTime(row.last_seen_at)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {row.ended_at ? formatAccraDateTime(row.ended_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.is_open ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
                          style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d', border: '1px solid rgba(22,163,74,0.2)' }}>
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: '#4ade80' }} />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: '#16a34a' }} />
                          </span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
                          style={{ background: 'var(--surface-base)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#94a3b8' }} />
                          Ended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/staff/${row.userId}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all hover:scale-105"
                        style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal)' }}>
                        <Eye size={11} /> View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && sessions.length === 0 && !error && (
                <tr>
                  <td colSpan={showBranchColumn ? 8 : 7} className="px-5 py-16 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'rgba(0,109,119,0.08)' }}>
                      <Clock size={20} style={{ color: 'var(--color-teal)' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No sign-in activity yet</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Activity will appear here when staff members log in.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {(sessions.length > 0 || page > 1) && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3"
          style={{ borderColor: 'var(--surface-border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page}{hasNext ? ' · more available' : ''}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={onPrev}
              className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              Previous
            </button>
            <button type="button" disabled={!hasNext} onClick={onNext}
              className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-40"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Staff details modal ───────────────────────────────────────────────────────

function StaffDetailsModal({ member, loading, errorMessage, onEdit, onClose }: {
  member: StaffMember; loading: boolean; errorMessage: string | null;
  onEdit: () => void; onClose: () => void;
}) {
  const rc = ROLE_COLORS[member.role] ?? ROLE_COLORS.cashier;
  const completion = computeProfileCompletion(member);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}>

        {/* Header with avatar */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <div className="flex items-start gap-4">
            <StaffAvatar member={member} size={64} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{member.name}</h2>
                {member.is_on_duty && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    On duty
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: rc.bg, color: rc.text }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: rc.dot }} />
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              {member.position && (
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{member.position}</p>
              )}
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Profile completion bar */}
          {completion < 100 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: '#b45309' }}>Profile {completion}% complete</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${completion}%`, background: '#ca8a04' }} />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        ) : errorMessage ? (
          <div className="px-6 py-4 text-sm" style={{ color: '#dc2626' }}>{errorMessage}</div>
        ) : (
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Employment */}
            <Section title="Employment" icon={Briefcase}>
              <DetailRow icon={Building2} label="Department" value={member.department} />
              <DetailRow icon={Briefcase} label="Type" value={member.employment_type ? EMPLOYMENT_LABELS[member.employment_type] : undefined} />
              <DetailRow icon={Calendar} label="Start date" value={member.start_date ? formatAccraDate(member.start_date) : undefined} />
              <DetailRow icon={Users} label="Branch ID" value={member.branch_id} mono />
            </Section>

            {/* Compensation */}
            <Section title="Compensation (GHS)" icon={Banknote}>
              <DetailRow icon={Banknote} label="Salary"
                value={member.salary_amount_pesewas
                  ? `${formatGhs(member.salary_amount_pesewas)} / ${member.salary_period ?? 'monthly'}`
                  : undefined} />
              <DetailRow icon={Building2} label="Bank" value={member.bank_name} />
            </Section>

            {/* Compliance */}
            {(member.role === 'pharmacist' || member.role === 'head_pharmacist' || member.professional_licence_no) && (
              <Section title="Ghana FDA Compliance" icon={BadgeCheck}>
                <DetailRow icon={BadgeCheck} label="Licence no." value={member.professional_licence_no} mono />
                <DetailRow icon={Calendar} label="Licence expiry"
                  value={member.licence_expiry_date ? formatAccraDate(member.licence_expiry_date) : undefined} />
                <DetailRow icon={GraduationCap} label="Certificates"
                  value={(member.certificate_s3_keys?.length ?? 0) > 0
                    ? `${member.certificate_s3_keys?.length} file(s) on S3` : undefined} />
              </Section>
            )}

            {/* Contact */}
            <Section title="Account" icon={Phone}>
              <DetailRow icon={Phone} label="Email" value={member.email} />
              <DetailRow icon={Phone} label="Phone" value={member.phone} />
              <DetailRow icon={Calendar} label="Joined" value={formatAccraDate(member.created_at)} />
              <DetailRow icon={BadgeCheck} label="Account status"
                value={member.is_active ? 'Active' : 'Deactivated'}
                valueColor={member.is_active ? '#15803d' : '#dc2626'} />
              <DetailRow icon={Wifi} label="Online status"
                value={member.is_on_duty ? '🟢 Online now' : '⚫ Offline'}
                valueColor={member.is_on_duty ? '#15803d' : '#64748b'} />
            </Section>

            {/* Recent Activity */}
            <StaffActivitySection userId={member.id} />
          </div>
        )}

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium"
            style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
            Close
          </button>
          <button type="button" onClick={onEdit}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--color-teal)' }}>
            Edit profile
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} style={{ color: 'var(--color-teal)' }} />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{title}</p>
      </div>
      <div
        className="rounded-xl divide-y divide-[var(--surface-border)]"
        style={{ border: '1px solid var(--surface-border)' }}
      >
        {children}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono, valueColor }: {
  icon: LucideIcon; label: string; value?: string | null;
  mono?: boolean; valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span className={cn('text-xs font-medium truncate', mono && 'font-mono')}
        style={{ color: valueColor ?? (value ? 'var(--text-primary)' : 'var(--text-muted)') }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

// ── Staff Activity Section ────────────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, { label: string; color: string }> = {
  STAFF_ACTIVITY: { label: 'Page/Service', color: '#2563eb' },
  STOCK_RECEIVED: { label: 'Stock Received', color: '#0f766e' },
  STOCK_ADJUSTED: { label: 'Stock Adjusted', color: '#d97706' },
  SALE_COMPLETED: { label: 'Sale', color: '#16a34a' },
  GRN_CREATED_FROM_OCR: { label: 'Invoice OCR', color: '#7c3aed' },
  STAFF_INVITED: { label: 'Staff Invited', color: '#2563eb' },
  STAFF_DEACTIVATED: { label: 'Staff Deactivated', color: '#dc2626' },
  PASSWORD_RESET: { label: 'Password Reset', color: '#d97706' },
  LOW_STOCK_ALERT_NOTIFICATION: { label: 'Stock Alert', color: '#ea580c' },
  PRICE_CHANGED: { label: 'Price Change', color: '#7c3aed' },
};

function StaffActivitySection({ userId }: { userId: string }) {
  const pageSize = 12;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [userId]);

  const { data, loading } = useQuery(STAFF_ACTIVITY_LOG, {
    variables: { userId, limit: pageSize, offset: (page - 1) * pageSize },
    fetchPolicy: 'cache-and-network',
  });

  const activities = data?.staffActivityLog ?? [];
  const hasNext = activities.length === pageSize;

  return (
    <Section title="Recent Activity" icon={Activity}>
      {loading && activities.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading activity…</div>
      ) : activities.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No activity recorded yet</div>
      ) : (
        <>
          <div className="max-h-48 overflow-y-auto">
            {activities.map((a: any) => {
              const info = ACTIVITY_LABELS[a.type] ?? { label: a.type, color: '#64748b' };
              return (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 gap-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: info.color }} />
                    <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {info.label}
                    </span>
                    {a.operation && a.type === 'STAFF_ACTIVITY' && (
                      <span className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        {a.operation}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.durationMs && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {a.durationMs}ms
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(a.createdAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra', timeStyle: 'short', dateStyle: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Page {page}{hasNext ? ' · more available' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
                style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({ onClose, onSuccess, onCompleteProfile }: {
  onClose: () => void;
  onSuccess: () => void;
  onCompleteProfile: (r: { userId: string; name: string; email?: string | null; role: string }) => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', role: 'cashier', position: '', department: '' });
  const [result, setResult] = useState<{
    userId: string; name: string; email?: string | null; role: string;
    temporaryPassword: string; emailSent: boolean; message: string;
  } | null>(null);

  const [invite, { loading, error }] = useMutation(INVITE_STAFF, {
    onCompleted: (d: { inviteStaff: typeof result }) => setResult(d.inviteStaff),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}>

        {result ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: 'rgba(22,163,74,0.1)' }}>
                <UserCheck size={18} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Staff invited</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{result.message}</p>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-3 space-y-1.5 text-xs"
              style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
              <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Name:</span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{result.name}</span></p>
              <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Role:</span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{ROLE_LABELS[result.role] ?? result.role}</span></p>
              {result.email && <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Email:</span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{result.email}</span></p>}
            </div>

            <div className="rounded-xl p-3 mb-4"
              style={{ background: 'rgba(232,168,56,0.1)', border: '1px solid rgba(232,168,56,0.3)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: '#92400e' }}>Temporary password — share securely</p>
              <p className="font-mono text-base font-bold" style={{ color: '#78350f' }}>{result.temporaryPassword}</p>
              <p className="text-[10px] mt-1" style={{ color: '#b45309' }}>Staff must change this on first login.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onSuccess}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                Done
              </button>
              <button onClick={() => onCompleteProfile(result)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--color-teal)' }}>
                Complete profile →
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Invite staff member</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void invite({ variables: { input: form } }); }}
              className="space-y-3">
              <Field label="Full name" required>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input" placeholder="Ama Mensah" />
              </Field>
              <Field label="Work email">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input" placeholder="ama@azzaypharmacy.com" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role" required>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                    {INVITE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                  </select>
                </Field>
                <Field label="Position">
                  <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="input" placeholder="e.g. Pharmacist" />
                </Field>
              </div>
              <Field label="Department">
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="input" placeholder="e.g. Dispensary" />
              </Field>
              {error && <p className="text-xs" style={{ color: '#dc2626' }}>{formatApolloError(error)}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                  style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'var(--color-teal)' }}>
                  {loading ? 'Inviting…' : 'Send invite'}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#dc2626' }}>*</span>}
      </span>
      {children}
    </label>
  );
}

// ── Edit staff modal (full onboarding form) ───────────────────────────────────

function EditStaffModal({ member, onClose, onSave }: {
  member: StaffMember;
  onClose: () => void;
  onSave: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [form, setForm] = useState({
    email: member.email ?? '',
    phone: member.phone ?? '',
    position: member.position ?? '',
    department: member.department ?? '',
    employment_type: member.employment_type ?? '',
    professional_licence_no: member.professional_licence_no ?? '',
    licence_expiry_date: toDateInputValue(member.licence_expiry_date),
    start_date: toDateInputValue(member.start_date),
    photo_url: member.photo_url ?? '',
    salary_amount_pesewas: member.salary_amount_pesewas ? String(member.salary_amount_pesewas / 100) : '',
    salary_period: member.salary_period ?? 'monthly',
    bank_name: member.bank_name ?? '',
  });

  const steps = ['Employment', 'Compensation', 'Compliance', 'Photo'];
  const isPharmacist = member.role === 'pharmacist' || member.role === 'head_pharmacist';

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSave() {
    setSaving(true);
    try {
      const salaryPesewas = form.salary_amount_pesewas
        ? Math.round(parseFloat(form.salary_amount_pesewas) * 100) : undefined;
      await onSave({
        userId: member.id,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        position: form.position.trim() || undefined,
        department: form.department.trim() || undefined,
        employment_type: form.employment_type || undefined,
        professional_licence_no: form.professional_licence_no.trim() || undefined,
        licence_expiry_date: form.licence_expiry_date || undefined,
        start_date: form.start_date || undefined,
        photo_url: form.photo_url.trim() || undefined,
        salary_amount_pesewas: salaryPesewas,
        salary_period: form.salary_period || undefined,
        bank_name: form.bank_name.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-modal)' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Edit staff profile</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {member.name} · {ROLE_LABELS[member.role] ?? member.role}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-[var(--surface-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          {/* Step tabs */}
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <button key={s} type="button" onClick={() => setStep(i)}
                className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: step === i ? 'var(--color-teal)' : 'var(--surface-base)',
                  color: step === i ? '#fff' : 'var(--text-muted)',
                  border: step === i ? 'none' : '1px solid var(--surface-border)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 space-y-3 max-h-[55vh] overflow-y-auto">
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email address">
                  <input type="email" value={form.email} onChange={f('email')} className="input" placeholder="e.g. staff@azzaypharmacy.com" />
                </Field>
                <Field label="Phone number">
                  <input type="tel" value={form.phone} onChange={f('phone')} className="input" placeholder="e.g. 0244123456" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position">
                  <input value={form.position} onChange={f('position')} className="input" placeholder="e.g. Senior Pharmacist" />
                </Field>
                <Field label="Department">
                  <input value={form.department} onChange={f('department')} className="input" placeholder="e.g. Dispensary" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Employment type">
                  <select value={form.employment_type} onChange={f('employment_type')} className="input">
                    <option value="">Select…</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </Field>
                <Field label="Start date">
                  <input type="date" value={form.start_date} onChange={f('start_date')} className="input" />
                </Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="rounded-xl p-3 mb-1 text-xs"
                style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.15)', color: 'var(--text-secondary)' }}>
                All amounts in Ghana Cedis (GH₵). Never USD.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Salary (GH₵)">
                  <input type="number" min="0" step="0.01" value={form.salary_amount_pesewas}
                    onChange={f('salary_amount_pesewas')} className="input" placeholder="e.g. 2500.00" />
                </Field>
                <Field label="Period">
                  <select value={form.salary_period} onChange={f('salary_period')} className="input">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </Field>
              </div>
              <Field label="Bank name">
                <input value={form.bank_name} onChange={f('bank_name')} className="input"
                  placeholder="e.g. GCB Bank, Ecobank" />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              {isPharmacist ? (
                <>
                  <div className="rounded-xl p-3 text-xs"
                    style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.15)', color: 'var(--text-secondary)' }}>
                    Ghana FDA requires a valid GMDC licence for all pharmacist roles.
                  </div>
                  <Field label="GMDC Licence number">
                    <input value={form.professional_licence_no} onChange={f('professional_licence_no')}
                      className="input" placeholder="e.g. GMDC-2024-XXXXX" />
                  </Field>
                  <Field label="Licence expiry date">
                    <input type="date" value={form.licence_expiry_date} onChange={f('licence_expiry_date')} className="input" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Professional licence no. (optional)">
                    <input value={form.professional_licence_no} onChange={f('professional_licence_no')}
                      className="input" placeholder="Optional" />
                  </Field>
                  <Field label="Licence expiry date">
                    <input type="date" value={form.licence_expiry_date} onChange={f('licence_expiry_date')} className="input" />
                  </Field>
                </>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Add a profile photo via URL or upload from your device
              </p>

              {/* Upload option */}
              <Field label="Upload photo">
                <div className="flex items-center gap-3">
                  <label
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition-colors hover:border-teal/50"
                    style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // Convert to data URL for preview and storage
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = reader.result as string;
                          setPreviewBroken(false);
                          setForm((prev) => ({ ...prev, photo_url: dataUrl }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      Click to upload (JPG, PNG)
                    </span>
                  </label>
                </div>
              </Field>

              {/* OR divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
              </div>

              {/* URL option */}
              <Field label="Photo URL">
                <input type="url" value={form.photo_url.startsWith('data:') ? '' : form.photo_url} onChange={(e) => {
                  setPreviewBroken(false);
                  setForm((prev) => ({ ...prev, photo_url: e.target.value }));
                }} className="input" placeholder="https://example.com/photo.jpg" />
              </Field>

              {/* Preview */}
              {form.photo_url.trim() && (
                <div className="flex items-center gap-4 rounded-xl p-4 mt-2"
                  style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}>
                  {!previewBroken ? (
                    <img src={form.photo_url.trim()} alt="Preview"
                      className="h-20 w-20 rounded-2xl object-cover shrink-0"
                      style={{ border: '3px solid var(--surface-border)' }}
                      onError={() => setPreviewBroken(true)} />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface-border)' }}>
                      <X size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: previewBroken ? '#dc2626' : '#15803d' }}>
                      {previewBroken ? 'Could not load image — check URL or try uploading' : '✓ Preview looks good'}
                    </p>
                    {!previewBroken && (
                      <button type="button" onClick={() => { setForm(prev => ({ ...prev, photo_url: '' })); }}
                        className="mt-1 text-[10px] font-bold" style={{ color: '#dc2626' }}>
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--surface-border)' }}>
          <div className="flex gap-2">
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)}
              className="rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              Back
            </button>
            {step < steps.length - 1 && (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="rounded-xl px-4 py-2 text-sm font-medium"
                style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                Next
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--color-teal)' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
