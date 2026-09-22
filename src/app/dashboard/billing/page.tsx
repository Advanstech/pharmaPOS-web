'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@apollo/client';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';
import { CheckCircle2, Zap } from 'lucide-react';
import { formatGhs } from '@/lib/utils';
import { SUBSCRIPTION_OVERVIEW_QUERY } from '@/lib/graphql/auth.queries';

type TierKey = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

const TIERS = [
  {
    key: 'FREE',
    name: 'Free',
    priceGhs: 0,
    features: ['1 branch', '3 users', '500 products', '1,000 sales/month'],
    recommended: false,
  },
  {
    key: 'STARTER',
    name: 'Starter',
    priceGhs: 150,
    features: ['2 branches', '10 users', '5,000 products', '10,000 sales/month', 'SMS notifications'],
    recommended: false,
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    priceGhs: 500,
    features: ['5 branches', '50 users', '50,000 products', 'AI insights', 'Drug interaction checks', 'Priority support'],
    recommended: true,
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    priceGhs: null,
    features: ['Unlimited branches', 'Unlimited users', 'Custom integrations', 'Dedicated account manager', 'SLA 99.9%'],
    recommended: false,
  },
];

export default function BillingPage() {
  const shouldReduceMotion = useReducedMotion();
  const { data, loading, error } = useQuery(SUBSCRIPTION_OVERVIEW_QUERY);
  const errorDetail = useMemo(() => formatApolloError(error), [error]);
  const sub = data?.subscriptionOverview as {
    tier: TierKey;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    usage: { branches: number; users: number; products: number; sales: number };
    limits: { branches: number; users: number; products: number; sales: number };
  } | undefined;

  const USAGE_ITEMS = sub ? [
    { label: 'Branches', used: sub.usage.branches, max: sub.limits.branches },
    { label: 'Users', used: sub.usage.users, max: sub.limits.users },
    { label: 'Products', used: sub.usage.products, max: sub.limits.products },
    { label: 'Sales this month', used: sub.usage.sales, max: sub.limits.sales },
  ] as const : [];

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Billing</h1>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>Subscription · Usage · Invoices</p>
      </div>

      {loading && <div className="skeleton h-32 rounded-xl mb-6" />}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p className="font-semibold">Failed to load billing overview</p>
          {errorDetail ? (
            <p className="mt-1 text-xs opacity-90">{errorDetail}</p>
          ) : null}
        </div>
      )}

      {/* Current plan */}
      <div className="mb-6 rounded-xl p-5"
        style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.18)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-teal-dark)' }}>Current plan</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{sub?.tier ?? 'FREE'}</p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Renews {sub ? new Date(sub.currentPeriodEnd).toISOString().split('T')[0] : '—'} · Paid via MTN MoMo
            </p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
            {sub?.status ?? 'ACTIVE'}
          </span>
        </div>

        {/* Usage bars */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {USAGE_ITEMS.map((item) => {
            const pct = Math.min(100, (item.used / item.max) * 100);
            const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : 'var(--color-teal)';
            return (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {item.used.toLocaleString()} / {item.max.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, type: 'spring', stiffness: 60 }}
                    className="h-full rounded-full"
                    style={{ background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan cards */}
      <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Available plans</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier, i) => {
          const isCurrent = tier.key === (sub?.tier ?? 'FREE');
          return (
            <motion.div
              key={tier.key}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative rounded-xl p-5"
              style={{
                background: 'var(--surface-card)',
                border: tier.recommended
                  ? '2px solid var(--color-teal)'
                  : isCurrent
                  ? '2px solid var(--color-teal)'
                  : '1px solid var(--surface-border)',
                boxShadow: tier.recommended ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
              }}
            >
              {tier.recommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-medium text-white"
                  style={{ background: 'var(--color-teal)' }}>
                  Recommended
                </span>
              )}
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{tier.name}</p>
              <p className="mt-1 font-mono text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {tier.priceGhs === null
                  ? 'Custom'
                  : tier.priceGhs === 0
                  ? 'Free'
                  : `${formatGhs(tier.priceGhs)}/mo`}
              </p>
              <ul className="mt-3 space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={12} className="flex-shrink-0" style={{ color: '#16a34a' }} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                className="mt-4 w-full rounded-lg py-2 text-xs font-medium transition-colors"
                style={isCurrent
                  ? { background: 'var(--surface-border)', color: 'var(--text-muted)', cursor: 'default' }
                  : tier.recommended
                  ? { background: 'var(--color-teal)', color: '#fff' }
                  : { border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', background: 'transparent' }}
              >
                {isCurrent ? 'Current plan' : tier.priceGhs === null ? 'Contact sales' : 'Upgrade'}
              </button>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Zap size={12} aria-hidden="true" />
        Payments processed via MTN MoMo and Vodafone Cash. All amounts in GHS.
      </p>
    </div>
  );
}
