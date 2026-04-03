'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { BrainCircuit, Sparkles, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/types';

interface AiCopilotBannerProps {
  role: UserRole;
  className?: string;
  /** `inline` = one compact row for executive dashboards. */
  variant?: 'default' | 'inline';
}

/**
 * Advisory AI strip — links to CFO briefing for finance roles; contextual copy for clinical / floor.
 * Spec 10: suggestions are advisory only; no auto-approval.
 */
export function AiCopilotBanner({ role, className = '', variant = 'default' }: AiCopilotBannerProps) {
  const reduce = useReducedMotion();
  const isFinance = ['owner', 'se_admin'].includes(role);
  const isClinical = ['head_pharmacist', 'pharmacist', 'technician'].includes(role);
  const isFloorCashier = role === 'cashier' || role === 'chemical_cashier';
  const isTechnician = role === 'technician';

  const title = isFinance
    ? 'Virtual CFO is live'
    : isClinical
      ? 'Clinical intelligence'
      : 'Smart operations';

  const body = isFinance
    ? 'Runway, revenue signals, and investment ideas — refreshed from your branch ledger.'
    : isClinical
      ? 'Drug interaction checks and Rx workflows stay rule-first; AI adds explanations where the API allows.'
      : 'Reorder hints and sales patterns will surface here as Spec 10 ships — GraphQL remains the source of truth.';

  const href = isFinance
    ? '/dashboard/cfo'
    : isClinical
      ? '/dashboard/prescriptions'
      : isTechnician
        ? '/dashboard/dispensing'
        : isFloorCashier
          ? '/dashboard/transactions'
          : '/dashboard/reports';
  const cta = isFinance
    ? 'Open briefing'
    : isClinical
      ? 'Review prescriptions'
      : isTechnician
        ? 'Open dispensing'
        : isFloorCashier
          ? 'View my sales'
          : 'View reports';

  if (variant === 'inline') {
    return (
      <motion.div
        className={`relative flex flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border px-3 py-2 ${className}`}
        style={{
          borderColor: 'rgba(0,109,119,0.22)',
          background: 'linear-gradient(90deg, rgba(0,109,119,0.08) 0%, rgba(232,168,56,0.06) 100%)',
        }}
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrainCircuit size={18} className="shrink-0 text-teal" strokeWidth={1.75} aria-hidden />
          <p className="truncate text-xs font-bold text-content-primary">{title}</p>
          <span className="hidden text-[11px] text-content-muted sm:inline">{body.slice(0, 72)}…</span>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
        >
          {cta}
          <ArrowRight size={12} />
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{
        borderColor: 'rgba(0,109,119,0.2)',
        background: 'linear-gradient(135deg, rgba(0,109,119,0.07) 0%, rgba(232,168,56,0.08) 100%)',
        boxShadow: 'var(--shadow-card)',
      }}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, var(--color-teal) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
          >
            <BrainCircuit size={22} strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-teal-dark)' }}>
              <Sparkles size={12} className="text-[var(--color-gold)]" aria-hidden />
              AI copilot
            </p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {body}
            </p>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-transform hover:opacity-95 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
        >
          {cta}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </motion.div>
  );
}
