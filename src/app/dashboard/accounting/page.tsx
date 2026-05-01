'use client';

import { useMemo, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import {
  Download, TrendingUp, TrendingDown, Wallet, ReceiptText, Landmark,
  ArrowRight, PieChart as PieIcon, BarChart3, FileText, CreditCard,
  AlertTriangle, CheckCircle, Clock, DollarSign, Package, Scale,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Cell, Area, AreaChart,
} from 'recharts';
import {
  ACCOUNTING_WORKBOOK, CASH_FLOW_FORECAST, PROFIT_LOSS, SUPPLIER_INVOICES,
  FINANCIAL_SUMMARY, TRIAL_BALANCE, BALANCE_SHEET, CHART_OF_ACCOUNTS,
} from '@/lib/graphql/accounting.queries';
import { GET_STAFF_EXPENSES } from '@/lib/graphql/expenses.queries';
import { formatGhs } from '@/lib/utils';
import Link from 'next/link';

type Period = '7d' | '30d' | '90d' | '1y';
type Tab = 'overview' | 'statements' | 'ledger';

const COLORS = ['#0d9488', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#10b981'];
const DONUT_COLORS = ['#dc2626', '#f59e0b', '#0d9488'];

function fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
function getRange(p: Period) {
  const end = new Date();
  const start = new Date();
  const days = p === '7d' ? 6 : p === '30d' ? 29 : p === '90d' ? 89 : 364;
  start.setDate(end.getDate() - days);
  return { start: fmtDate(start), end: fmtDate(end) };
}
function base64ToBlob(b64: string, mime: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function fmt(pesewas: number) { return 'GH\u20B5' + (pesewas / 100).toFixed(2); }

export default function AccountingPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [tab, setTab] = useState<Tab>('overview');
  const { start, end } = useMemo(() => getRange(period), [period]);

  // Queries
  const { data: plData } = useQuery(PROFIT_LOSS, { variables: { periodStart: start, periodEnd: end }, fetchPolicy: 'cache-and-network' });
  const { data: cfData } = useQuery(CASH_FLOW_FORECAST, { fetchPolicy: 'cache-and-network' });
  const { data: invData } = useQuery(SUPPLIER_INVOICES, { fetchPolicy: 'cache-and-network' });
  const { data: expData } = useQuery(GET_STAFF_EXPENSES, { fetchPolicy: 'cache-and-network' });
  const { data: tbData } = useQuery(TRIAL_BALANCE, { fetchPolicy: 'cache-and-network', skip: tab !== 'statements' && tab !== 'ledger' });
  const { data: bsData } = useQuery(BALANCE_SHEET, { fetchPolicy: 'cache-and-network', skip: tab !== 'statements' });
  const { data: coaData } = useQuery(CHART_OF_ACCOUNTS, { fetchPolicy: 'cache-and-network', skip: tab !== 'ledger' });
  const [fetchWorkbook, { loading: exporting }] = useLazyQuery(ACCOUNTING_WORKBOOK, { fetchPolicy: 'no-cache' });

  const pl = plData?.profitLoss;
  const cf = cfData?.cashFlowForecast;
  const invoices = (invData?.supplierInvoices ?? []) as any[];
  const expenses = (expData?.staffExpenses ?? []) as any[];
  const trialBalance = (tbData?.trialBalance ?? []) as any[];
  const balanceSheet = bsData?.balanceSheet as any;
  const coa = (coaData?.chartOfAccounts ?? []) as any[];

  // Derived data
  const openPayables = invoices.filter((i: any) => i.status !== 'PAID').reduce((s: number, i: any) => s + i.balancePesewas, 0);
  const pendingExpenses = expenses.filter((e: any) => e.status === 'PENDING').length;
  const approvedExpenses = expenses.filter((e: any) => e.status === 'APPROVED' || e.status === 'REIMBURSED');

  const expenseByCategory = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const e of expenses) bucket.set(e.category, (bucket.get(e.category) ?? 0) + (e.amountPesewas || 0));
    return Array.from(bucket.entries()).map(([cat, amt]) => ({ category: cat, amount: amt / 100 })).sort((a, b) => b.amount - a.amount).slice(0, 7);
  }, [expenses]);

  const invoiceAging = useMemo(() => {
    const now = Date.now();
    let overdue = 0, dueSoon = 0, later = 0;
    for (const inv of invoices) {
      if (inv.status === 'PAID' || !inv.dueDate) continue;
      const diff = (new Date(inv.dueDate).getTime() - now) / 86400000;
      if (diff < 0) overdue += inv.balancePesewas;
      else if (diff <= 7) dueSoon += inv.balancePesewas;
      else later += inv.balancePesewas;
    }
    return [
      { name: 'Overdue', value: overdue / 100, color: '#dc2626' },
      { name: 'Due 7d', value: dueSoon / 100, color: '#f59e0b' },
      { name: 'Later', value: later / 100, color: '#0d9488' },
    ];
  }, [invoices]);

  // P&L waterfall data
  const waterfallData = useMemo(() => {
    if (!pl) return [];
    return [
      { name: 'Revenue', value: pl.revenuePesewas / 100, fill: '#0d9488' },
      { name: 'COGS', value: -(pl.cogsPesewas / 100), fill: '#ef4444' },
      { name: 'Gross', value: pl.grossProfitPesewas / 100, fill: '#06b6d4' },
      { name: 'OpEx', value: -(pl.operatingExpensesPesewas / 100), fill: '#f59e0b' },
      { name: 'Net', value: pl.netProfitPesewas / 100, fill: pl.netProfitPesewas >= 0 ? '#16a34a' : '#dc2626' },
    ];
  }, [pl]);

  const handleExport = async () => {
    const { data } = await fetchWorkbook({ variables: { periodStart: start, periodEnd: end } });
    const p = data?.accountingWorkbook;
    if (!p?.base64Content) return;
    const blob = base64ToBlob(p.base64Content, p.mimeType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = p.fileName; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* ── Hero Header ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.1) 0%, rgba(6,182,212,0.05) 50%, rgba(59,130,246,0.08) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1440px] px-4 pt-5 pb-4 md:px-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Financial Command Center
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Real-time P&L, cash flow, balance sheet &amp; GL — Azzay Pharmacy
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => void handleExport()} disabled={exporting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
                style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-secondary)', opacity: exporting ? 0.6 : 1 }}>
                <Download size={13} /> {exporting ? 'Exporting...' : 'Excel Export'}
              </button>
            </div>
          </div>

          {/* Period + Tab selector */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              {(['7d', '30d', '90d', '1y'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="rounded-md px-3 py-1 text-[11px] font-semibold transition-all"
                  style={period === p ? { background: '#0d9488', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' } : { color: 'var(--text-muted)' }}>
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              {([
                { key: 'overview', label: 'Overview', icon: PieIcon },
                { key: 'statements', label: 'Statements', icon: FileText },
                { key: 'ledger', label: 'Chart of Accounts', icon: Scale },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-semibold transition-all"
                  style={tab === t.key ? { background: '#0d9488', color: '#fff', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' } : { color: 'var(--text-muted)' }}>
                  <t.icon size={12} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6">
        {tab === 'overview' && <OverviewTab pl={pl} cf={cf} openPayables={openPayables} pendingExpenses={pendingExpenses} waterfallData={waterfallData} expenseByCategory={expenseByCategory} invoiceAging={invoiceAging} expenses={expenses} invoices={invoices} />}
        {tab === 'statements' && <StatementsTab pl={pl} balanceSheet={balanceSheet} trialBalance={trialBalance} />}
        {tab === 'ledger' && <LedgerTab coa={coa} trialBalance={trialBalance} />}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB — KPI cards, P&L waterfall, expense donut, payables aging
   ═══════════════════════════════════════════════════════════════════════════════ */

function OverviewTab({ pl, cf, openPayables, pendingExpenses, waterfallData, expenseByCategory, invoiceAging, expenses, invoices }: any) {
  const netPositive = (pl?.netProfitPesewas ?? 0) >= 0;
  const grossMargin = pl?.grossProfitMarginPct ?? 0;
  const netMargin = pl?.netProfitMarginPct ?? 0;

  return (
    <div className="space-y-5">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={Landmark} label="Revenue" value={pl?.revenueFormatted ?? 'GH\u20B50.00'} color="#0d9488" />
        <KpiCard icon={netPositive ? TrendingUp : TrendingDown} label="Net Profit" value={pl?.netProfitFormatted ?? 'GH\u20B50.00'} color={netPositive ? '#16a34a' : '#dc2626'}
          sub={netMargin ? netMargin.toFixed(1) + '% margin' : undefined} />
        <KpiCard icon={Wallet} label="Cash Runway" value={cf ? Math.round(cf.cashRunwayDays) + ' days' : '\u2014'} color="#3b82f6"
          sub={cf?.currentCashFormatted ? 'Cash: ' + cf.currentCashFormatted : undefined} />
        <KpiCard icon={ReceiptText} label="Open Payables" value={fmt(openPayables)} color="#f59e0b"
          sub={invoices.filter((i: any) => i.status !== 'PAID').length + ' invoices'} />
        <KpiCard icon={Clock} label="Pending Expenses" value={String(pendingExpenses)} color={pendingExpenses > 0 ? '#dc2626' : '#16a34a'}
          sub={pendingExpenses > 0 ? 'Needs approval' : 'All clear'} link="/dashboard/expenses" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* P&L Waterfall — 5 cols */}
        <div className="lg:col-span-5 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Profit & Loss</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: netPositive ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)', color: netPositive ? '#16a34a' : '#dc2626' }}>
                {grossMargin.toFixed(1)}% gross
              </span>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.12)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => v >= 1000 ? (v/1000).toFixed(0) + 'k' : String(v)} />
                <Tooltip formatter={(v: number) => formatGhs(Math.abs(v))} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown — 4 cols */}
        <div className="lg:col-span-4 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Expenses by Category</h3>
            <Link href="/dashboard/expenses" className="text-[10px] font-bold text-teal hover:underline">View All</Link>
          </div>
          {expenseByCategory.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseByCategory} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2} strokeWidth={0}>
                    {expenseByCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatGhs(v)} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 11, color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No expense data</p>
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {expenseByCategory.slice(0, 5).map((e: any, i: number) => (
              <div key={e.category} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>{e.category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payables Aging — 3 cols */}
        <div className="lg:col-span-3 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Payables Aging</h3>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceAging.filter((d: any) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={30} strokeWidth={0}>
                  {invoiceAging.map((d: any, i: number) => <Cell key={i} fill={d.color || DONUT_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatGhs(v)} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 8, fontSize: 11, color: 'var(--text-primary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {invoiceAging.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatGhs(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Links Row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickLink icon={CreditCard} label="Record Payment" sub="Pay supplier invoices" href="/dashboard/accounting/invoices" color="#3b82f6" />
        <QuickLink icon={ReceiptText} label="Upload Invoice" sub="OCR scan & import" href="/dashboard/invoices/upload" color="#0d9488" />
        <QuickLink icon={DollarSign} label="New Expense" sub="Submit for approval" href="/dashboard/expenses/new" color="#f59e0b" />
        <QuickLink icon={BarChart3} label="CFO Briefing" sub="Full financial analysis" href="/dashboard/cfo" color="#8b5cf6" />
      </div>

      {/* ── Recent Activity (compact) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Expenses */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recent Expenses</h3>
            <Link href="/dashboard/expenses" className="text-[10px] font-bold text-teal hover:underline flex items-center gap-0.5">View All <ArrowRight size={10} /></Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
            {expenses.slice(0, 5).map((e: any) => (
              <Link key={e.id} href={'/dashboard/expenses/' + e.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.description || e.category}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{e.createdByName} &bull; {e.category}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{e.amountFormatted}</p>
                  <StatusPill status={e.status} />
                </div>
              </Link>
            ))}
            {expenses.length === 0 && <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No expenses yet</p>}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--surface-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Supplier Invoices</h3>
            <Link href="/dashboard/accounting/invoices" className="text-[10px] font-bold text-teal hover:underline flex items-center gap-0.5">View All <ArrowRight size={10} /></Link>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
            {invoices.slice(0, 5).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{inv.supplierName}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>#{inv.invoiceNumber} {inv.dueDate ? '\u2022 Due ' + new Date(inv.dueDate).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' }) : ''}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{inv.balanceFormatted}</p>
                  <StatusPill status={inv.status} />
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No invoices</p>}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   STATEMENTS TAB — P&L, Balance Sheet, Trial Balance
   ═══════════════════════════════════════════════════════════════════════════════ */

function StatementsTab({ pl, balanceSheet, trialBalance }: any) {
  const [stmtView, setStmtView] = useState<'pl' | 'bs' | 'tb'>('pl');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg p-0.5 w-fit" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
        {([
          { key: 'pl', label: 'Profit & Loss' },
          { key: 'bs', label: 'Balance Sheet' },
          { key: 'tb', label: 'Trial Balance' },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setStmtView(s.key)}
            className="rounded-md px-4 py-1.5 text-[11px] font-semibold transition-all"
            style={stmtView === s.key ? { background: '#0d9488', color: '#fff' } : { color: 'var(--text-muted)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {stmtView === 'pl' && pl && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Profit & Loss Statement</h3>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pl.periodStart} to {pl.periodEnd}</p>
          </div>
          <div className="p-5">
            <table className="w-full">
              <tbody className="text-sm">
                <StatementRow label="Sales Revenue" value={pl.revenueFormatted} bold color="#0d9488" />
                <StatementRow label="Less: Cost of Goods Sold" value={'(' + pl.cogsFormatted + ')'} indent color="#dc2626" />
                <StatementDivider />
                <StatementRow label="Gross Profit" value={pl.grossProfitFormatted} bold sub={pl.grossProfitMarginPct.toFixed(1) + '% margin'} color={pl.grossProfitPesewas >= 0 ? '#16a34a' : '#dc2626'} />
                <StatementRow label="Less: Operating Expenses" value={'(' + pl.operatingExpensesFormatted + ')'} indent color="#f59e0b" />
                <StatementDivider />
                <StatementRow label="Net Profit / (Loss)" value={pl.netProfitFormatted} bold highlight sub={pl.netProfitMarginPct.toFixed(1) + '% margin'} color={pl.netProfitPesewas >= 0 ? '#16a34a' : '#dc2626'} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stmtView === 'bs' && balanceSheet && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Assets */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Assets</h3>
            </div>
            <div className="p-4">
              {balanceSheet.assets.map((a: any, i: number) => (
                <div key={`asset-${a.accountCode}-${i}`} className="flex items-center justify-between py-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.accountCode} {a.accountName}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{a.balanceFormatted}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: '2px solid var(--surface-border)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Total Assets</span>
                <span className="text-sm font-bold font-mono" style={{ color: '#0d9488' }}>{balanceSheet.totalAssetsFormatted}</span>
              </div>
            </div>
          </div>

          {/* Liabilities + Equity */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(220,38,38,0.04)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Liabilities</h3>
              </div>
              <div className="p-4">
                {balanceSheet.liabilities.map((l: any, i: number) => (
                  <div key={`liability-${l.accountCode}-${i}`} className="flex items-center justify-between py-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{l.accountCode} {l.accountName}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{l.balanceFormatted}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: '2px solid var(--surface-border)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Total Liabilities</span>
                  <span className="text-sm font-bold font-mono" style={{ color: '#dc2626' }}>{balanceSheet.totalLiabilitiesFormatted}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(59,130,246,0.04)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Equity</h3>
              </div>
              <div className="p-4">
                {balanceSheet.equity.map((e: any, i: number) => (
                  <div key={`equity-${e.accountCode}-${i}`} className="flex items-center justify-between py-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{e.accountCode} {e.accountName}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{e.balanceFormatted}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 mt-2" style={{ borderTop: '2px solid var(--surface-border)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Total Equity</span>
                  <span className="text-sm font-bold font-mono" style={{ color: '#3b82f6' }}>{balanceSheet.totalEquityFormatted}</span>
                </div>
              </div>
            </div>

            {/* Balance check */}
            <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: balanceSheet.isBalanced ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)', border: '1px solid ' + (balanceSheet.isBalanced ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)') }}>
              {balanceSheet.isBalanced ? <CheckCircle size={14} style={{ color: '#16a34a' }} /> : <AlertTriangle size={14} style={{ color: '#dc2626' }} />}
              <span className="text-[11px] font-bold" style={{ color: balanceSheet.isBalanced ? '#16a34a' : '#dc2626' }}>
                {balanceSheet.isBalanced ? 'Balance sheet is balanced \u2714' : 'Balance sheet is NOT balanced \u2718'}
              </span>
            </div>
          </div>
        </div>
      )}

      {stmtView === 'tb' && trialBalance.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Trial Balance</h3>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>All GL account balances as of today</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <th className="text-left px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Code</th>
                  <th className="text-left px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Account</th>
                  <th className="text-right px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Debit</th>
                  <th className="text-right px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Credit</th>
                  <th className="text-right px-4 py-2 font-bold" style={{ color: 'var(--text-muted)' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row: any, index: number) => (
                  <tr key={`${row.accountCode}-${row.accountName}-${index}`} className="hover:bg-[rgba(0,0,0,0.02)]" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td className="px-4 py-2 font-mono font-bold" style={{ color: '#0d9488' }}>{row.accountCode}</td>
                    <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>{row.accountName}</td>
                    <td className="px-4 py-2 text-right font-mono" style={{ color: row.totalDebit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.totalDebit > 0 ? fmt(row.totalDebit) : '\u2014'}</td>
                    <td className="px-4 py-2 text-right font-mono" style={{ color: row.totalCredit > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{row.totalCredit > 0 ? fmt(row.totalCredit) : '\u2014'}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: row.balance >= 0 ? '#0d9488' : '#dc2626' }}>{row.balanceFormatted}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--surface-border)' }}>
                  <td colSpan={2} className="px-4 py-2 font-bold" style={{ color: 'var(--text-primary)' }}>Totals</td>
                  <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(trialBalance.reduce((s: number, r: any) => s + r.totalDebit, 0))}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(trialBalance.reduce((s: number, r: any) => s + r.totalCredit, 0))}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: '#0d9488' }}>{fmt(Math.abs(trialBalance.reduce((s: number, r: any) => s + r.balance, 0)))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {stmtView === 'tb' && trialBalance.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <Scale className="mx-auto mb-3 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No GL entries yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Complete a sale or approve an expense to see trial balance data</p>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   LEDGER TAB — Chart of Accounts
   ═══════════════════════════════════════════════════════════════════════════════ */

function LedgerTab({ coa, trialBalance }: any) {
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const a of coa) {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    }
    return groups;
  }, [coa]);

  const typeColors: Record<string, string> = {
    ASSET: '#0d9488',
    LIABILITY: '#dc2626',
    EQUITY: '#3b82f6',
    REVENUE: '#16a34a',
    EXPENSE: '#f59e0b',
  };

  if (coa.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
        <Scale className="mx-auto mb-3 h-10 w-10 opacity-20" />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Chart of Accounts loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Account type summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => {
          const accounts = coa.filter((a: any) => a.accountType === type);
          const total = accounts.reduce((s: number, a: any) => s + a.balancePesewas, 0);
          return (
            <div key={type} className="rounded-2xl p-3" style={{ background: typeColors[type] + '08', border: '1px solid ' + typeColors[type] + '20' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{type}</p>
              <p className="text-lg font-bold font-mono mt-1" style={{ color: typeColors[type] }}>{fmt(total)}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{accounts.length} accounts</p>
            </div>
          );
        })}
      </div>

      {/* Grouped accounts */}
      {Object.entries(grouped).map(([category, accounts]) => (
        <div key={category} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.02)' }}>
            <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{category}</h3>
            <span className="text-[10px] font-bold font-mono" style={{ color: 'var(--text-muted)' }}>
              {fmt((accounts as any[]).reduce((s: number, a: any) => s + a.balancePesewas, 0))}
            </span>
          </div>
          <div>
            {(accounts as any[]).map((a: any) => (
              <div key={a.accountCode} className="flex items-center justify-between px-4 py-2 hover:bg-[rgba(0,0,0,0.015)]" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: typeColors[a.accountType] + '12', color: typeColors[a.accountType] }}>{a.accountCode}</span>
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{a.accountName}</span>
                </div>
                <span className="text-xs font-bold font-mono" style={{ color: a.balancePesewas > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {a.balancePesewas > 0 ? a.balanceFormatted : '\u2014'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function KpiCard({ icon: Icon, label, value, color, sub, link }: {
  icon: any; label: string; value: string; color: string; sub?: string; link?: string;
}) {
  const content = (
    <div className="rounded-2xl p-3.5 transition-all hover:scale-[1.01]" style={{ background: color + '06', border: '1px solid ' + color + '18' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="rounded-lg p-1.5" style={{ background: color + '15' }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
  return link ? <Link href={link}>{content}</Link> : content;
}

function QuickLink({ icon: Icon, label, sub, href, color }: {
  icon: any; label: string; sub: string; href: string; color: string;
}) {
  return (
    <Link href={href} className="rounded-2xl p-3.5 flex items-center gap-3 transition-all hover:scale-[1.01] group"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
      <div className="rounded-xl p-2.5" style={{ background: color + '10' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold group-hover:text-teal transition-colors" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
      </div>
      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} className="group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: 'rgba(234,179,8,0.12)', color: '#a16207' },
    APPROVED: { bg: 'rgba(37,99,235,0.1)', color: '#1d4ed8' },
    REJECTED: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
    REIMBURSED: { bg: 'rgba(22,163,74,0.1)', color: '#15803d' },
    PAID: { bg: 'rgba(22,163,74,0.1)', color: '#15803d' },
    PARTIAL: { bg: 'rgba(234,179,8,0.12)', color: '#a16207' },
    MATCHED: { bg: 'rgba(37,99,235,0.1)', color: '#1d4ed8' },
    OVERDUE: { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

function StatementRow({ label, value, bold, indent, sub, color, highlight }: {
  label: string; value: string; bold?: boolean; indent?: boolean; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <tr>
      <td className={'py-2 ' + (indent ? 'pl-6' : 'pl-0')} style={{ color: 'var(--text-secondary)' }}>
        <span className={'text-sm ' + (bold ? 'font-bold' : '')} style={bold ? { color: 'var(--text-primary)' } : undefined}>{label}</span>
        {sub && <span className="ml-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
      </td>
      <td className="py-2 text-right">
        <span className={'text-sm font-mono ' + (bold ? 'font-bold text-base' : '')} style={{ color: color || 'var(--text-primary)' }}>
          {highlight ? <span className="px-2 py-0.5 rounded-lg" style={{ background: (color || '#0d9488') + '10' }}>{value}</span> : value}
        </span>
      </td>
    </tr>
  );
}

function StatementDivider() {
  return (
    <tr><td colSpan={2} className="py-1"><div style={{ borderTop: '1px dashed var(--surface-border)' }} /></td></tr>
  );
}
