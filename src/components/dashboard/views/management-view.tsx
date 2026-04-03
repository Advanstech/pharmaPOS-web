'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Package, Users, Activity, ArrowUpRight } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { formatGhs } from '@/lib/utils';
import type { AuthUser } from '@/types';
import { DAILY_SUMMARY, RECENT_SALES } from '@/lib/graphql/sales.queries';
import { LIST_STAFF } from '@/lib/graphql/dashboard.queries';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { DashboardMarketPulseFootprint } from '@/components/dashboard/dashboard-market-pulse-footprint';
import { LOW_STOCK_ALERTS_QUERY } from '@/lib/graphql/inventory.queries';
import { MY_STOCK_ALERTS } from '@/lib/graphql/notifications.queries';
import { PharmaHero3D } from '@/components/dashboard/executive/pharma-hero-3d';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { StockPressureDial } from '@/components/dashboard/executive/stock-pressure-dial';
import { SalesTrendChart } from '@/components/dashboard/charts/sales-trend-chart';

interface ManagementViewProps {
  user: AuthUser;
}

interface DailySummaryData {
  salesCount: number;
  totalRevenuePesewas: number;
  totalRevenueFormatted: string;
}

interface SaleRow {
  id: string;
  totalPesewas: number;
  createdAt: string;
}

interface StockAlertRow {
  id: string;
  productId: string;
  productName: string;
  stockStatus: string;
  quantityOnHand: number;
  reorderLevel: number;
  suggestedReorderQty: number;
  supplierName?: string;
  supplierPhone?: string;
  createdAt: string;
}

export function ManagementView({ user }: ManagementViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const accraToday = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }),
    [],
  );

  const { data: summaryData, loading: summaryLoading } = useQuery<{ dailySummary: DailySummaryData }>(
    DAILY_SUMMARY,
    { variables: { date: accraToday }, pollInterval: 120_000 },
  );

  const { data: salesData, loading: salesLoading } = useQuery<{ recentSales: SaleRow[] }>(RECENT_SALES, {
    variables: { limit: 8 },
    pollInterval: 60_000,
  });

  const { data: staffData, loading: staffLoading } = useQuery(LIST_STAFF, {});
  const { data: stockData } = useQuery<{ lowStockAlerts: Array<{ productId: string }> }>(LOW_STOCK_ALERTS_QUERY, {
    pollInterval: 60_000,
  });
  const { data: alertData } = useQuery<{ myStockAlerts: StockAlertRow[] }>(MY_STOCK_ALERTS, {
    variables: { limit: 5 },
    pollInterval: 30_000,
  });

  const summary = summaryData?.dailySummary;
  const revenueGhs = (summary?.totalRevenuePesewas ?? 0) / 100;
  const salesToday = summary?.salesCount ?? 0;

  const activeStaff =
    (staffData?.listStaff as Array<{ is_active: boolean }> | undefined)?.filter((s) => s.is_active).length ?? 0;
  const lowStockCount = stockData?.lowStockAlerts?.length ?? 0;
  const myStockAlerts = alertData?.myStockAlerts ?? [];

  const activity = useMemo(() => {
    const rows = salesData?.recentSales ?? [];
    return rows.slice(0, 4).map((s) => ({
      id: s.id,
      text: `Sale ${s.id.slice(0, 8)}…`,
      sub: formatGhs((s.totalPesewas ?? 0) / 100),
      time: new Date(s.createdAt).toLocaleTimeString('en-GH', {
        timeZone: 'Africa/Accra',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }));
  }, [salesData]);

  const loading = summaryLoading || salesLoading || staffLoading;

  return (
    <div className="w-full max-w-[1600px]">
      {/* Command row: 3D + headline + quick links */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-4 xl:col-span-3">
          <PharmaHero3D className="h-[min(200px,22vh)] lg:h-full lg:min-h-[168px]" />
        </div>
        <div className="flex flex-col justify-between lg:col-span-8 xl:col-span-9 rounded-2xl border border-surface-border p-5 lg:p-6" style={{ background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(0,109,119,0.03) 100%)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center rounded-lg bg-teal/10 p-2 text-teal-dark">
                  <Activity size={18} />
                </span>
                <span className="inline-block rounded-full border border-[rgba(232,168,56,0.35)] bg-[rgba(232,168,56,0.12)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                  Executive command center
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-content-primary md:text-3xl">Branch overview</h1>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-content-secondary">
                <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--color-teal)' }} />
                {accraToday} · Live Inventory & Sales · {activeStaff} Staff Active
              </div>
            </motion.div>
            
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard/reports"
                className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-teal-dark hover:shadow-lg transition-all"
              >
                Executive Reports <ArrowUpRight size={14} />
              </Link>
              <div className="flex gap-2 w-full">
                <Link
                  href="/dashboard/suppliers"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-semibold text-content-secondary hover:border-teal/30 hover:text-content-primary transition-colors"
                >
                  Suppliers <ArrowUpRight size={12} />
                </Link>
                <Link
                  href="/dashboard/inventory"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-semibold text-content-secondary hover:border-teal/30 hover:text-content-primary transition-colors"
                >
                  Inventory <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-5">
          <AiCopilotBanner role={user.role} variant="inline" />
        </div>
        <div className="lg:col-span-7">
          <DashboardMarketPulseFootprint />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[5.5rem] rounded-2xl" />)
        ) : (
          [
            {
              label: 'Revenue today',
              value: revenueGhs,
              format: (n: number) => formatGhs(n),
              delta: 8.4,
              icon: <TrendingUp size={18} />,
            },
            {
              label: 'Sales today',
              value: salesToday,
              delta: 3.1,
              icon: <ShoppingCart size={18} />,
            },
            {
              label: 'Low stock items',
              value: lowStockCount,
              icon: <Package size={18} />,
              className: 'border-[rgba(217,119,6,0.35)] bg-[rgba(253,243,220,0.35)]',
            },
            {
              label: 'Active staff',
              value: activeStaff,
              icon: <Users size={18} />,
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              className="group [perspective:900px]"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 220, damping: 22 }}
            >
              <motion.div
                whileHover={shouldReduceMotion ? {} : { rotateX: 4, y: -4, z: 8 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="h-full rounded-2xl border border-white/5 shadow-[0_8px_32px_rgba(0,109,119,0.08)]"
                style={{
                  transformStyle: 'preserve-3d',
                  background: 'linear-gradient(155deg, var(--surface-card) 0%, rgba(0,109,119,0.04) 100%)',
                }}
              >
                <KpiCard {...kpi} />
              </motion.div>
            </motion.div>
          ))
        )}
      </div>

      {lowStockCount > 0 && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm"
          style={{ border: '1px solid rgba(217,119,6,0.28)', background: 'rgba(217,119,6,0.07)', color: '#92400e' }}
        >
          <span className="font-medium">{lowStockCount} SKU(s) need attention before shelf gaps.</span>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/inventory"
                className="rounded-lg px-3 py-1 text-xs font-bold"
                style={{ background: 'rgba(0,109,119,0.12)', color: 'var(--color-teal-dark)' }}
              >
                Stock SKUs
              </Link>
              <Link
                href="/dashboard/suppliers"
                className="rounded-lg px-3 py-1 text-xs font-bold"
                style={{ background: 'rgba(146,64,14,0.18)', color: '#78350f' }}
              >
                Supplier queue
              </Link>
            </div>
        </div>
      )}

      {/* Single viewport band: dial + activity + alerts with product imagery */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <motion.div
          className="rounded-2xl border border-surface-border p-4 lg:col-span-3"
          style={{
            background: 'linear-gradient(180deg, var(--surface-card) 0%, rgba(0,109,119,0.03) 100%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.04)',
          }}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider text-content-muted">
            Inventory pressure
          </p>
          <StockPressureDial lowSkuCount={lowStockCount} />
          <p className="mt-3 text-center text-[11px] text-content-muted">Linked to live low-stock pipeline</p>
        </motion.div>

        <motion.div
          className="flex flex-col gap-4 rounded-2xl border border-surface-border p-4 lg:col-span-5"
          style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <Activity size={16} />
              </div>
              <h2 className="text-sm font-bold text-content-primary">Live sales pulse</h2>
            </div>
            <Link href="/dashboard/transactions" className="text-[11px] font-semibold text-teal hover:underline">
              All transactions
            </Link>
          </div>
          
          {/* Sales Trend Visual */}
          <div className="relative mt-2 rounded-xl bg-surface-base/50 p-2">
            <SalesTrendChart height={120} className="-ml-2" />
          </div>

          {salesLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton h-11 rounded-xl" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-xs text-content-muted">No recent sales yet today.</p>
          ) : (
            <ul className="space-y-2 mt-auto">
              {activity.slice(0, 3).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-base/80 px-3 py-2 transition-colors hover:border-teal/30 hover:bg-surface-base"
                >
                  <span className="min-w-0 truncate text-xs font-semibold text-content-primary">{item.text}</span>
                  <span className="shrink-0 font-mono text-xs font-bold text-teal">{item.sub}</span>
                  <span className="shrink-0 text-[10px] font-bold text-content-muted">{item.time}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div
          className="rounded-2xl border border-surface-border p-4 lg:col-span-4"
          style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 200, damping: 24 }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-content-primary">Stock escalations</h2>
            <Link
              href="/dashboard/suppliers"
              className="rounded-lg px-2 py-1 text-[11px] font-semibold"
              style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)' }}
            >
              Open queue
            </Link>
          </div>
          {myStockAlerts.length === 0 ? (
            <p className="text-xs text-content-muted">No escalations in your inbox.</p>
          ) : (
            <ul className="space-y-2">
              {myStockAlerts.map((alert) => (
                <li key={alert.id}>
                  <div className="flex gap-3 rounded-xl border border-surface-border bg-surface-base/80 p-2 transition-colors hover:border-teal/35 hover:bg-surface-base">
                    <Link
                      href={`/dashboard/inventory/${alert.productId}`}
                      className="flex min-w-0 flex-1 gap-3 rounded-lg outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                    >
                      <PharmaProductVisual productName={alert.productName} productId={alert.productId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-content-primary">{alert.productName}</p>
                        <p className="text-[10px] text-content-muted">
                          {alert.quantityOnHand} left · reorder {alert.reorderLevel} ·{' '}
                          <span className="font-semibold uppercase" style={{ color: '#b45309' }}>
                            {alert.stockStatus}
                          </span>
                        </p>
                        {(alert.supplierName || alert.supplierPhone) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-content-secondary">
                              {alert.supplierName ?? 'Supplier'}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                    {alert.supplierPhone && (
                      <a
                        href={`tel:${alert.supplierPhone}`}
                        className="shrink-0 self-center text-[10px] font-bold text-teal hover:underline"
                      >
                        Call
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
}
