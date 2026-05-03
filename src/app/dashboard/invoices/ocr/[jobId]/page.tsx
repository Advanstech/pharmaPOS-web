'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useLazyQuery } from '@apollo/client';
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertTriangle, Search } from 'lucide-react';
import Link from 'next/link';
import { GET_OCR_JOB as GET_OCR_JOB_QUERY } from '@/lib/graphql/invoice-ocr.queries';
import { gql } from '@apollo/client';
import { useAuthStore } from '@/lib/store/auth.store';

const SEARCH_PRODUCTS = gql`
  query SearchProductsForOcr($query: String!, $branchId: ID!) {
    searchProducts(query: $query, branchId: $branchId, limit: 10) {
      id name genericName classification
    }
  }
`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OcrItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
  batchNumber?: string;
  expiryDate?: string;
  matches?: Array<{ productId: string; productName: string; matchScore: number }>;
  selectedProductId?: string | null;
  selectedProductName?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toGhs = (pesewas: number | null | undefined) =>
  ((Number(pesewas) || 0) / 100).toFixed(2);

// ── Component ─────────────────────────────────────────────────────────────────

export default function OcrReviewPage() {
  const router = useRouter();
  const { jobId } = useParams<{ jobId: string }>();
  const [confirming, setConfirming] = useState(false);
  const [searchStates, setSearchStates] = useState<Record<number, { query: string; open: boolean }>>({});
  const [searchResults, setSearchResults] = useState<Record<number, any[]>>({});

  const [searchProducts] = useLazyQuery(SEARCH_PRODUCTS);
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const branchId = useAuthStore(s => s.user?.branch_id || '');

  // Auto-search each item description when items load
  const autoSearched = useRef(false);
  const triggerAutoSearch = useCallback((loadedItems: OcrItem[]) => {
    if (autoSearched.current || !branchId || loadedItems.length === 0) return;
    autoSearched.current = true;
    loadedItems.forEach((item, index) => {
      if (item.selectedProductId) return; // already matched
      const keywords = item.description.split(/[\s/,()]+/).filter(w => w.length > 3).slice(0, 2).join(' ');
      if (!keywords) return;
      setTimeout(() => {
        searchProducts({ variables: { query: keywords, branchId } }).then(({ data }) => {
          if (data?.searchProducts?.length > 0) {
            setSearchResults(prev => ({ ...prev, [index]: data.searchProducts }));
          }
        });
      }, index * 200); // stagger requests
    });
  }, [branchId, searchProducts]);

  // Editable overrides — only set when user changes something
  const [overrides, setOverrides] = useState<{
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    supplierName?: string;
    items?: OcrItem[];
  }>({});

  const { data, loading, error } = useQuery(GET_OCR_JOB_QUERY, {
    variables: { id: jobId },
    pollInterval: 2000,
    fetchPolicy: 'network-only',
    onCompleted: (d) => {
      if (d?.invoiceOcrJob?.status === 'completed') {
        const loadedItems = d.invoiceOcrJob.extractedData?.items || [];
        triggerAutoSearch(loadedItems);
      }
    },
  });

  const job = data?.invoiceOcrJob;
  const ed = job?.extractedData;

  // Derive values — use overrides if set, otherwise use extracted data
  const invoiceNumber = overrides.invoiceNumber ?? ed?.invoiceNumber ?? '';
  const invoiceDate   = overrides.invoiceDate   ?? ed?.invoiceDate   ?? '';
  const dueDate       = overrides.dueDate       ?? (ed as any)?.dueDate ?? '';
  const supplierName  = overrides.supplierName  ?? ed?.supplierName  ?? '';
  const items: OcrItem[] = (overrides.items ?? ed?.items ?? []).map((item: any) => ({
    ...item,
    selectedProductId:   item.selectedProductId   ?? item.matches?.[0]?.productId   ?? null,
    selectedProductName: item.selectedProductName ?? item.matches?.[0]?.productName ?? null,
    batchNumber: item.batchNumber || '',
    expiryDate:  item.expiryDate  || '',
  }));

  const updateItem = useCallback((index: number, patch: Partial<OcrItem>) => {
    const base = overrides.items ?? ed?.items ?? [];
    const next = base.map((item: any, i: number) =>
      i === index ? { ...item, ...patch } : item
    );
    setOverrides(prev => ({ ...prev, items: next }));
  }, [overrides.items, ed?.items]);

  const matchedCount = items.filter(i => i.selectedProductId).length;
  const unmatchedCount = items.length - matchedCount;
  const hasMissingBatchOrExpiry = items
    .filter(i => i.selectedProductId)
    .some(i => !i.batchNumber || !i.expiryDate);

  // Require at least one matched product, invoice number, date, and batch/expiry on matched items
  const isConfirmDisabled =
    confirming || !invoiceNumber.trim() || !invoiceDate || hasMissingBatchOrExpiry || matchedCount === 0;

  const handleConfirm = async () => {
    if (!job) return;
    setConfirming(true);
    try {
      // Only include items that have been matched to a product
      const matchedLines = items
        .filter(i => i.selectedProductId)
        .map(i => ({
          productId: i.selectedProductId!,
          productName: i.selectedProductName || i.description,
          quantity: Math.max(1, Number(i.quantity) || 1),
          unitCostPesewas: Math.max(1, Number(i.unitPrice) || 0),
          batchNumber: i.batchNumber || '',
          expiryDate: i.expiryDate || '',
          ocrDescription: i.description,
          matched: true,
        }));

      const unmatchedCount = items.length - matchedLines.length;

      const payload = {
        source: 'ocr',
        ocrJobId: jobId,
        supplierId: job.supplierId || '',
        supplierName,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate: dueDate || '',
        notes: unmatchedCount > 0
          ? `OCR job ${jobId}. Note: ${unmatchedCount} item(s) not matched and excluded — add manually.`
          : `Prefilled from OCR job ${jobId}`,
        lines: matchedLines,
      };

      sessionStorage.setItem('receiveStockPrefill', JSON.stringify(payload));
      router.push('/dashboard/inventory/receive?source=ocr');
    } catch (e) {
      console.error('Confirm failed:', e);
    } finally {
      setConfirming(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading && !job) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <XCircle className="mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-red-500">Error loading OCR job</h2>
          <p className="mt-1 text-sm text-content-secondary">{error.message}</p>
          <Link href="/dashboard/invoices/upload" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">Try Again</Link>
        </div>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────

  if (!job || job.status === 'pending' || job.status === 'processing') {
    return (
      <div className="p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-xl text-center">
          <Loader2 className="mx-auto h-14 w-14 animate-spin text-teal" />
          <h2 className="mt-6 text-2xl font-bold text-content-primary">Processing Invoice...</h2>
          <p className="mt-2 text-content-secondary">
            {job?.status === 'pending' ? 'Queued for AI extraction' : 'Extracting data with GPT-4o'}
          </p>
          {job?.progress != null && (
            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
                <div className="h-2 rounded-full bg-teal transition-all duration-500" style={{ width: `${job.progress}%` }} />
              </div>
              <p className="mt-2 text-sm text-content-secondary">{job.progress}% complete</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────

  if (job.status === 'failed') {
    return (
      <div className="p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 p-6">
          <XCircle className="mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-red-500">OCR Processing Failed</h2>
          <p className="mt-1 text-sm text-content-secondary">{job.errorMessage || 'Unknown error'}</p>
          <Link href="/dashboard/invoices/upload" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">Upload New Invoice</Link>
        </div>
      </div>
    );
  }

  // ── Completed ────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6">
        <Link href="/dashboard/invoices/upload" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Upload
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">Review Extracted Data</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Review and correct AI-extracted data, then prefill the manual Receive Stock form
        </p>
        {(ed as any)?.rawText?.includes('MOCK DATA') && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Mock data — add OpenAI credits for real OCR extraction
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: Invoice Details + Line Items ── */}
        <div className="space-y-6 lg:col-span-2">

          {/* Invoice Details */}
          <div className="rounded-xl border border-surface-border p-6" style={{ background: 'var(--surface-card)' }}>
            <h3 className="mb-4 text-base font-semibold text-content-primary">Invoice Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-content-muted">Invoice Number</label>
                <input type="text" value={invoiceNumber}
                  onChange={e => setOverrides(p => ({ ...p, invoiceNumber: e.target.value }))}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  style={{ background: 'var(--surface-base)' }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-content-muted">Invoice Date</label>
                <input type="date" value={invoiceDate}
                  onChange={e => setOverrides(p => ({ ...p, invoiceDate: e.target.value }))}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  style={{ background: 'var(--surface-base)' }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-content-muted">Due Date (Optional)</label>
                <input type="date" value={dueDate}
                  onChange={e => setOverrides(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  style={{ background: 'var(--surface-base)' }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-content-muted">Supplier</label>
                <input type="text" value={supplierName}
                  onChange={e => setOverrides(p => ({ ...p, supplierName: e.target.value }))}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  style={{ background: 'var(--surface-base)' }} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-content-muted">Total Amount</label>
                <input type="text" readOnly value={`GH₵ ${toGhs(ed?.totalAmount)}`}
                  className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm opacity-70"
                  style={{ background: 'var(--surface-base)' }} />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-surface-border p-6" style={{ background: 'var(--surface-card)' }}>
            <h3 className="mb-4 text-base font-semibold text-content-primary">
              Line Items <span className="ml-2 text-xs font-normal text-content-muted">({items.length} products)</span>
            </h3>
            {items.length === 0 ? (
              <p className="text-sm text-content-muted">No line items extracted.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="rounded-lg border border-surface-border p-4" style={{ background: 'var(--surface-base)' }}>
                    <div className="mb-3">
                      <input type="text" value={item.description}
                        onChange={e => updateItem(index, { description: e.target.value })}
                        className="mb-2 w-full rounded border border-surface-border px-2 py-1.5 text-sm font-medium"
                        style={{ background: 'var(--surface-card)' }} />

                      {/* Live product search */}
                      <div className="relative mb-2">
                        <div className="flex items-center gap-1 rounded border border-surface-border px-2 py-1.5" style={{ background: 'var(--surface-card)' }}>
                          <Search className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                          <input
                            type="text"
                            placeholder={item.selectedProductName || 'Search inventory to match...'}
                            value={searchStates[index]?.query ?? ''}
                            className="flex-1 bg-transparent text-sm outline-none"
                            onChange={e => {
                              const q = e.target.value;
                              setSearchStates(prev => ({ ...prev, [index]: { query: q, open: true } }));
                              clearTimeout(searchTimers.current[index]);
                              if (q.length >= 2) {
                                searchTimers.current[index] = setTimeout(() => {
                                  searchProducts({ variables: { query: q, branchId } }).then(({ data }) => {
                                    if (data?.searchProducts) {
                                      setSearchResults(prev => ({ ...prev, [index]: data.searchProducts }));
                                    }
                                  });
                                }, 300);
                              }
                            }}
                            onFocus={() => setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], open: true } }))}
                            onBlur={() => setTimeout(() => setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], open: false } })), 200)}
                          />
                          {item.selectedProductId && (
                            <button type="button" onClick={() => updateItem(index, { selectedProductId: null, selectedProductName: null })}
                              className="text-xs text-red-400 hover:text-red-600">✕</button>
                          )}
                        </div>

                        {/* Dropdown results */}
                        {searchStates[index]?.open && (searchResults[index]?.length > 0) && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border border-surface-border shadow-lg" style={{ background: 'var(--surface-card)' }}>
                            {(searchResults[index] || []).map((p: any) => (
                              <button key={p.id} type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover"
                                onMouseDown={() => {
                                  updateItem(index, { selectedProductId: p.id, selectedProductName: p.name });
                                  setSearchStates(prev => ({ ...prev, [index]: { query: '', open: false } }));
                                }}>
                                <span className="font-medium text-content-primary">{p.name}</span>
                                {p.genericName && <span className="text-xs text-content-muted">({p.genericName})</span>}
                                <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold ${p.classification === 'POM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{p.classification}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Auto-matched suggestions from OCR + inventory search */}
                      {!item.selectedProductId && (searchResults[index]?.length > 0 || (item.matches || []).length > 0) && !searchStates[index]?.open && (
                        <div className="mb-2">
                          <p className="mb-1 text-xs text-content-muted">Suggested matches:</p>
                          <div className="flex flex-wrap gap-1">
                            {[
                              ...(searchResults[index] || []).slice(0, 3).map((p: any) => ({ id: p.id, name: p.name, score: null })),
                              ...(item.matches || []).map(m => ({ id: m.productId, name: m.productName, score: m.matchScore })),
                            ].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i).slice(0, 4).map(m => (
                              <button key={m.id} type="button"
                                onClick={() => updateItem(index, { selectedProductId: m.id, selectedProductName: m.name })}
                                className="rounded-full border border-teal/30 bg-teal/5 px-2 py-0.5 text-xs text-teal hover:bg-teal/10">
                                {m.name}{m.score ? ` (${m.score}%)` : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-medium ${
                          (item.confidence || 0) > 90 ? 'bg-green-100 text-green-700' :
                          (item.confidence || 0) > 70 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.confidence || 0}% confidence
                        </span>
                        {item.selectedProductId && (
                          <span className="text-teal font-medium">✓ {item.selectedProductName}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs text-content-muted">Qty</label>
                        <input type="number" min={1} value={item.quantity}
                          onChange={e => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                          className="w-full rounded border border-surface-border px-2 py-1 text-sm"
                          style={{ background: 'var(--surface-card)' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-content-muted">Unit Price (GH₵)</label>
                        <input type="number" min={0.01} step="0.01"
                          value={toGhs(item.unitPrice)}
                          onChange={e => updateItem(index, { unitPrice: Math.round(Number(e.target.value) * 100) })}
                          className="w-full rounded border border-surface-border px-2 py-1 text-sm"
                          style={{ background: 'var(--surface-card)' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-content-muted">Batch No.</label>
                        <input type="text" value={item.batchNumber}
                          onChange={e => updateItem(index, { batchNumber: e.target.value })}
                          placeholder={item.selectedProductId ? 'Required' : 'Optional'}
                          className="w-full rounded border border-surface-border px-2 py-1 text-sm"
                          style={{ background: 'var(--surface-card)' }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-content-muted">Expiry Date</label>
                        <input type="date" value={item.expiryDate}
                          onChange={e => updateItem(index, { expiryDate: e.target.value })}
                          className="w-full rounded border border-surface-border px-2 py-1 text-sm"
                          style={{ background: 'var(--surface-card)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Summary + Actions ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-border p-5" style={{ background: 'var(--surface-card)' }}>
            <h3 className="mb-3 text-base font-semibold text-content-primary">Summary</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Total Items', items.length],
                ['Matched to Products', `${matchedCount} / ${items.length}`],
                ['Unmatched (excluded)', unmatchedCount],
                ['Overall Confidence', `${job.confidenceScore ?? ed?.confidence ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-content-secondary">{label}</span>
                  <span className={`font-semibold ${
                    label === 'Overall Confidence'
                      ? Number(String(value).replace('%','')) > 90 ? 'text-green-600' : 'text-amber-600'
                      : label === 'Unmatched (excluded)' && Number(value) > 0
                        ? 'text-amber-600'
                        : 'text-content-primary'
                  }`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {hasMissingBatchOrExpiry && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Matched products need batch number and expiry date before confirming.
            </div>
          )}

          {matchedCount === 0 && !hasMissingBatchOrExpiry && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Match at least one item to a product before confirming.
            </div>
          )}

          {unmatchedCount > 0 && matchedCount > 0 && !hasMissingBatchOrExpiry && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {unmatchedCount} unmatched item(s) will be excluded. Add them manually in the receive form.
            </div>
          )}

          <div className="rounded-xl border border-teal/40 bg-teal/5 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
              <div>
                <p className="text-sm font-semibold text-content-primary">Ready to Confirm</p>
                <p className="mt-0.5 text-xs text-content-secondary">
                  {matchedCount} matched product(s) will prefill the Receive Stock form.
                </p>
              </div>
            </div>
          </div>

          <button onClick={handleConfirm} disabled={isConfirmDisabled}
            className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50">
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Preparing...
              </span>
            ) : `Send ${matchedCount} Product(s) to Receive Stock`}
          </button>

          <Link href="/dashboard/invoices/upload"
            className="block w-full rounded-xl border border-surface-border px-4 py-3 text-center text-sm font-semibold text-content-primary hover:bg-surface-hover"
            style={{ background: 'var(--surface-card)' }}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
