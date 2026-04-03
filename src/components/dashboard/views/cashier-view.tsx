'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShoppingCart, LogOut, Clock, Wifi, WifiOff,
  DollarSign, ShoppingBag, Receipt, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { formatGhs } from '@/lib/utils';
import type { AuthUser } from '@/types';
import { DAILY_SUMMARY, RECENT_SALES } from '@/lib/graphql/sales.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { DashboardMarketPulseFootprint } from '@/components/dashboard/dashboard-market-pulse-footprint';
import { SalesTrendChart } from '@/components/dashboard/charts/sales-trend-chart';

interface CashierViewProps {
  user: AuthUser;
}

interface SaleRow {
  id: string;
  cashierId: string;
  totalPesewas: number;
  status: string;
  createdAt: string;
  items: Array<{ quantity: number }>;
}

interface DailySummaryData {
  salesCount: number;
  totalRevenuePesewas: number;
}

const RECENT_SALES_ROLES = [
  'cashier',
  'chemical_cashier',
  'owner',
  'se_admin',
  'manager',
  'pharmacist',
  'head_pharmacist',
] as const;

export function CashierView({ user }: CashierViewProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { isOnline } = useNetworkStatus();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const accraToday = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }),
    [],
  );

  const canQuery = (RECENT_SALES_ROLES as readonly string[]).includes(user.role);

  const { data, loading } = useQuery<{ recentSales: SaleRow[] }>(RECENT_SALES, {
    variables: { limit: 40 },
    skip: !canQuery,
    pollInterval: 30_000,
    fetchPolicy: 'cache-and-network',
  });
  const { data: dailyData, refetch: refetchDaily } = useQuery<{ dailySummary: DailySummaryData }>(DAILY_SUMMARY, {
    variables: { date: accraToday },
    skip: !canQuery,
    pollInterval: 30_000,
    fetchPolicy: 'cache-and-network',
  });

  // Refetch branch pulse whenever recentSales changes (new sale detected)
  const prevSalesCountRef = useRef<number>(0);
  useEffect(() => {
    const count = data?.recentSales?.length ?? 0;
    if (count !== prevSalesCountRef.current) {
      prevSalesCountRef.current = count;
      if (count > 0) void refetchDaily();
    }
  }, [data?.recentSales?.length, refetchDaily]);

  const mine = useMemo(() => {
    if (!canQuery) return [];
    return (data?.recentSales ?? []).filter((s) => s.cashierId === user.id && s.status === 'COMPLETED');
  }, [data, user.id, canQuery]);

  const shiftTotal = mine.reduce((sum, s) => sum + s.totalPesewas, 0);
  const itemsSold = mine.reduce((sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0), 0);
  const txnCount = mine.length;

  const recent = mine.slice(0, 4).map((s) => ({
    id: s.id,
    total: s.totalPesewas,
    time: new Date(s.createdAt).toLocaleTimeString('en-GH', {
      timeZone: 'Africa/Accra',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }));
  const branchSalesToday = dailyData?.dailySummary?.salesCount ?? 0;
  const branchRevenueToday = dailyData?.dailySummary?.totalRevenuePesewas ?? 0;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <motion.div
        className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
        initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-card px-3 py-1 shadow-sm">
            <Clock size={14} className="text-content-muted" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-content-secondary">
              Shift active — {user?.name?.split(' ')[0]}
            </span>
            <div className="mx-1 h-3 w-px bg-surface-border" />
            <div className="flex items-center gap-1.5" title={isOnline ? 'Online' : 'Offline mode'}>
              {isOnline ? (
                <Wifi size={12} className="text-green-600" />
              ) : (
                <WifiOff size={12} className="animate-pulse text-red-600" />
              )}
              <span className={`text-[10px] font-bold uppercase ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline ? 'Cloud sync' : 'Offline'}
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-content-primary">Cashier Dashboard</h1>
          <p className="mt-1 font-medium text-content-secondary">
            Manage your shift, track sales, and access the POS terminal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearAuth();
            router.replace('/login');
          }}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-surface-border bg-surface-card px-4 py-2 text-sm font-bold text-content-muted shadow-sm transition-all hover:bg-surface-hover hover:text-content-primary focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 active:scale-95"
        >
          <LogOut size={16} aria-hidden />
          End shift & sign out
        </button>
      </motion.div>

      <div className="mb-6 flex flex-col gap-4">
        <AiCopilotBanner role={user.role} />
        <DashboardMarketPulseFootprint />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link href="/pos" className="group block focus:outline-none md:col-span-2">
          <motion.div
            whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex h-full flex-col justify-center overflow-hidden rounded-[28px] border-2 border-teal bg-surface-card p-8 shadow-[0_12px_40px_rgba(0,109,119,0.12)] transition-shadow hover:shadow-[0_20px_60px_rgba(0,109,119,0.2)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-gradient-to-br from-teal/20 to-transparent blur-3xl" />
            
            <div className="relative z-10 flex items-center gap-6">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal to-teal-dark text-white shadow-[0_8px_16px_rgba(0,109,119,0.3)] transition-transform group-hover:rotate-12 group-hover:scale-110">
                <ShoppingCart size={36} />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-content-primary">Launch POS</h2>
                <p className="mt-2 text-base font-medium text-content-secondary">Open the terminal to start serving customers</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-teal-dark opacity-10" />
          </motion.div>
        </Link>

        <div className="flex flex-col gap-4">
          {loading && canQuery ? (
            [0, 1].map((i) => <div key={i} className="skeleton h-full min-h-[100px] rounded-[24px]" />)
          ) : (
            <>
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-1 flex-col justify-center rounded-[24px] border border-surface-border bg-surface-card p-5 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2 text-teal">
                  <DollarSign size={18} />
                  <p className="text-xs font-bold uppercase tracking-wider">Shift total</p>
                </div>
                <p className="font-mono text-3xl font-bold text-content-primary">
                  {!canQuery ? '—' : formatGhs(shiftTotal / 100)}
                </p>
              </motion.div>

              <Link
                href="/dashboard/transactions"
                className="group block flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
                  whileHover={shouldReduceMotion ? {} : { y: -2 }}
                  className="flex h-full min-h-[100px] flex-col justify-center rounded-[24px] border border-surface-border bg-surface-card p-5 shadow-sm transition-all hover:border-teal/40 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Receipt size={18} aria-hidden />
                      <p className="text-xs font-bold uppercase tracking-wider">Transactions</p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-content-muted transition-transform group-hover:translate-x-0.5 group-hover:text-teal"
                      aria-hidden
                    />
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <p className="font-mono text-3xl font-bold text-content-primary">
                      {!canQuery ? '—' : txnCount}
                    </p>
                    <p className="text-sm font-medium text-content-muted">
                      {!canQuery ? '' : `(${itemsSold} items)`}
                    </p>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-teal group-hover:underline">
                    View sales &amp; receipts →
                  </p>
                </motion.div>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <motion.div
          className="rounded-[24px] border border-surface-border bg-surface-card p-6 shadow-sm flex flex-col"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-content-primary">Recent sales</h2>
            <Link href="/dashboard/transactions" className="text-sm font-bold text-teal hover:underline">
              View all →
            </Link>
          </div>
          
          <div className="mb-4 h-[120px] w-full rounded-xl bg-surface-base/50 p-2">
            <SalesTrendChart height={100} color="var(--color-teal)" gradientId="cashierSales" className="-ml-2" />
          </div>

          <div className="space-y-3 mt-auto flex-1">
            {!canQuery || recent.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-surface-border py-8 text-center">
                <Receipt size={24} className="mb-2 text-content-muted opacity-50" />
                <p className="text-sm text-content-muted">No recent sales to show yet.</p>
              </div>
            ) : (
              recent.slice(0, 3).map((tx) => (
                <Link
                  key={tx.id}
                  href={`/dashboard/transactions/${tx.id}`}
                  className="group flex items-center justify-between rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-teal/30 hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal">
                      <ShoppingBag size={18} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-bold text-teal group-hover:underline">
                        {tx.id.slice(0, 8)}…
                      </span>
                      <p className="text-xs font-medium text-content-muted">{tx.time}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-base font-bold text-content-primary">
                    {formatGhs(tx.total / 100)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          className="rounded-[24px] border border-surface-border bg-surface-card p-6 shadow-sm flex flex-col"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-content-primary">Branch live pulse</h2>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Live</span>
            </span>
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-surface-border bg-surface-base p-6 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-content-muted">Today's Branch Performance</p>
            <div className="my-6 flex items-center justify-center gap-8">
              <div>
                <p className="font-mono text-4xl font-extrabold text-content-primary">{branchSalesToday}</p>
                <p className="mt-1 text-xs font-medium text-content-secondary">Sales</p>
              </div>
              <div className="h-12 w-px bg-surface-border" />
              <div>
                <p className="font-mono text-2xl font-bold text-teal">{formatGhs(branchRevenueToday / 100)}</p>
                <p className="mt-1 text-xs font-medium text-content-secondary">Revenue</p>
              </div>
            </div>
            <p className="text-xs text-content-muted">
              Syncs every 30s · updates instantly on new sales.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
