'use client';

import { useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Download, Landmark, ReceiptText, Wallet, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  ACCOUNTING_WORKBOOK,
  CASH_FLOW_FORECAST,
  LIST_EXPENSES,
  PROFIT_LOSS,
  SUPPLIER_INVOICES,
} from '@/lib/graphql/accounting.queries';
import { INGEST_SUPPLIER_INVOICE_OCR } from '@/lib/graphql/accounting.mutations';
import { formatGhs } from '@/lib/utils';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';

const EXPENSE_COLORS = ['#0f766e', '#14b8a6', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

type Period = '30d' | '90d';
type OcrInputMode = 'csv' | 'json';

type OcrLine = {
  rawText?: string;
  barcode?: string;
  productName?: string;
  productId?: string;
  quantity?: number;
  unitCostPesewas?: number;
  lineTotalPesewas?: number;
};

function fmtIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getRange(period: Period): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (period === '30d' ? 29 : 89));
  return { start: fmtIsoDate(start), end: fmtIsoDate(end) };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function parseOcrCsv(raw: string): OcrLine[] {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!rows.length) return [];

  const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const get = (key: string) => values[headers.indexOf(key)] ?? '';
    const qty = Number(get('quantity'));
    const unitCost = Number(get('unitcostpesewas'));
    const lineTotal = Number(get('linetotalpesewas'));
    return {
      rawText: get('rawtext') || undefined,
      barcode: get('barcode') || undefined,
      productName: get('productname') || undefined,
      productId: get('productid') || undefined,
      quantity: Number.isFinite(qty) ? qty : undefined,
      unitCostPesewas: Number.isFinite(unitCost) ? unitCost : undefined,
      lineTotalPesewas: Number.isFinite(lineTotal) ? lineTotal : undefined,
    };
  });
}

function parseOcrJson(raw: string): OcrLine[] {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) return parsed as OcrLine[];
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { lines?: unknown }).lines)) {
    return (parsed as { lines: OcrLine[] }).lines;
  }
  return [];
}

export default function AccountingPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [ocrInputMode, setOcrInputMode] = useState<OcrInputMode>('csv');
  const [ocrInvoiceId, setOcrInvoiceId] = useState('');
  const [ocrInput, setOcrInput] = useState('');
  const [ocrPreviewLines, setOcrPreviewLines] = useState<OcrLine[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResultMessage, setOcrResultMessage] = useState<string | null>(null);
  const { start, end } = useMemo(() => getRange(period), [period]);

  const { data: profitLossData, loading: loadingPl, error: plError } = useQuery(PROFIT_LOSS, {
    variables: { periodStart: start, periodEnd: end },
    fetchPolicy: 'cache-and-network',
  });
  const { data: cashFlowData } = useQuery(CASH_FLOW_FORECAST, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: expensesData } = useQuery(LIST_EXPENSES, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });
  const { data: invoicesData } = useQuery(SUPPLIER_INVOICES, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });

  const [fetchWorkbook, { loading: exportingWorkbook }] = useLazyQuery(ACCOUNTING_WORKBOOK, {
    fetchPolicy: 'no-cache',
  });
  const [ingestSupplierInvoiceOcr, { loading: ingestingOcr }] = useMutation(INGEST_SUPPLIER_INVOICE_OCR);

  const profitLoss = profitLossData?.profitLoss;
  const cashFlow = cashFlowData?.cashFlowForecast;
  const expenses = (expensesData?.listExpenses ?? []) as Array<{
    id: string;
    category: string;
    amountPesewas: number;
    amountFormatted: string;
    expenseDate: string;
    status: string;
    description: string;
  }>;
  const invoices = (invoicesData?.supplierInvoices ?? []) as Array<{
    id: string;
    supplierId: string;
    supplierName: string;
    invoiceNumber: string;
    dueDate?: string | null;
    status: string;
    balancePesewas: number;
    balanceFormatted: string;
  }>;
  const ingestableInvoices = useMemo(() => invoices.filter((inv) => inv.status !== 'PAID'), [invoices]);

  useMemo(() => {
    if (!ocrInvoiceId && ingestableInvoices.length > 0) {
      setOcrInvoiceId(ingestableInvoices[0].id);
    }
  }, [ingestableInvoices, ocrInvoiceId]);

  const expenseByCategory = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const exp of expenses) {
      bucket.set(exp.category, (bucket.get(exp.category) ?? 0) + exp.amountPesewas);
    }
    return Array.from(bucket.entries())
      .map(([category, amountPesewas]) => ({
        category,
        amountPesewas,
        amountGhs: amountPesewas / 100,
      }))
      .sort((a, b) => b.amountPesewas - a.amountPesewas)
      .slice(0, 6);
  }, [expenses]);

  const invoiceAging = useMemo(() => {
    const now = new Date();
    const summary = { overdue: 0, dueSoon: 0, later: 0 };
    for (const inv of invoices) {
      if (!inv.dueDate || inv.status === 'PAID') continue;
      const dueDate = new Date(inv.dueDate);
      const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) summary.overdue += inv.balancePesewas;
      else if (diffDays <= 7) summary.dueSoon += inv.balancePesewas;
      else summary.later += inv.balancePesewas;
    }
    return [
      { label: 'Overdue', value: summary.overdue / 100 },
      { label: 'Due 7d', value: summary.dueSoon / 100 },
      { label: 'Later', value: summary.later / 100 },
    ];
  }, [invoices]);

  const errorText = useMemo(() => formatApolloError(plError), [plError]);

  const handleExportWorkbook = async (): Promise<void> => {
    const { data } = await fetchWorkbook({
      variables: { periodStart: start, periodEnd: end },
    });
    const payload = data?.accountingWorkbook;
    if (!payload?.base64Content) return;

    const blob = base64ToBlob(payload.base64Content, payload.mimeType);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = payload.fileName ?? `accounting-workbook-${start}-to-${end}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewOcr = (): void => {
    setOcrError(null);
    setOcrResultMessage(null);
    try {
      const lines = ocrInputMode === 'csv' ? parseOcrCsv(ocrInput) : parseOcrJson(ocrInput);
      const cleaned = lines.filter((line) => line && (line.productName || line.barcode || line.rawText));
      if (!cleaned.length) {
        setOcrError('No valid lines found. Add productName, barcode, or rawText columns/fields.');
        setOcrPreviewLines([]);
        return;
      }
      setOcrPreviewLines(cleaned);
    } catch (e) {
      setOcrError(e instanceof Error ? e.message : 'Could not parse OCR input.');
      setOcrPreviewLines([]);
    }
  };

  const handleIngestOcr = async (): Promise<void> => {
    if (!ocrInvoiceId) {
      setOcrError('Select a supplier invoice first.');
      return;
    }
    if (!ocrPreviewLines.length) {
      setOcrError('Preview lines before confirming import.');
      return;
    }
    const { data } = await ingestSupplierInvoiceOcr({
      variables: {
        input: {
          invoiceId: ocrInvoiceId,
          parser: ocrInputMode === 'csv' ? 'web-manual-csv' : 'web-manual-json',
          lines: ocrPreviewLines.map((line) => ({
            rawText: line.rawText,
            barcode: line.barcode,
            productName: line.productName,
            productId: line.productId,
            quantity: line.quantity,
            unitCostPesewas: line.unitCostPesewas,
            lineTotalPesewas: line.lineTotalPesewas,
          })),
        },
      },
    });
    const result = data?.ingestSupplierInvoiceOcr;
    if (!result) return;
    setOcrResultMessage(
      `Imported ${result.matchedLines}/${result.totalLines} lines (${result.costSnapshotsCreated} cost snapshots).`,
    );
  };

  return (
    <div className="p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Accounting Dashboard
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            Profitability, cash flow, expense intelligence, and supplier payables.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportWorkbook()}
          disabled={exportingWorkbook}
          className="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            border: '1px solid var(--surface-border)',
            background: 'var(--surface-card)',
            color: 'var(--text-secondary)',
            opacity: exportingWorkbook ? 0.65 : 1,
          }}
        >
          <Download size={15} />
          {exportingWorkbook ? 'Exporting workbook…' : 'Export accounting workbook'}
        </button>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg p-1 w-fit" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
        {(['30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className="rounded-md px-4 py-1.5 text-xs font-medium"
            style={
              period === p
                ? { background: 'var(--color-teal)', color: '#fff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {p === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      {errorText ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          {
            icon: Landmark,
            label: 'Revenue',
            value: profitLoss?.revenueFormatted ?? 'GH₵0.00',
            tone: '#0f766e',
          },
          {
            icon: TrendingUp,
            label: 'Net profit',
            value: profitLoss?.netProfitFormatted ?? 'GH₵0.00',
            tone: (profitLoss?.netProfitPesewas ?? 0) >= 0 ? '#16a34a' : '#dc2626',
          },
          {
            icon: Wallet,
            label: 'Cash runway',
            value: cashFlow ? `${Math.round(cashFlow.cashRunwayDays)} days` : '—',
            tone: '#0f172a',
          },
          {
            icon: ReceiptText,
            label: 'Open payables',
            value: formatGhs(
              invoices
                .filter((inv) => inv.status !== 'PAID')
                .reduce((sum, inv) => sum + inv.balancePesewas, 0) / 100,
            ),
            tone: '#92400e',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}
          >
            <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <card.icon size={14} />
              {card.label}
            </div>
            <p className="font-mono text-xl font-semibold" style={{ color: card.tone }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl p-4" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Expense mix by category
          </h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByCategory} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatGhs(value)} />
                <Bar dataKey="amountGhs" radius={[6, 6, 0, 0]}>
                  {expenseByCategory.map((row, idx) => (
                    <Cell key={row.category} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Supplier payables aging
          </h2>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceAging} dataKey="value" nameKey="label" outerRadius={90} innerRadius={46}>
                  {invoiceAging.map((entry, idx) => (
                    <Cell key={entry.label} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatGhs(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Expense ledger (latest 12)
        </h2>
        {loadingPl ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p> : null}
        <div className="space-y-2">
          {expenses.slice(0, 12).map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ border: '1px solid var(--surface-border)' }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {exp.category} · {exp.description}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(exp.expenseDate).toLocaleDateString('en-GH')} · {exp.status}
                </p>
              </div>
              <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                {exp.amountFormatted}
              </p>
            </div>
          ))}
          {expenses.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No expense records for this period.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-xl p-5" style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Supplier invoice import
        </h2>
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Paste OCR output, preview mapped lines, then confirm import to cost history.
        </p>

        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            value={ocrInvoiceId}
            onChange={(e) => setOcrInvoiceId(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-primary)' }}
          >
            <option value="">Select invoice</option>
            {ingestableInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.supplierName} · {inv.invoiceNumber}
              </option>
            ))}
          </select>

          <select
            value={ocrInputMode}
            onChange={(e) => setOcrInputMode(e.target.value as OcrInputMode)}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-primary)' }}
          >
            <option value="csv">CSV input</option>
            <option value="json">JSON input</option>
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewOcr}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
            >
              Preview lines
            </button>
            <button
              type="button"
              onClick={() => void handleIngestOcr()}
              disabled={ingestingOcr}
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{ background: 'var(--color-teal)', color: '#fff', opacity: ingestingOcr ? 0.7 : 1 }}
            >
              {ingestingOcr ? 'Importing…' : 'Confirm import'}
            </button>
          </div>
        </div>

        <textarea
          value={ocrInput}
          onChange={(e) => setOcrInput(e.target.value)}
          rows={7}
          placeholder={
            ocrInputMode === 'csv'
              ? 'productName,barcode,quantity,unitCostPesewas,lineTotalPesewas,rawText'
              : '[{"productName":"Paracetamol", "quantity":10, "unitCostPesewas":450}]'
          }
          className="w-full rounded-lg p-3 text-xs"
          style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-base)', color: 'var(--text-primary)' }}
        />

        {ocrError ? <p className="mt-2 text-xs text-red-600">{ocrError}</p> : null}
        {ocrResultMessage ? <p className="mt-2 text-xs text-emerald-600">{ocrResultMessage}</p> : null}

        <div className="mt-3 space-y-2">
          {ocrPreviewLines.slice(0, 8).map((line, idx) => (
            <div key={`${line.productName ?? line.barcode ?? 'line'}-${idx}`} className="rounded-lg px-3 py-2" style={{ border: '1px solid var(--surface-border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {line.productName ?? line.barcode ?? line.rawText ?? `Line ${idx + 1}`}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Qty: {line.quantity ?? 1} · Unit Cost: {line.unitCostPesewas ?? 0} pesewas
              </p>
            </div>
          ))}
          {ocrPreviewLines.length > 8 ? (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              +{ocrPreviewLines.length - 8} more preview lines
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
