'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  ArrowLeft, CheckCircle, Clock, DollarSign, Receipt, TrendingUp,
  Banknote, Smartphone, CreditCard, AlertTriangle, Printer, Download,
  ShieldCheck, Users, Package,
} from 'lucide-react';
import Link from 'next/link';
import { DAILY_SUMMARY, RECENT_SALES } from '@/lib/graphql/sales.queries';
import { GET_STAFF_EXPENSES } from '@/lib/graphql/expenses.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { SmartTextarea } from '@/components/ui/smart-textarea';

function fmt(pesewas: number) { return 'GH\u20B5' + (pesewas / 100).toFixed(2); }
function today() { return new Date().toISOString().split('T')[0]; }

export default function EndOfDayPage() {
  const user = useAuthStore(s => s.user);
  const [selectedDate, setSelectedDate] = useState(today());
  const [cashCounted, setCashCounted] = useState('');
  const [momoCounted, setMomoCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [closed, setClosed] = useState(false);

  const { data: summaryData, loading } = useQuery(DAILY_SUMMARY, {
    variables: { date: selectedDate },
    fetchPolicy: 'cache-and-network',
  });
  const { data: salesData } = useQuery(RECENT_SALES, { fetchPolicy: 'cache-and-network' });
  const { data: expData } = useQuery(GET_STAFF_EXPENSES, { fetchPolicy: 'cache-and-network' });

  const summary = summaryData?.dailySummary;
  const recentSales = (salesData?.recentSales ?? []) as any[];
  const expenses = (expData?.staffExpenses ?? []) as any[];

  // Calculate expected cash from today's sales
  const todaySales = recentSales.filter((s: any) => {
    const saleDate = (s.soldAt || s.createdAt || '').split('T')[0];
    return saleDate === selectedDate && s.status === 'COMPLETED';
  });

  const todayRefunds = recentSales.filter((s: any) => {
    const saleDate = (s.soldAt || s.createdAt || '').split('T')[0];
    return saleDate === selectedDate && s.status === 'REFUNDED';
  });

  const todayExpenses = expenses.filter((e: any) => {
    try { return e.expenseDate?.split('T')[0] === selectedDate; } catch { return false; }
  });

  const expectedCash = summary?.totalRevenuePesewas ?? 0;
  const cashCountedPesewas = Math.round(parseFloat(cashCounted || '0') * 100);
  const momoCountedPesewas = Math.round(parseFloat(momoCounted || '0') * 100);
  const totalCounted = cashCountedPesewas + momoCountedPesewas;
  const variance = totalCounted - expectedCash;
  const varianceAbs = Math.abs(variance);
  const varianceOk = varianceAbs <= 100; // Within GH₵1.00

  const handleClose = () => {
    setClosed(true);
    // In production, this would save to the database
  };

  const handlePrint = () => {
    window.print();
  };

  const printDate = new Date(selectedDate).toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const printTime = new Date().toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: '2-digit', minute: '2-digit' });
  const branchName = user?.branchName || 'Azzay Pharmacy';

  return (
    <div style={{ background: 'var(--surface-base)', minHeight: '100vh' }}>
      {/* ── PRINT-ONLY RECEIPT ── hidden on screen, shown when printing ── */}
      <div id="eod-print-receipt" className="hidden print:block">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #eod-print-receipt, #eod-print-receipt * { visibility: visible !important; }
            #eod-print-receipt { position: fixed; top: 0; left: 0; width: 100%; }
            @page { margin: 15mm 20mm; size: A4 portrait; }
          }
        `}</style>

        {/* Receipt Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0d9488', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#0d9488', letterSpacing: '-0.5px' }}>
            PharmaPOS Pro
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginTop: '2px' }}>{branchName}</div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>End of Day Reconciliation Report</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>{printDate} &bull; Printed at {printTime}</div>
        </div>

        {/* Cashier */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '8px 12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cashier</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{user?.name || 'Staff'}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: closed ? '#16a34a' : '#d97706' }}>
              {closed ? '✓ Register Closed' : '⏳ Register Open'}
            </div>
          </div>
        </div>

        {/* Day Summary */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
            Day Summary
          </div>
          {[
            { label: 'Total Sales', value: String(summary?.salesCount ?? 0), bold: false },
            { label: 'Gross Revenue', value: summary?.totalRevenueFormatted ?? 'GH₵0.00', bold: true, color: '#0d9488' },
            { label: 'VAT Collected', value: summary?.vatCollectedPesewas ? fmt(summary.vatCollectedPesewas) : 'GH₵0.00', bold: false },
            { label: 'Refunds', value: String(todayRefunds.length), bold: false, color: todayRefunds.length > 0 ? '#dc2626' : undefined },
            { label: 'Expenses', value: String(todayExpenses.length), bold: false },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #e5e7eb' }}>
              <span style={{ fontSize: '12px', color: '#374151' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: row.bold ? '700' : '600', color: row.color || '#111827', fontFamily: 'monospace' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '2px solid #0d9488' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Net Revenue</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0d9488', fontFamily: 'monospace' }}>{summary?.totalRevenueFormatted ?? 'GH₵0.00'}</span>
          </div>
        </div>

        {/* Cash Count */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
            Cash Register Count
          </div>
          {[
            { label: 'Cash Counted', value: cashCounted ? 'GH₵' + parseFloat(cashCounted).toFixed(2) : 'GH₵0.00' },
            { label: 'MoMo Received', value: momoCounted ? 'GH₵' + parseFloat(momoCounted).toFixed(2) : 'GH₵0.00' },
            { label: 'Total Counted', value: fmt(totalCounted) },
            { label: 'Expected', value: fmt(expectedCash) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dotted #e5e7eb' }}>
              <span style={{ fontSize: '12px', color: '#374151' }}>{row.label}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827', fontFamily: 'monospace' }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', marginTop: '4px', borderTop: '2px solid ' + (varianceOk ? '#16a34a' : '#dc2626') }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Variance</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: varianceOk ? '#16a34a' : '#dc2626', fontFamily: 'monospace' }}>
              {variance >= 0 ? '+' : ''}{fmt(variance)} {varianceOk ? '✓ Balanced' : '⚠ Check'}
            </span>
          </div>
        </div>

        {/* Closing Notes */}
        {notes.trim() && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Closing Notes</div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>{notes}</div>
          </div>
        )}

        {/* Today's Transactions */}
        {todaySales.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
              Today&apos;s Transactions ({todaySales.length})
            </div>
            {todaySales.slice(0, 20).map((sale: any, i: number) => (
              <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #e5e7eb', fontSize: '11px' }}>
                <span style={{ color: '#374151' }}>
                  {i + 1}. {sale.cashierName || 'Staff'} &bull; {sale.items?.length ?? 0} items
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#0d9488' }}>{sale.totalFormatted}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', borderTop: '2px solid #0d9488', paddingTop: '12px', marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>Generated by PharmaPOS Pro &bull; Azzay Pharmacy</div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
            {new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px' }}>
            Cashier Signature: _________________________ &nbsp;&nbsp; Manager Signature: _________________________
          </div>
        </div>
      </div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.1) 0%, rgba(59,130,246,0.06) 100%)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="mx-auto max-w-[1100px] px-4 pt-5 pb-4 md:px-6">
          <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                End of Day Reconciliation
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Close out the register, count cash, and verify the day's transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="rounded-lg border px-3 py-1.5 text-xs"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 py-5 md:px-6 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniKpi icon={Receipt} label="Total Sales" value={String(summary?.salesCount ?? 0)} color="#0d9488" />
          <MiniKpi icon={DollarSign} label="Revenue" value={summary?.totalRevenueFormatted ?? 'GH\u20B50.00'} color="#16a34a" />
          <MiniKpi icon={TrendingUp} label="Avg Sale" value={summary?.averageSaleGhs ? 'GH\u20B5' + Number(summary.averageSaleGhs).toFixed(2) : '\u2014'} color="#3b82f6" />
          <MiniKpi icon={Receipt} label="VAT Collected" value={summary?.vatCollectedPesewas ? fmt(summary.vatCollectedPesewas) : 'GH\u20B50.00'} color="#f59e0b" />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          {/* Left: Cash Count Form */}
          <div className="lg:col-span-3 space-y-4">
            {/* Cash counting */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(13,148,136,0.04)' }}>
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Banknote size={15} style={{ color: '#0d9488' }} /> Cash Register Count
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Banknote size={12} className="inline mr-1" /> Cash Counted (GHS)
                    </label>
                    <input type="number" step="0.01" value={cashCounted} onChange={e => setCashCounted(e.target.value)}
                      placeholder="0.00" disabled={closed}
                      className="w-full rounded-lg border px-3 py-2.5 text-lg font-mono font-bold"
                      style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Smartphone size={12} className="inline mr-1" /> MoMo Received (GHS)
                    </label>
                    <input type="number" step="0.01" value={momoCounted} onChange={e => setMomoCounted(e.target.value)}
                      placeholder="0.00" disabled={closed}
                      className="w-full rounded-lg border px-3 py-2.5 text-lg font-mono font-bold"
                      style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                {/* Variance */}
                <div className="rounded-xl p-4" style={{
                  background: totalCounted === 0 ? 'var(--surface-base)' : varianceOk ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
                  border: '1px solid ' + (totalCounted === 0 ? 'var(--surface-border)' : varianceOk ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'),
                }}>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Expected</p>
                      <p className="text-base font-bold font-mono" style={{ color: '#0d9488' }}>{fmt(expectedCash)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Counted</p>
                      <p className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{fmt(totalCounted)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Variance</p>
                      <p className="text-base font-bold font-mono" style={{ color: varianceOk ? '#16a34a' : '#dc2626' }}>
                        {variance >= 0 ? '+' : ''}{fmt(variance)}
                      </p>
                    </div>
                  </div>
                  {totalCounted > 0 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {varianceOk
                        ? <><CheckCircle size={13} style={{ color: '#16a34a' }} /><span className="text-[11px] font-bold" style={{ color: '#16a34a' }}>Register balanced</span></>
                        : <><AlertTriangle size={13} style={{ color: '#dc2626' }} /><span className="text-[11px] font-bold" style={{ color: '#dc2626' }}>Variance of {fmt(varianceAbs)} detected</span></>
                      }
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Closing Notes</label>
                  <SmartTextarea value={notes} onChange={setNotes} rows={2}
                    context="eod:closing"
                    placeholder="Any notes about the day (discrepancies, incidents, etc.)"
                    className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm bg-[var(--surface-base)] text-[var(--text-primary)]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {!closed ? (
                    <button onClick={handleClose} disabled={totalCounted === 0}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 4px 14px rgba(13,148,136,0.35)' }}>
                      <ShieldCheck size={16} /> Close Register
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
                      <CheckCircle size={16} /> Register Closed
                    </div>
                  )}
                  <button onClick={handlePrint}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                    style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}>
                    <Printer size={15} /> Print Summary
                  </button>
                </div>
              </div>
            </div>

            {/* Day's Transactions */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Today's Transactions ({todaySales.length} sales)
                </h2>
                <Link href="/dashboard/transactions" className="text-[10px] font-bold text-teal hover:underline">View All</Link>
              </div>
              <div className="max-h-[250px] overflow-y-auto divide-y" style={{ borderColor: 'var(--surface-border)' }}>
                {todaySales.slice(0, 15).map((sale: any) => (
                  <Link key={sale.id} href={'/dashboard/transactions/' + sale.id}
                    className="flex items-center justify-between px-5 py-2.5 hover:bg-[rgba(0,0,0,0.02)] transition-colors">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {sale.items?.length ?? 0} items &bull; {sale.cashierName || 'Staff'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(sale.soldAt || sale.createdAt).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: '#0d9488' }}>{sale.totalFormatted}</span>
                  </Link>
                ))}
                {todaySales.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No sales recorded today</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Summary sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Day Summary */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Day Summary</h3>
              <div className="space-y-2.5">
                <SummaryRow label="Total Sales" value={String(summary?.salesCount ?? 0)} />
                <SummaryRow label="Gross Revenue" value={summary?.totalRevenueFormatted ?? 'GH\u20B50.00'} color="#0d9488" />
                <SummaryRow label="VAT Collected" value={summary?.vatCollectedPesewas ? fmt(summary.vatCollectedPesewas) : 'GH\u20B50.00'} />
                <SummaryRow label="Refunds" value={String(todayRefunds.length)} color={todayRefunds.length > 0 ? '#dc2626' : undefined} />
                <SummaryRow label="Expenses" value={String(todayExpenses.length)} />
                <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <SummaryRow label="Net Revenue" value={summary?.totalRevenueFormatted ?? 'GH\u20B50.00'} bold color="#16a34a" />
                </div>
              </div>
            </div>

            {/* Refunds */}
            {todayRefunds.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#dc2626' }}>
                  Refunds ({todayRefunds.length})
                </h3>
                {todayRefunds.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-1">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sale #{r.id.substring(0, 8)}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: '#dc2626' }}>{r.totalFormatted}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cashier info */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Cashier</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: '#0d9488' }}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Staff'}</p>
                  <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-2xl p-4 text-center" style={{
              background: closed ? 'rgba(22,163,74,0.06)' : 'rgba(234,179,8,0.06)',
              border: '1px solid ' + (closed ? 'rgba(22,163,74,0.2)' : 'rgba(234,179,8,0.2)'),
            }}>
              {closed ? (
                <>
                  <CheckCircle size={24} className="mx-auto mb-2" style={{ color: '#16a34a' }} />
                  <p className="text-sm font-bold" style={{ color: '#16a34a' }}>Day Closed</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' })}
                  </p>
                </>
              ) : (
                <>
                  <Clock size={24} className="mx-auto mb-2" style={{ color: '#d97706' }} />
                  <p className="text-sm font-bold" style={{ color: '#d97706' }}>Register Open</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Count cash and close when ready</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: color + '08', border: '1px solid ' + color + '18' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={13} style={{ color }} />
      </div>
      <p className="text-lg font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={'text-xs ' + (bold ? 'font-bold' : '')} style={{ color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
      <span className={'text-xs font-mono ' + (bold ? 'font-bold text-sm' : 'font-semibold')} style={{ color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
