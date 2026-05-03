'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Truck, Check, FileText, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { SUPPLIERS_LIST_QUERY } from '@/lib/graphql/suppliers.queries';
import { SEARCH_PRODUCTS_QUERY, CREATE_PRODUCT_MUTATION, UPLOAD_PRODUCT_IMAGE_MUTATION } from '@/lib/graphql/products.queries';
import { CREATE_GRN_MUTATION } from '@/lib/graphql/grn.queries';
import { INVENTORY_LIST_QUERY } from '@/lib/graphql/inventory.queries';
import { formatGhs } from '@/lib/utils';
import { SmartTextarea } from '@/components/ui/smart-textarea';

interface SupplierOption { id: string; name: string; isActive: boolean }
interface ProductHit {
  id: string;
  name: string;
  genericName?: string;
  unitPrice: number;
  image?: {
    cdnUrl?: string;
    urlThumb?: string;
  };
}
interface GRNLine { 
  productId: string; 
  productName: string; 
  quantity: number; 
  unitCostPesewas: number;
  batchNumber: string; 
  expiryDate: string;
  imageUrl?: string;
}

export default function ReceiveStockPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuthStore();
  const canReceive = ['owner','se_admin','manager','head_pharmacist','technician'].includes(user?.role ?? '');
  const canCreateProducts = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user?.role ?? '');

  const [mode, setMode] = useState<'manual' | 'ocr'>('manual');
  const [supplierId, setSupplierId] = useState('');
  const [pendingSupplierName, setPendingSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<GRNLine[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnitPriceGhs, setNewProductUnitPriceGhs] = useState('');
  const [newProductClassification, setNewProductClassification] = useState<'OTC' | 'POM' | 'CONTROLLED'>('OTC');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [uploadingImageProductId, setUploadingImageProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ocrPrefilled, setOcrPrefilled] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') { setInitialLoading(false); return; }

    const raw = window.sessionStorage.getItem('receiveStockPrefill');
    if (!raw) { setInitialLoading(false); return; }

    try {
      const prefill = JSON.parse(raw) as {
        source?: string;
        supplierId?: string;
        supplierName?: string;
        invoiceNumber?: string;
        invoiceDate?: string;
        dueDate?: string;
        notes?: string;
        lines?: Array<{
          productId: string;
          productName: string;
          quantity: number;
          unitCostPesewas: number;
          batchNumber?: string;
          expiryDate?: string;
          matched?: boolean;
        }>;
      };

      if (prefill.supplierId) setSupplierId(prefill.supplierId);
      if (prefill.supplierName) setPendingSupplierName(prefill.supplierName);
      if (prefill.invoiceNumber) setInvoiceNumber(prefill.invoiceNumber);
      if (prefill.invoiceDate) setInvoiceDate(prefill.invoiceDate);
      if (prefill.dueDate) setDueDate(prefill.dueDate);
      if (prefill.notes) setNotes(prefill.notes);
      if (prefill.lines && prefill.lines.length > 0) {
        setLines(
          prefill.lines.map((line) => ({
            productId: line.productId || '',
            productName: line.productName,
            quantity: Math.max(1, Number(line.quantity) || 1),
            unitCostPesewas: Math.max(1, Number(line.unitCostPesewas) || 1),
            batchNumber: line.batchNumber || '',
            expiryDate: line.expiryDate || '',
          })),
        );
      }
      if (prefill.source === 'ocr') setOcrPrefilled(true);
    } catch (err) {
      console.error('Failed to parse receive stock prefill payload:', err);
    } finally {
      window.sessionStorage.removeItem('receiveStockPrefill');
      setInitialLoading(false);
    }
  }, []);

  const { data: suppData, loading: suppLoading } = useQuery<{ suppliers: SupplierOption[] }>(SUPPLIERS_LIST_QUERY);
  const suppliers = (suppData?.suppliers ?? []).filter(s => s.isActive);

  // Auto-select supplier by name when OCR provides supplierName but not supplierId
  useEffect(() => {
    if (supplierId || !pendingSupplierName || suppliers.length === 0) return;
    const needle = pendingSupplierName.toLowerCase();
    // Try exact match first, then partial/fuzzy
    const exact = suppliers.find(s => s.name.toLowerCase() === needle);
    if (exact) { setSupplierId(exact.id); setPendingSupplierName(''); return; }
    const partial = suppliers.find(s => s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase()));
    if (partial) { setSupplierId(partial.id); setPendingSupplierName(''); return; }
    // Try matching first word (e.g. "Danadams" matches "Danadams Pharmaceutical Ltd")
    const firstWord = needle.split(/\s+/)[0];
    if (firstWord && firstWord.length >= 3) {
      const wordMatch = suppliers.find(s => s.name.toLowerCase().includes(firstWord));
      if (wordMatch) { setSupplierId(wordMatch.id); setPendingSupplierName(''); }
    }
  }, [suppliers, pendingSupplierName, supplierId]);

  const { data: prodData } = useQuery<{ searchProducts: ProductHit[] }>(SEARCH_PRODUCTS_QUERY, {
    variables: { query: productSearch, branchId: user?.branch_id ?? '', limit: 10 },
    skip: productSearch.length < 2 || !user?.branch_id,
  });
  const productResults = prodData?.searchProducts ?? [];

  const [createGRN, { loading: submitting }] = useMutation(CREATE_GRN_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });

  const [createProductMutation] = useMutation(CREATE_PRODUCT_MUTATION);
  const [uploadProductImageMutation] = useMutation(UPLOAD_PRODUCT_IMAGE_MUTATION);

  // Calculate total automatically from line items
  const calculatedTotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitCostPesewas), 0);
  const calculatedTotalGhs = (calculatedTotal / 100).toFixed(2);

  const addLine = (p: ProductHit) => {
    if (lines.some(l => l.productId === p.id)) return;
    setLines(prev => [...prev, { 
      productId: p.id, 
      productName: p.name, 
      quantity: 1, 
      unitCostPesewas: p.unitPrice,
      batchNumber: '', 
      expiryDate: '',
      imageUrl: p.image?.urlThumb || p.image?.cdnUrl,
    }]);
    setProductSearch('');
  };

  const updateLine = (idx: number, field: keyof GRNLine, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

  const handleCreateMissingProduct = async () => {
    setError(null);
    const trimmedName = newProductName.trim();
    const unitPriceGhs = Number(newProductUnitPriceGhs);

    if (!trimmedName) {
      setError('Enter product name');
      return;
    }
    if (!Number.isFinite(unitPriceGhs) || unitPriceGhs < 0) {
      setError('Enter valid selling price (GHS)');
      return;
    }
    if (!supplierId) {
      setError('Select supplier first so the new product is linked correctly');
      return;
    }

    setCreatingProduct(true);
    try {
      const { data } = await createProductMutation({
        variables: {
          input: {
            name: trimmedName,
            barcode: newProductBarcode.trim() || undefined,
            unitPrice: Math.round(unitPriceGhs * 100),
            classification: newProductClassification,
            branchType: 'both',
            supplierId,
            reorderLevel: 10,
          },
        },
      });

      const created = data?.createProduct;
      if (!created?.id) {
        throw new Error('Product creation failed');
      }

      addLine({
        id: created.id,
        name: created.name,
        unitPrice: created.unitPrice,
      });

      setShowCreateProduct(false);
      setNewProductName('');
      setNewProductUnitPriceGhs('');
      setNewProductBarcode('');
      setProductSearch('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleUploadLineImage = async (line: GRNLine, idx: number, file: File) => {
    setError(null);
    setUploadingImageProductId(line.productId);
    try {
      const fileBase64 = await toBase64(file);
      const { data } = await uploadProductImageMutation({
        variables: {
          productId: line.productId,
          fileBase64,
          filename: file.name,
          mimetype: file.type || 'image/jpeg',
        },
      });

      const nextUrl = data?.uploadProductImage?.urlThumb || data?.uploadProductImage?.cdnUrl;
      if (nextUrl) {
        updateLine(idx, 'imageUrl', nextUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload product image');
    } finally {
      setUploadingImageProductId(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!supplierId) { setError('Select a supplier'); return; }
    if (!invoiceNumber.trim()) { setError('Enter invoice number'); return; }
    if (lines.length === 0) { setError('Add at least one product'); return; }
    for (const l of lines) {
      if (!l.batchNumber.trim()) { setError(`Enter batch number for ${l.productName}`); return; }
      if (!l.expiryDate) { setError(`Enter expiry date for ${l.productName}`); return; }
      if (l.quantity < 1) { setError(`Quantity must be at least 1 for ${l.productName}`); return; }
      if (l.unitCostPesewas < 1) { setError(`Enter unit cost for ${l.productName}`); return; }
    }

    try {
      await createGRN({
        variables: {
          input: {
            supplierId,
            supplierInvoiceNumber: invoiceNumber.trim(),
            invoiceDate: `${invoiceDate}T00:00:00.000Z`,
            dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
            totalAmountPesewas: calculatedTotal,  // ← Use calculated total
            items: lines.map(l => ({
              productId: l.productId,
              quantity: l.quantity,
              unitCostPesewas: l.unitCostPesewas,  // ← Include unit cost
              batchNumber: l.batchNumber.trim(),
              expiryDate: `${l.expiryDate}T00:00:00.000Z`,
            })),
            notes: notes.trim() || undefined,
          },
        },
      });
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/inventory'), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'GRN creation failed');
    }
  };

  if (!canReceive) {
    return (
      <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <p className="text-sm text-content-muted">You do not have permission to receive stock.</p>
      </div>
    );
  }

  // Show loading while OCR data is being parsed and suppliers are loading
  if (initialLoading || (ocrPrefilled && suppLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
        <div className="text-center">
          <div className="relative mx-auto mb-4">
            <div className="h-12 w-12 animate-spin rounded-full border-3 border-teal/20 border-t-teal mx-auto" />
            <Truck size={20} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal" />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Preparing stock receipt...</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Loading invoice data and matching suppliers</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6" style={{ background: 'var(--surface-base)' }}>
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-lg"
        >
          <Check size={48} className="mx-auto mb-3 text-green-600" />
          <h2 className="text-xl font-bold text-green-800">Stock Received</h2>
          <p className="mt-1 text-sm text-green-700">GRN created, inventory updated, supplier invoice recorded.</p>
          <p className="mt-2 text-xs text-green-600">Redirecting to inventory...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <Link href="/dashboard/inventory" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
        <ArrowLeft size={14} /> Back to inventory
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-content-primary">Receive Stock (GRN)</h1>
            <p className="text-xs text-content-muted">Record goods received from supplier with invoice details</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 rounded-lg border border-surface-border bg-surface-card p-1">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold transition-all ${
              mode === 'manual' 
                ? 'bg-teal text-white shadow-sm' 
                : 'text-content-secondary hover:bg-surface-hover'
            }`}
          >
            <FileText size={14} />
            Manual Entry
          </button>
          <Link
            href="/dashboard/invoices/upload"
            className="flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold transition-all text-content-secondary hover:bg-surface-hover"
          >
            <Sparkles size={14} />
            AI OCR Upload
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {/* Info Banner for OCR */}
      {mode === 'manual' && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <strong>💡 Tip:</strong> For faster processing, use <strong>AI OCR Upload</strong> to automatically extract invoice data from PDF/images!
        </div>
      )}
      {ocrPrefilled && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <strong>✅ OCR data loaded!</strong> Invoice details and {lines.length} product(s) prefilled from AI extraction. Review and select a supplier, then submit.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Supplier + Invoice */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-content-primary">Supplier & Invoice</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Supplier *</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30">
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Invoice Number *</label>
                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-2026-001"
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Invoice Date *</label>
                  <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Notes</label>
                <SmartTextarea
                  value={notes}
                  onChange={setNotes}
                  context="invoice:notes"
                  rows={2}
                  placeholder="All items received in good condition"
                  className="w-full resize-none rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              {/* Calculated Total */}
              <div className="rounded-lg border-2 border-teal/30 bg-teal/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-content-secondary">Total Amount (Calculated)</span>
                  <span className="text-lg font-bold text-teal">GH₵ {calculatedTotalGhs}</span>
                </div>
                <p className="mt-1 text-[10px] text-content-muted">
                  Automatically calculated from product quantities × unit costs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Products */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-content-primary">Products Received</h2>
            <div className="relative mb-3">
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search product to add..."
                className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30" />
              {productSearch.length >= 2 && productResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-border bg-surface-card shadow-lg">
                  {productResults.map(p => (
                    <button key={p.id} type="button" onClick={() => addLine(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-hover">
                      <span className="font-medium text-content-primary">{p.name}</span>
                      <Plus size={14} className="text-teal" />
                    </button>
                  ))}
                </div>
              )}

              {productSearch.length >= 2 && productResults.length === 0 && (
                <div className="mt-2 rounded-lg border border-dashed border-surface-border bg-surface-base p-3">
                  <p className="text-xs text-content-secondary">No product found for “{productSearch}”.</p>
                  {canCreateProducts ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateProduct(true);
                        setNewProductName(productSearch);
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded bg-teal px-2.5 py-1 text-xs font-bold text-white hover:bg-teal/90"
                    >
                      <Plus size={12} /> Add as new product
                    </button>
                  ) : (
                    <p className="mt-2 text-[11px] text-content-muted">
                      Ask a manager, head pharmacist, owner, or admin to create this product.
                    </p>
                  )}
                </div>
              )}
            </div>

            {showCreateProduct && (
              <div className="mb-3 rounded-lg border border-teal/30 bg-teal/5 p-3">
                <h3 className="text-xs font-bold text-content-primary">Create new product</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Product name"
                    className="col-span-2 rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm"
                  />
                  <input
                    value={newProductUnitPriceGhs}
                    onChange={(e) => setNewProductUnitPriceGhs(e.target.value)}
                    placeholder="Selling price (GHS)"
                    type="number"
                    step="0.01"
                    className="rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm"
                  />
                  <select
                    value={newProductClassification}
                    onChange={(e) => setNewProductClassification(e.target.value as 'OTC' | 'POM' | 'CONTROLLED')}
                    className="rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm"
                  >
                    <option value="OTC">OTC</option>
                    <option value="POM">POM</option>
                    <option value="CONTROLLED">CONTROLLED</option>
                  </select>
                  <input
                    value={newProductBarcode}
                    onChange={(e) => setNewProductBarcode(e.target.value)}
                    placeholder="Barcode (optional)"
                    className="col-span-2 rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateProduct(false)}
                    className="rounded border border-surface-border px-2.5 py-1 text-xs font-bold text-content-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateMissingProduct}
                    disabled={creatingProduct}
                    className="rounded bg-teal px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {creatingProduct ? 'Creating…' : 'Create & Add'}
                  </button>
                </div>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border py-8 text-center">
                <Truck size={24} className="mx-auto mb-2 text-content-muted opacity-50" />
                <p className="text-sm text-content-muted">Search and add products above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={line.productId || 'line-' + idx} className="rounded-xl border border-surface-border bg-surface-base p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-content-primary">{line.productName}</span>
                        <div className="mt-1 flex items-center gap-2">
                          {line.imageUrl ? (
                            <img
                              src={line.imageUrl}
                              alt={line.productName}
                              className="h-8 w-8 rounded border border-surface-border object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-content-muted">No image</span>
                          )}
                          <label className="cursor-pointer text-[10px] font-bold text-teal hover:underline">
                            {uploadingImageProductId === line.productId ? 'Uploading image…' : line.imageUrl ? 'Change image' : 'Add image'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingImageProductId === line.productId}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  void handleUploadLineImage(line, idx, file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Qty *</label>
                        <input type="number" min="1" value={line.quantity} onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Unit Cost (GH₵) *</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={(line.unitCostPesewas / 100).toFixed(2)} 
                          onChange={e => updateLine(idx, 'unitCostPesewas', Math.round(parseFloat(e.target.value || '0') * 100))}
                          placeholder="0.00"
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm font-mono focus:border-teal focus:outline-none" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Batch *</label>
                        <input value={line.batchNumber} onChange={e => updateLine(idx, 'batchNumber', e.target.value)} placeholder="BATCH-001"
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] font-bold text-content-muted">Expiry *</label>
                        <input type="date" value={line.expiryDate} onChange={e => updateLine(idx, 'expiryDate', e.target.value)}
                          className="w-full rounded border border-surface-border bg-surface-card px-2 py-1.5 text-sm focus:border-teal focus:outline-none" />
                      </div>
                    </div>
                    {/* Line Total */}
                    <div className="mt-2 flex items-center justify-between rounded bg-teal/5 px-2 py-1">
                      <span className="text-[10px] font-bold text-content-muted">Line Total:</span>
                      <span className="text-sm font-bold text-teal">
                        GH₵ {((line.quantity * line.unitCostPesewas) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={handleSubmit} disabled={submitting || lines.length === 0}
            className="w-full rounded-xl bg-teal px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-dark active:scale-[0.98] disabled:opacity-50">
            {submitting ? 'Creating GRN...' : `Receive ${lines.length} product${lines.length !== 1 ? 's' : ''} & create invoice`}
          </button>
        </div>
      </div>
    </div>
  );
}
