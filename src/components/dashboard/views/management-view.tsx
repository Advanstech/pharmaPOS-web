'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Package, Users, Activity, ArrowUpRight,
  DollarSign, Clock, Zap, BarChart3, CreditCard, CalendarCheck,
} from 'lucide-react';
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, Bar, BarChart, Cell,
  PieChart, Pie, XAxis, YAxis,
} from 'recharts';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { formatGhs } from '@/lib/utils';
import type { AuthUser } from '@/types';
import { DAILY_SUMMARY, RECENT_SALES } from '@/lib/graphql/sales.queries';
import { LIST_STAFF } from '@/lib/graphql/dashboard.queries';
import { AiCopilotBanner } from '@/components/dashboard/ai-copilot-banner';
import { DashboardMarketPulseFootprint } from '@/components/dashboard/dashboard-market-pulse-footprint';
import { LOW_STOCK_ALERTS_QUERY } from '@/lib/graphql/inventory.queries';
import { MY_STOCK_ALERTS } from '@/lib/graphql/notifications.queries';
import { BranchActivityVisual } from '@/components/dashboard/executive/branch-activity-visual';
import { PharmaProductVisual } from '@/components/dashboard/executive/pharma-product-visual';
import { StockPressureDial } from '@/components/dashboard/executive/stock-pressure-dial';
import { SalesTrendChart } from '@/components/dashboard/charts/sales-trend-chart';
import { REPORTS_DASHBOARD } from '@/lib/graphql/reports.queries';
import { GET_STAFF_EXPENSES } from '@/lib/graphql/expenses.queries';

interface ManagementViewProps { user: AuthUser; }
interface DailySummaryData { salesCount: number; totalRevenuePesewas: number; totalRevenueFormatted: string; }
interface SaleRow { id: string; totalPesewas: number; totalFormatted?: string; createdAt: string; cashierName?: string; items?: any[]; }
interface StockAlertRow { id: string; productId: string; productName: string; stockStatus: string; quantityOnHand: number; reorderLevel: number; suggestedReorderQty: number; supplierName?: string; supplierPhone?: string; createdAt: string; }

const COLORS = ['#0d9488', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

function fmtDate(d: Date) { return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }); }
function get7dRange() {
  const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6);
  const prevEnd = new Date(start); prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - 6);
  return { start: fmtDate(start), end: fmtDate(end), prevStart: fmtDate(prevStart), prevEnd: fmtDate(prevEnd) };
}

export function ManagementView({ user }: ManagementViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const accraToday = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }), []);
  const range = useMemo(() => get7dRange(), []);

  // Core queries
  const { data: summaryData, loading: summaryLoading } = useQuery<{ dailySummary: DailySummaryData }>(DAILY_SUMMARY, { variables: { date: accraToday }, pollInterval: 120_000 });
  const { data: salesData, loading: salesLoading } = useQuery<{ recentSales: SaleRow[] }>(RECENT_SALES, { variables: { limit: 10 }, pollInterval: 60_000 });
  const { data: staffData, loading: staffLoading } = useQuery(LIST_STAFF, {});
  const { data: stockData } = useQuery<{ lowStockAlerts: Array<{ productId: string }> }>(LOW_STOCK_ALERTS_QUERY, { pollInterval: 60_000 });
  const { data: alertData } = useQuery<{ myStockAlerts: StockAlertRow[] }>(MY_STOCK_ALERTS, { variables: { limit: 5 }, pollInterval: 30_000 });

  // Enhanced: 7-day trend + top products + expenses
  const { data: reportsData } = useQuery(REPORTS_DASHBOARD, {
    variables: { periodStart: range.start, periodEnd: range.end, prevStart: range.prevStart, prevEnd: range.prevEnd, limit: 5 },
    fetchPolicy: 'cache-and-network',
  });
  const { data: expData } = useQuery(GET_STAFF_EXPENSES, { fetchPolicy: 'cache-and-network' });

  const summary = summaryData?.dailySummary;
  const revenueGhs = (summary?.totalRevenuePesewas ?? 0) / 100;
  const salesToday = summary?.salesCount ?? 0;
  const activeStaff = (staffData?.listStaff as Array<{ is_active: boolean }> | undefined)?.filter(s => s.is_active).length ?? 0;
  const lowStockCount = stockData?.lowStockAlerts?.length ?? 0;
  const myStockAlerts = alertData?.myStockAlerts ?? [];

  // Reports data
  const dailyTrend = (reportsData?.dailyTrend ?? []) as Array<{ date: string; revenuePesewas: number; salesCount: number }>;
  const topProducts = (reportsData?.topProducts ?? []) as Array<{ productId: string; productName: string; unitsSold: number; revenuePesewas: number; revenueFormatted: string }>;
  const hourlySales = (reportsData?.hourlySales ?? []) as Array<{ hour: number; salesCount: number; revenuePesewas: number }>;
  const weekRevenue = (reportsData?.current as any)?.totalRevenuePesewas ?? 0;
  const prevWeekRevenue = (reportsData?.previous as any)?.totalRevenuePesewas ?? 0;
  const weekDelta = prevWeekRevenue > 0 ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 : 0;

  // Expenses
  const expenses = (expData?.staffExpenses ?? []) as any[];
  const pendingExpenses = expenses.filter((e: any) => e.status === 'PENDING').length;

  // Recent sales activity
  const recentSales = salesData?.recentSales ?? [];
  const activity = useMemo(() => recentSales.slice(0, 5).map(s => ({
    id: s.id,
    text: s.cashierName || 'Sale ' + s.id.slice(0, 8),
    amount: formatGhs((s.totalPesewas ?? 0) / 100),
    time: new Date(s.createdAt).toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: 'numeric', minute: '2-digit' }),
    itemCount: s.items?.length ?? 0,
  })), [recentSales]);

  // Peak hour
  const peakHour = useMemo(() => {
    if (hourlySales.length === 0) return null;
    const peak = hourlySales.reduce((max, h) => h.salesCount > max.salesCount ? h : max, hourlySales[0]);
    return peak.salesCount > 0 ? peak : null;
  }, [hourlySales]);

  const loading = summaryLoading || salesLoading || staffLoading;

  const anim = (delay: number) => shouldReduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay, type: 'spring' as const, stiffness: 220, damping: 22 } };

  return (
    <div className="w-full max-w-[1600px]">
      {/* ── Hero: 3D + Headline ── */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-4 xl:col-span-3">
          <BranchActivityVisual className="h-[min(200px,22vh)] lg:h-full lg:min-h-[168px]" />
        </div>
        <div className="flex flex-col justify-between lg:col-span-8 xl:col-span-9 rounded-2xl border border-surface-border p-5 lg:p-6" style={{ background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(0,109,119,0.03) 100%)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <motion.div {...anim(0)}>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center rounded-lg bg-teal/10 p-2 text-teal-dark"><Activity size={18} /></span>
                <span className="inline-block rounded-full border border-[rgba(232,168,56,0.35)] bg-[rgba(232,168,56,0.12)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">Executive command center</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-content-primary md:text-3xl">Branch overview</h1>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-content-secondary">
                <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--color-teal)' }} />
                {accraToday} &middot; Live Inventory & Sales &middot; {activeStaff} Staff Active
              </div>
            </motion.div>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard/reports" className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-teal-dark hover:shadow-lg transition-all">
                Executive Reports <ArrowUpRight size={14} />
              </Link>
              <div className="flex gap-2 w-full">
                <Link href="/dashboard/suppliers" className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-semibold text-content-secondary hover:border-teal/30 hover:text-content-primary transition-colors">Suppliers <ArrowUpRight size={12} /></Link>
                <Link href="/dashboard/inventory" className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-semibold text-content-secondary hover:border-teal/30 hover:text-content-primary transition-colors">Inventory <ArrowUpRight size={12} /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI + Market ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-5"><AiCopilotBanner role={user.role} variant="inline" /></div>
        <div className="lg:col-span-7"><DashboardMarketPulseFootprint /></div>
      </div>

      {/* ── KPI Cards (original animated style, 5 cards) ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading ? [0,1,2,3,4].map(i => <div key={i} className="skeleton h-[5.5rem] rounded-2xl" />) : (
          [
            { label: 'Revenue today', value: revenueGhs, format: (n: number) => formatGhs(n), delta: weekDelta, deltaLabel: 'vs last week', icon: <TrendingUp size={18} /> },
            { label: 'Sales today', value: salesToday, icon: <ShoppingCart size={18} /> },
            { label: 'Low stock items', value: lowStockCount, icon: <Package size={18} /> },
            { label: 'Pending expenses', value: pendingExpenses, icon: <CreditCard size={18} /> },
            { label: 'Active staff', value: activeStaff, icon: <Users size={18} /> },
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
                style={{ transformStyle: 'preserve-3d', background: 'linear-gradient(155deg, var(--surface-card) 0%, rgba(0,109,119,0.04) 100%)' }}
              >
                <KpiCard {...kpi} />
              </motion.div>
            </motion.div>
          ))
        )}
      </div>

      {/* ── Low stock alert banner ── */}
      {lowStockCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs sm:text-sm"
          style={{ border: '1px solid rgba(217,119,6,0.28)', background: 'rgba(217,119,6,0.07)', color: '#92400e' }}>
          <span className="font-medium">{lowStockCount} SKU(s) need attention before shelf gaps.</span>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/inventory" className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'rgba(0,109,119,0.12)', color: 'var(--color-teal-dark)' }}>Stock SKUs</Link>
            <Link href="/dashboard/suppliers" className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: 'rgba(146,64,14,0.18)', color: '#78350f' }}>Supplier queue</Link>
          </div>
        </div>
      )}

      {/* ── Main Grid: Revenue Chart + Top Products + Stock Alerts ── */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Revenue Trend — 7 day area chart */}
        <motion.div className="lg:col-span-5 rounded-2xl border border-surface-border p-4" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }} {...anim(0.1)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/10 text-teal"><BarChart3 size={14} /></div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-content-muted">7-Day Revenue</h2>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-mono" style={{ color: '#0d9488' }}>{formatGhs(weekRevenue / 100)}</p>
              {weekDelta !== 0 && (
                <p className="text-[10px] font-bold" style={{ color: weekDelta >= 0 ? '#16a34a' : '#dc2626' }}>
                  {weekDelta >= 0 ? '+' : ''}{weekDelta.toFixed(1)}% vs prior
                </p>
              )}
            </div>
          </div>
          <div style={{ height: 140 }}>
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(d: string) => { try { return new Date(d).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' }); } catch { return d; } }} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => v >= 10000 ? (v/10000).toFixed(0) + 'k' : String(Math.round(v/100))} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="rounded-lg border border-surface-border bg-surface-card p-2 shadow-lg text-xs">
                      <p className="font-bold text-content-muted">{label}</p>
                      <p className="font-mono font-bold" style={{ color: '#0d9488' }}>{formatGhs((payload[0].value as number) / 100)}</p>
                    </div>
                  ) : null} />
                  <Area type="monotone" dataKey="revenuePesewas" stroke="#0d9488" strokeWidth={2.5} fill="url(#revGradDash)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-content-muted">No revenue data yet</div>
            )}
          </div>
        </motion.div>

        {/* Top Products — horizontal bar */}
        <motion.div className="lg:col-span-3 rounded-2xl border border-surface-border p-4" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }} {...anim(0.14)}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-content-muted">Top Products</h2>
            <Link href="/dashboard/reports" className="text-[10px] font-bold text-teal hover:underline">View All</Link>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((p, i) => {
                const maxRev = topProducts[0]?.revenuePesewas || 1;
                return (
                  <div key={p.productId} className="flex items-center gap-2">
                    <span className="w-4 text-[10px] font-bold text-content-muted">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate text-content-primary">{p.productName}</p>
                      <div className="mt-0.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: (p.revenuePesewas / maxRev * 100) + '%', background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono shrink-0" style={{ color: COLORS[i % COLORS.length] }}>{p.revenueFormatted}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-content-muted py-4 text-center">No sales data yet</p>
          )}
        </motion.div>

        {/* Stock Escalations */}
        <motion.div className="lg:col-span-4 rounded-2xl border border-surface-border p-4" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }} {...anim(0.18)}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-content-muted">Stock Escalations</h2>
            <Link href="/dashboard/suppliers" className="rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)' }}>Open queue</Link>
          </div>
          {myStockAlerts.length === 0 ? (
            <p className="text-xs text-content-muted py-4 text-center">No escalations in your inbox.</p>
          ) : (
            <ul className="space-y-2">
              {myStockAlerts.slice(0, 4).map(alert => (
                <li key={alert.id}>
                  <div className="flex gap-2 rounded-xl border border-surface-border bg-surface-base/80 p-2 transition-colors hover:border-teal/35">
                    <Link href={'/dashboard/inventory/' + alert.productId} className="flex min-w-0 flex-1 gap-2">
                      <PharmaProductVisual productName={alert.productName} productId={alert.productId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-content-primary">{alert.productName}</p>
                        <p className="text-[10px] text-content-muted">
                          {alert.quantityOnHand} left &middot; <span className="font-semibold uppercase" style={{ color: '#b45309' }}>{alert.stockStatus}</span>
                        </p>
                      </div>
                    </Link>
                    {alert.supplierPhone && (
                      <a href={'tel:' + alert.supplierPhone} className="shrink-0 self-center text-[10px] font-bold text-teal hover:underline">Call</a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* ── Bottom Row: Inventory Pressure + Live Sales + Quick Actions ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Inventory Pressure Dial */}
        <motion.div className="rounded-2xl border border-surface-border p-4 lg:col-span-3" style={{ background: 'linear-gradient(180deg, var(--surface-card) 0%, rgba(0,109,119,0.03) 100%)', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }} {...anim(0.2)}>
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider text-content-muted">Inventory Pressure</p>
          <StockPressureDial lowSkuCount={lowStockCount} />
          {peakHour && (
            <div className="mt-3 rounded-lg p-2 text-center" style={{ background: 'rgba(13,148,136,0.06)' }}>
              <p className="text-[10px] font-bold text-content-muted">Peak Hour Today</p>
              <p className="text-sm font-bold" style={{ color: '#0d9488' }}>{peakHour.hour}:00 &middot; {peakHour.salesCount} sales</p>
            </div>
          )}
        </motion.div>

        {/* Live Sales Feed */}
        <motion.div className="flex flex-col rounded-2xl border border-surface-border p-4 lg:col-span-5" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }} {...anim(0.24)}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal/10 text-teal"><Activity size={14} /></div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-content-muted">Live Sales</h2>
            </div>
            <Link href="/dashboard/transactions" className="text-[10px] font-bold text-teal hover:underline">All transactions</Link>
          </div>

          {/* Sales Pulse Chart */}
          <div className="relative rounded-xl bg-surface-base/50 p-2 mb-3">
            <SalesTrendChart height={120} className="-ml-2" />
          </div>

          {salesLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
          ) : activity.length === 0 ? (
            <p className="text-xs text-content-muted py-4 text-center">No sales yet today.</p>
          ) : (
            <ul className="space-y-1.5">
              {activity.slice(0, 3).map((item, i) => (
                <Link key={item.id} href={'/dashboard/transactions/' + item.id}>
                  <motion.li {...anim(0.26 + i * 0.03)}
                    className="flex items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-base/80 px-3 py-2 transition-colors hover:border-teal/30 hover:bg-surface-base cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-content-primary truncate block">{item.text}</span>
                      {item.itemCount > 0 && <span className="text-[9px] text-content-muted">{item.itemCount} items</span>}
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-teal">{item.amount}</span>
                    <span className="shrink-0 text-[10px] font-bold text-content-muted">{item.time}</span>
                  </motion.li>
                </Link>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div className="rounded-2xl border border-surface-border p-4 lg:col-span-4" style={{ background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }} {...anim(0.28)}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-content-muted mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/pos', icon: ShoppingCart, label: 'Open POS', color: '#0d9488' },
              { href: '/dashboard/end-of-day', icon: CalendarCheck, label: 'End of Day', color: '#3b82f6' },
              { href: '/dashboard/expenses', icon: CreditCard, label: 'Expenses', color: '#f59e0b', badge: pendingExpenses > 0 ? String(pendingExpenses) : undefined },
              { href: '/dashboard/transfers', icon: Package, label: 'Transfers', color: '#8b5cf6' },
              { href: '/dashboard/accounting', icon: DollarSign, label: 'Accounting', color: '#0d9488' },
              { href: '/dashboard/cfo', icon: Zap, label: 'CFO Brief', color: '#f59e0b' },
            ].map(action => (
              <Link key={action.href} href={action.href}
                className="group flex items-center gap-2 rounded-xl p-2.5 transition-all hover:scale-[1.02]"
                style={{ background: action.color + '08', border: '1px solid ' + action.color + '15' }}>
                <div className="rounded-lg p-1.5" style={{ background: action.color + '15' }}>
                  <action.icon size={14} style={{ color: action.color }} />
                </div>
                <span className="text-[11px] font-bold text-content-primary group-hover:text-teal transition-colors">{action.label}</span>
                {action.badge && (
                  <span className="ml-auto text-[9px] font-bold text-white rounded-full px-1.5 py-0.5" style={{ background: '#dc2626' }}>{action.badge}</span>
                )}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}


