'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Receipt, BarChart3,
  Users, Clock, Package, ArrowLeft, Printer, Zap, Target, Award,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBarChart, RadialBar,
} from 'recharts';
import { REPORTS_DASHBOARD } from '@/lib/graphql/reports.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatGhs } from '@/lib/utils';
import Link from 'next/link';

type Period = '7d' | '30d' | '90d';
const DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };
const COLORS = ['#0d9488', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#10b981'];
const CLASS_COLORS: Record<string, string> = { OTC: '#0d9488', POM: '#3b82f6', CONTROLLED: '#dc2626', OTHER: '#8b5cf6', COSMETIC: '#ec4899' };

function fmtDate(d: Date) { return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }); }
function getRanges(p: Period) {
  const days = DAYS[p];
  const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - (days - 1));
  const prevEnd = new Date(start); prevEnd.setDate(start.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevEnd.getDate() - (days - 1));
  return { start: fmtDate(start), end: fmtDate(end), prevStart: fmtDate(prevStart), prevEnd: fmtDate(prevEnd) };
}
function fmt(p: number) { return 'GH\u20B5' + (p / 100).toFixed(2); }
function fmtK(p: number) { return p >= 100000 ? 'GH\u20B5' + (p / 10000).toFixed(1) + 'k' : fmt(p); }
function pctChange(curr: number, prev: number) { return prev > 0 ? ((curr - prev) / prev) * 100 : 0; }

export default function ReportsPage() {
  const user = useAuthStore(s => s.user);
  const [period, setPeriod] = useState<Period>('30d');
  const range = useMemo(() => getRanges(period), [period]);

  const { data, loading } = useQuery(REPORTS_DASHBOARD, {
    variables: { periodStart: range.start, periodEnd: range.end, prevStart: range.prevStart, prevEnd: range.prevEnd, limit: 10 },
    skip: !user, fetchPolicy: 'cache-and-network',
  });

  const curr = data?.current as any;
  const prev = data?.previous as any;
  const topProducts = (data?.topProducts ?? []) as any[];
  const dailyTrend = (data?.dailyTrend ?? []) as any[];
  const hourlySales = (data?.hourlySales ?? []) as any[];
  const categories = (data?.categoryBreakdown ?? []) as any[];
  const staff = (data?.staffPerformance ?? []) as any[];
  const paymentMethods = (data?.paymentMethodBreakdown ?? []) as any[];

  const revDelta = pctChange(curr?.totalRevenuePesewas ?? 0, prev?.totalRevenuePesewas ?? 0);
  const salesDelta = pctChange(curr?.salesCount ?? 0, prev?.salesCount ?? 0);
  const maxHourlySales = Math.max(...hourlySales.map((h: any) => h.salesCount), 1);
  const totalCatRevenue = categories.reduce((s: number, c: any) => s + c.revenuePesewas, 0);
  const totalPaymentRevenue = paymentMethods.reduce((s: number, p: any) => s + p.totalPesewas, 0);

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.1) 0%, rgba(6,182,212,0.05) 50%, rgba(59,130,246,0.08) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-4 md:px-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"><ArrowLeft className="h-3.5 w-3.5" /> Dashboard</Link>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Sales Analytics</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Revenue trends, product performance, staff metrics &amp; operational insights</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)' }}>
                <Printer size={13} /> Print
              </button>
              <Link href="/dashboard/cfo" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
                <Zap size={13} /> CFO Briefing
              </Link>
            </div>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 rounded-lg p-0.5 w-fit" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className="rounded-md px-3 py-1 text-[11px] font-semibold transition-all"
                style={period === p ? { background: '#0d9488', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' } : { color: 'var(--text-muted)' }}>
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 space-y-5">
        {loading && !curr && <div className="text-center py-12"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" /></div>}

        {curr && <>
          {/* ── KPI Strip ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard icon={DollarSign} label="Revenue" value={curr.totalRevenueFormatted} delta={revDelta} color="#0d9488" />
            <KpiCard icon={ShoppingCart} label="Sales" value={String(curr.salesCount)} delta={salesDelta} color="#3b82f6" />
            <KpiCard icon={Receipt} label="VAT Collected" value={curr.vatFormatted} color="#f59e0b" />
            <KpiCard icon={Target} label="Avg Sale" value={'GH\u20B5' + Number(curr.averageSaleGhs).toFixed(2)} color="#8b5cf6" />
            <KpiCard icon={TrendingDown} label="Refunds" value={fmt(curr.refundsPesewas)} color={curr.refundsPesewas > 0 ? '#dc2626' : '#16a34a'} />
          </div>

          {/* ── Revenue Trend (Area Chart) ── */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Revenue Trend</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(d: string) => { try { return new Date(d).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' }); } catch { return d; } }} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => fmtK(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenuePesewas" stroke="#0d9488" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Middle Row: Hourly Heatmap + Category Donut + Staff Leaderboard ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Hourly Sales Heatmap — 5 cols */}
            <div className="lg:col-span-5 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                <Clock size={12} className="inline mr-1" /> Peak Hours
              </h3>
              <div className="grid grid-cols-12 gap-1">
                {hourlySales.filter((h: any) => h.hour >= 6 && h.hour <= 21).map((h: any) => {
                  const intensity = h.salesCount / maxHourlySales;
                  const bg = intensity > 0.7 ? '#0d9488' : intensity > 0.4 ? '#14b8a6' : intensity > 0.1 ? '#99f6e4' : 'var(--surface-base)';
                  const textColor = intensity > 0.4 ? '#fff' : 'var(--text-muted)';
                  return (
                    <div key={h.hour} className="rounded-lg p-1.5 text-center transition-all hover:scale-110" style={{ background: bg }} title={h.salesCount + ' sales at ' + h.hour + ':00'}>
                      <p className="text-[8px] font-bold" style={{ color: textColor }}>{h.hour}</p>
                      <p className="text-[10px] font-bold" style={{ color: textColor }}>{h.salesCount}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded" style={{ background: 'var(--surface-base)' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded" style={{ background: '#99f6e4' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded" style={{ background: '#0d9488' }} />
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Peak</span>
                </div>
              </div>
            </div>

            {/* Category Breakdown — 3 cols */}
            <div className="lg:col-span-3 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                <Package size={12} className="inline mr-1" /> By Category
              </h3>
              {categories.length > 0 ? (
                <>
                  <div style={{ height: 130 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categories} dataKey="revenuePesewas" nameKey="classification" cx="50%" cy="50%" outerRadius={50} innerRadius={25} strokeWidth={0} paddingAngle={2}>
                          {categories.map((c: any, i: number) => <Cell key={i} fill={CLASS_COLORS[c.classification] || COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 11, color: 'var(--text-primary)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-1">
                    {categories.map((c: any, i: number) => (
                      <div key={c.classification} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: CLASS_COLORS[c.classification] || COLORS[i] }} />
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{c.classification}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{Math.round(c.revenuePesewas / totalCatRevenue * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No data</p>}
            </div>

            {/* Staff Leaderboard — 4 cols */}
            <div className="lg:col-span-4 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                <Award size={12} className="inline mr-1" /> Staff Leaderboard
              </h3>
              <div className="space-y-2">
                {staff.slice(0, 5).map((s: any, i: number) => {
                  const maxRev = staff[0]?.revenuePesewas || 1;
                  return (
                    <div key={s.staffId} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#64748b' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.staffName}</span>
                          <span className="text-[10px] font-bold font-mono ml-2" style={{ color: '#0d9488' }}>{s.revenueFormatted}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                            <div className="h-full rounded-full" style={{ width: (s.revenuePesewas / maxRev * 100) + '%', background: 'linear-gradient(90deg, #0d9488, #06b6d4)' }} />
                          </div>
                          <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{s.salesCount} sales</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {staff.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No sales data</p>}
              </div>
            </div>
          </div>

          {/* ── Payment Method Breakdown ── */}
          {paymentMethods.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                💳 Payment Method Breakdown
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {paymentMethods.map((p: any) => {
                  const pct = totalPaymentRevenue > 0 ? Math.round((p.totalPesewas / totalPaymentRevenue) * 100) : 0;
                  const methodColors: Record<string, { bg: string; color: string; border: string }> = {
                    CASH: { bg: 'rgba(21,128,61,0.08)', color: '#15803d', border: 'rgba(21,128,61,0.2)' },
                    MTN_MOMO: { bg: 'rgba(255,204,0,0.12)', color: '#92400e', border: 'rgba(255,204,0,0.4)' },
                    VODAFONE_CASH: { bg: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: 'rgba(220,38,38,0.2)' },
                    AIRTELTIGO_MONEY: { bg: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: 'rgba(37,99,235,0.2)' },
                    CARD: { bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.2)' },
                    SPLIT: { bg: 'rgba(0,109,119,0.08)', color: '#0d9488', border: 'rgba(0,109,119,0.2)' },
                  };
                  const methodLabels: Record<string, string> = {
                    CASH: '💵 Cash', MTN_MOMO: '📱 MTN MoMo', VODAFONE_CASH: '📱 Vodafone Cash',
                    AIRTELTIGO_MONEY: '📱 AirtelTigo', CARD: '💳 Card', SPLIT: '🔀 Split',
                  };
                  const style = methodColors[p.method] ?? { bg: 'var(--surface-base)', color: 'var(--text-primary)', border: 'var(--surface-border)' };
                  return (
                    <div key={p.method} className="rounded-xl p-3" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                      <p className="text-xs font-bold mb-1" style={{ color: style.color }}>
                        {methodLabels[p.method] ?? p.method}
                      </p>
                      <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                        {p.totalFormatted}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.count} sales</p>
                        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: style.bg, color: style.color }}>
                          {pct}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: style.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top Products ── */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Top Products by Revenue</h3>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{topProducts.length} products</span>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => fmtK(v)} />
                  <YAxis type="category" dataKey="productName" tick={{ fontSize: 10, fill: 'var(--text-primary)' }} width={140} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 11, color: 'var(--text-primary)' }} />
                  <Bar dataKey="revenuePesewas" radius={[0, 4, 4, 0]}>
                    {topProducts.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Product table below chart */}
            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {topProducts.slice(0, 8).map((p: any, i: number) => (
                <div key={p.productId} className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'var(--surface-base)' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.productName}</p>
                    <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.unitsSold} units &bull; {p.revenueFormatted}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            VAT: 15% (12.5% VAT + 2.5% NHIL) on non-exempt items. Prescription medicines VAT exempt per Ghana GRA. Monthly return due 30th.
          </p>
        </>}
      </div>
    </div>
  );
}


/* ── Helper Components ── */

function KpiCard({ icon: Icon, label, value, delta, color }: {
  icon: any; label: string; value: string; color: string; delta?: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl p-3.5 transition-all hover:scale-[1.01]" style={{ background: color + '06', border: '1px solid ' + color + '18' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="rounded-lg p-1.5" style={{ background: color + '15' }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {up ? <TrendingUp size={11} style={{ color: '#16a34a' }} /> : <TrendingDown size={11} style={{ color: '#dc2626' }} />}
          <span className="text-[10px] font-bold" style={{ color: up ? '#16a34a' : '#dc2626' }}>{Math.abs(delta).toFixed(1)}% vs prior</span>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg p-2.5 text-xs" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
      <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {(() => { try { return new Date(label).toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' }); } catch { return label; } })()}
      </p>
      <div className="space-y-0.5">
        <p style={{ color: '#0d9488' }}><span className="font-bold">Revenue:</span> {fmt(d?.revenuePesewas ?? 0)}</p>
        <p style={{ color: 'var(--text-secondary)' }}><span className="font-bold">Sales:</span> {d?.salesCount ?? 0}</p>
        {d?.refundsPesewas > 0 && <p style={{ color: '#dc2626' }}><span className="font-bold">Refunds:</span> {fmt(d.refundsPesewas)}</p>}
      </div>
    </div>
  );
}
