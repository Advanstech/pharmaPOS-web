'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { ArrowLeft, Download, Calendar, TrendingUp, DollarSign, FileText, Eye } from 'lucide-react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
  Legend,
} from 'recharts';
import { formatGhs } from '@/lib/utils';
import { PROFIT_LOSS, CASH_FLOW_FORECAST, LIST_EXPENSES, SUPPLIER_INVOICES } from '@/lib/graphql/accounting.queries';
import { EXPENSE_ANALYTICS } from '@/lib/graphql/expenses.queries';

const REPORT_CATEGORIES = [
  {
    id: 'financial',
    title: 'Financial Statements',
    description: 'Core financial reports',
    icon: FileText,
    reports: [
      { id: 'profit-loss', title: 'Profit & Loss', description: 'Revenue, expenses, and profitability' },
      { id: 'balance-sheet', title: 'Balance Sheet', description: 'Assets, liabilities, and equity' },
      { id: 'cash-flow', title: 'Cash Flow Statement', description: 'Cash inflows and outflows' },
    ],
  },
  {
    id: 'supplier',
    title: 'Supplier Reports',
    description: 'Accounts payable analysis',
    icon: DollarSign,
    reports: [
      { id: 'payables-aging', title: 'Payables Aging', description: 'Outstanding invoices by age' },
      { id: 'supplier-payments', title: 'Supplier Payment History', description: 'Payment records by supplier' },
      { id: 'purchase-analysis', title: 'Purchase Analysis', description: 'Spending analysis by supplier' },
    ],
  },
  {
    id: 'expense',
    title: 'Expense Reports',
    description: 'Staff expense analysis',
    icon: TrendingUp,
    reports: [
      { id: 'expense-by-category', title: 'Expense by Category', description: 'Breakdown by expense type' },
      { id: 'expense-by-staff', title: 'Expense by Staff', description: 'Individual expense patterns' },
      { id: 'budget-vs-actual', title: 'Budget vs Actual', description: 'Budget variance analysis' },
    ],
  },
  {
    id: 'tax',
    title: 'Tax Reports',
    description: 'Ghana tax compliance',
    icon: FileText,
    reports: [
      { id: 'vat-return', title: 'VAT Return', description: '15% VAT report' },
      { id: 'nhil-getfund', title: 'NHIL/GETFund', description: 'NHIL and GETFund levies' },
      { id: 'withholding-tax', title: 'Withholding Tax', description: 'Withholding tax summary' },
    ],
  },
];

const COLORS = ['#0f766e', '#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsHubPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Fetch data for reports
  const { data: profitLossData } = useQuery(PROFIT_LOSS, {
    variables: { periodStart: dateRange.start, periodEnd: dateRange.end },
    skip: !selectedReport || !['profit-loss', 'all'].includes(selectedReport),
  });

  const { data: cashFlowData } = useQuery(CASH_FLOW_FORECAST, {
    skip: !selectedReport || !['cash-flow', 'all'].includes(selectedReport),
  });

  const { data: expensesData } = useQuery(LIST_EXPENSES, {
    variables: { startDate: dateRange.start, endDate: dateRange.end },
    skip: !selectedReport || !['expense-by-category', 'expense-by-staff', 'all'].includes(selectedReport),
  });

  const { data: expenseAnalyticsData } = useQuery(EXPENSE_ANALYTICS, {
    variables: { startDate: dateRange.start, endDate: dateRange.end },
    skip: !selectedReport || !['expense-by-category', 'all'].includes(selectedReport),
  });

  const { data: invoicesData } = useQuery(SUPPLIER_INVOICES, {
    skip: !selectedReport || !['payables-aging', 'all'].includes(selectedReport),
  });

  // Process data for charts
  const profitLoss = profitLossData?.profitLoss;
  const cashFlow = cashFlowData?.cashFlowForecast;
  const expenses = expensesData?.staffExpenses || [];
  const expenseAnalytics = expenseAnalyticsData?.expenseAnalytics;
  const invoices = invoicesData?.supplierInvoices || [];

  // Payables Aging Data
  const payablesAgingData = useMemo(() => {
    const now = new Date();
    const categories = {
      current: { label: 'Current (0-30 days)', amount: 0 },
      overdue31_60: { label: '31-60 days', amount: 0 },
      overdue61_90: { label: '61-90 days', amount: 0 },
      overdue90: { label: '90+ days', amount: 0 },
    };

    invoices.forEach((invoice: any) => {
      if (invoice.status === 'PAID' || !invoice.dueDate) return;
      
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue <= 0) {
        categories.current.amount += invoice.balancePesewas;
      } else if (daysOverdue <= 30) {
        categories.overdue31_60.amount += invoice.balancePesewas;
      } else if (daysOverdue <= 60) {
        categories.overdue61_90.amount += invoice.balancePesewas;
      } else {
        categories.overdue90.amount += invoice.balancePesewas;
      }
    });

    return Object.entries(categories).map(([key, data]) => ({
      name: data.label,
      value: data.amount / 100,
    }));
  }, [invoices]);

  // Expense by Category Data
  const expenseByCategoryData = useMemo(() => {
    if (expenseAnalytics?.byCategory) {
      return expenseAnalytics.byCategory.map((item: any) => ({
        category: item.category,
        amount: parseFloat(item.amountFormatted?.replace(/[^0-9.-]/g, '') || '0'),
      }));
    }

    const categoryMap = new Map();
    expenses.forEach((expense: any) => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amountPesewas / 100);
    });

    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [expenses, expenseAnalytics]);

  // Render specific report
  const renderReport = () => {
    if (!selectedReport) return null;

    switch (selectedReport) {
      case 'profit-loss':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                <p className="text-sm text-content-secondary">Revenue</p>
                <p className="text-2xl font-bold text-teal mt-1">{profitLoss?.revenueFormatted || 'GH₵0.00'}</p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                <p className="text-sm text-content-secondary">Net Profit</p>
                <p className="text-2xl font-bold mt-1" style={{ 
                  color: (profitLoss?.netProfitPesewas ?? 0) >= 0 ? '#16a34a' : '#dc2626' 
                }}>
                  {profitLoss?.netProfitFormatted || 'GH₵0.00'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                <p className="text-sm text-content-secondary">Gross Margin</p>
                <p className="text-2xl font-bold text-content-primary mt-1">
                  {profitLoss?.grossProfitMarginPct ? `${profitLoss.grossProfitMarginPct.toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-semibold mb-4">Profit & Loss Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-content-secondary">Revenue</span>
                  <span className="font-medium">{profitLoss?.revenueFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Cost of Goods Sold</span>
                  <span className="font-medium">{profitLoss?.cogsFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-surface-border">
                  <span className="font-medium">Gross Profit</span>
                  <span className="font-medium">{profitLoss?.grossProfitFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Operating Expenses</span>
                  <span className="font-medium">{profitLoss?.operatingExpensesFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-surface-border">
                  <span className="font-semibold text-lg">Net Profit</span>
                  <span className="font-semibold text-lg" style={{ 
                    color: (profitLoss?.netProfitPesewas ?? 0) >= 0 ? '#16a34a' : '#dc2626' 
                  }}>
                    {profitLoss?.netProfitFormatted || 'GH₵0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payables-aging':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {payablesAgingData.map((item, index) => (
                <div key={item.name} className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                  <p className="text-sm text-content-secondary">{item.name}</p>
                  <p className="text-xl font-bold mt-1" style={{ color: COLORS[index] }}>
                    {formatGhs(item.value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-semibold mb-4">Payables Aging Chart</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payablesAgingData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {payablesAgingData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatGhs(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-semibold mb-4">Overdue Invoices</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left py-2 text-sm font-medium text-content-secondary">Supplier</th>
                      <th className="text-left py-2 text-sm font-medium text-content-secondary">Invoice #</th>
                      <th className="text-left py-2 text-sm font-medium text-content-secondary">Due Date</th>
                      <th className="text-right py-2 text-sm font-medium text-content-secondary">Days Overdue</th>
                      <th className="text-right py-2 text-sm font-medium text-content-secondary">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices
                      .filter((inv: any) => inv.status !== 'PAID' && inv.dueDate && new Date(inv.dueDate) < new Date())
                      .slice(0, 10)
                      .map((invoice: any) => {
                        const daysOverdue = Math.floor(
                          (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        return (
                          <tr key={invoice.id} className="border-b border-surface-border">
                            <td className="py-2 text-sm">{invoice.supplierName}</td>
                            <td className="py-2 text-sm">{invoice.invoiceNumber}</td>
                            <td className="py-2 text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                            <td className="py-2 text-sm text-right text-red-600">{daysOverdue}</td>
                            <td className="py-2 text-sm text-right font-medium">{invoice.balanceFormatted}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'expense-by-category':
        return (
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-semibold mb-4">Expense Breakdown by Category</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseByCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatGhs(value)} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {expenseByCategoryData.map((_entry: unknown, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-semibold mb-4">Expense Summary</h3>
              <div className="space-y-2">
                {expenseByCategoryData.map((item: any, index: number) => (
                  <div key={item.category} className="flex justify-between items-center p-2 rounded-lg hover:bg-surface-hover">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm font-medium">{item.category}</span>
                    </div>
                    <span className="text-sm font-bold">{formatGhs(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'cash-flow':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                <p className="text-sm text-content-secondary">Current Cash</p>
                <p className="text-2xl font-bold text-teal mt-1">{cashFlow?.currentCashFormatted || 'GH₵0.00'}</p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                <p className="text-sm text-content-secondary">Cash Runway</p>
                <p className="text-2xl font-bold text-content-primary mt-1">
                  {cashFlow ? `${Math.round(cashFlow.cashRunwayDays)} days` : '—'}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
                <p className="text-sm text-content-secondary">Payables Due (7d)</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {cashFlow?.payablesDue7DaysFormatted || 'GH₵0.00'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-surface-border" style={{ background: 'var(--surface-card)' }}>
              <h3 className="text-lg font-semibold mb-4">Cash Flow Forecast</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-content-secondary">Projected Revenue (7 days)</span>
                  <span className="font-medium text-green-600">+{cashFlow?.projectedRevenue7DaysFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Payables Due (7 days)</span>
                  <span className="font-medium text-red-600">-{cashFlow?.payablesDue7DaysFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Projected Revenue (30 days)</span>
                  <span className="font-medium text-green-600">+{cashFlow?.projectedRevenue30DaysFormatted || 'GH₵0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-secondary">Payables Due (30 days)</span>
                  <span className="font-medium text-red-600">-{cashFlow?.payablesDue30DaysFormatted || 'GH₵0.00'}</span>
                </div>
              </div>
              
              {cashFlow?.recommendation && (
                <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">Recommendation</p>
                  <p className="text-sm text-blue-700 mt-1">{cashFlow.recommendation}</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-content-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-content-primary">Report Coming Soon</h3>
            <p className="text-sm text-content-secondary mt-1">This report is under development</p>
          </div>
        );
    }
  };

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/accounting"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Accounting
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Financial Reports</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">
            Comprehensive financial analysis and reporting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-sm"
               style={{ background: 'var(--surface-card)' }}>
            <Calendar className="h-4 w-4" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="outline-none bg-transparent"
              style={{ color: 'var(--text-primary)' }}
            />
            <span className="text-content-secondary">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="outline-none bg-transparent"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          
          {selectedReport && (
            <button className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-content-primary hover:bg-surface-hover"
                    style={{ background: 'var(--surface-card)' }}>
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {REPORT_CATEGORIES.map((category) => (
              <div key={category.id} className="rounded-xl border border-surface-border overflow-hidden"
                   style={{ background: 'var(--surface-card)' }}>
                <div className="p-4 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-teal" />
                    <h3 className="font-semibold text-content-primary">{category.title}</h3>
                  </div>
                  <p className="text-xs text-content-secondary mt-1">{category.description}</p>
                </div>
                <div className="p-2">
                  {category.reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedReport === report.id
                          ? 'bg-teal/10 text-teal font-medium'
                          : 'text-content-primary hover:bg-surface-hover'
                      }`}
                    >
                      <p className="font-medium">{report.title}</p>
                      <p className="text-xs text-content-secondary mt-0.5">{report.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3">
          {selectedReport ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-content-primary">
                  {REPORT_CATEGORIES
                    .flatMap(c => c.reports)
                    .find(r => r.id === selectedReport)?.title || 'Report'}
                </h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-sm text-content-secondary hover:text-content-primary"
                >
                  Clear
                </button>
              </div>
              {renderReport()}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-content-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-content-primary">Select a Report</h3>
              <p className="text-sm text-content-secondary mt-1">
                Choose a report from the sidebar to view detailed financial analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
