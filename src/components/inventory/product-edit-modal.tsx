'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Save, Trash2, AlertTriangle, Upload, Sparkles, Loader2 } from 'lucide-react';
import {
  UPDATE_PRODUCT_MUTATION,
  DEACTIVATE_PRODUCT_MUTATION,
  UPLOAD_PRODUCT_IMAGE_MUTATION,
} from '@/lib/graphql/products.queries';
import { INVENTORY_LIST_QUERY } from '@/lib/graphql/inventory.queries';
import { SUPPLIERS_LIST_QUERY } from '@/lib/graphql/suppliers.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { cn } from '@/lib/utils';

interface ProductData {
  productId: string;
  productName: string;
  classification: string;
  quantityOnHand: number;
  reorderLevel: number;
  nearestExpiry?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
}
interface SupplierOption { id: string; name: string; isActive: boolean; }
interface ProductEditModalProps {
  product: ProductData;
  unitPrice?: number;
  genericName?: string;
  barcode?: string;
  branchType?: string;
  nearestExpiry?: string | null;
  imageUrl?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const inp = 'w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2.5 text-sm transition-all focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20';
const lbl = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-content-muted';

/** Strip the data-URL prefix so we send only the raw base64 string to the API */
function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx !== -1 ? dataUrl.slice(idx + 1) : dataUrl;
}

/** Derive MIME type from a data-URL or filename */
function mimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);/);
  return m?.[1] ?? 'image/jpeg';
}

export function ProductEditModal({
  product, unitPrice, genericName, barcode, branchType, nearestExpiry, imageUrl,
  open, onClose, onSuccess,
}: ProductEditModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';
  const canEdit = ['owner', 'se_admin', 'manager', 'head_pharmacist'].includes(user?.role ?? '');

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [generic, setGeneric] = useState('');
  const [barcodeVal, setBarcodeVal] = useState('');
  const [price, setPrice] = useState('');
  const [classification, setClassification] = useState('OTC');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [supplierId, setSupplierId] = useState('');
  // nearestExpiry: stored as YYYY-MM-DD for the date input
  const [expiryDate, setExpiryDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [tab, setTab] = useState<'details' | 'image'>('details');

  // ── Image state ───────────────────────────────────────────────────────────
  const [imgPreview, setImgPreview] = useState('');   // data-URL or CDN URL for preview
  const [imgBroken, setImgBroken] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ dataUrl: string; filename: string; mimetype: string } | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries & mutations ───────────────────────────────────────────────────
  const { data: suppData } = useQuery<{ suppliers: SupplierOption[] }>(SUPPLIERS_LIST_QUERY, { skip: !open });
  const suppliers = (suppData?.suppliers ?? []).filter(s => s.isActive);

  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });
  const [deactivateProduct, { loading: deactivating }] = useMutation(DEACTIVATE_PRODUCT_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });
  const [uploadProductImage] = useMutation(UPLOAD_PRODUCT_IMAGE_MUTATION, {
    refetchQueries: [{ query: INVENTORY_LIST_QUERY }],
  });

  // ── Seed form on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setName(product.productName);
    setGeneric(genericName ?? '');
    setBarcodeVal(barcode ?? '');
    setPrice(unitPrice ? String(unitPrice / 100) : '');
    setClassification(product.classification);
    setReorderLevel(String(product.reorderLevel));
    setSupplierId(product.supplierId ?? '');
    // Normalise expiry to YYYY-MM-DD for <input type="date">
    const rawExpiry = nearestExpiry ?? product.nearestExpiry ?? '';
    setExpiryDate(rawExpiry ? rawExpiry.slice(0, 10) : '');
    setImgPreview(imageUrl ?? '');
    setPendingFile(null);
    setReason('');
    setError(null);
    setSuccess(null);
    setShowDeactivate(false);
    setImgBroken(false);
    setTab('details');
  }, [open, product, unitPrice, genericName, barcode, nearestExpiry, imageUrl]);

  const priceChanged = unitPrice !== undefined && Math.round(parseFloat(price) * 100) !== unitPrice;

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const pp = Math.round(parseFloat(price) * 100);
    if (isNaN(pp) || pp < 0) { setError('Enter a valid price'); return; }
    if (!name.trim()) { setError('Product name is required'); return; }

    // Build only changed fields
    const input: Record<string, unknown> = {};
    if (name.trim() !== product.productName) input.name = name.trim();
    if (generic.trim() !== (genericName ?? '')) input.genericName = generic.trim() || null;
    if (barcodeVal.trim() !== (barcode ?? '')) input.barcode = barcodeVal.trim() || null;
    if (pp !== unitPrice) { input.unitPrice = pp; input.reason = reason.trim() || 'Price update'; }
    if (classification !== product.classification) input.classification = classification;
    const newReorder = Math.max(1, parseInt(reorderLevel) || 10);
    if (newReorder !== product.reorderLevel) input.reorderLevel = newReorder;
    if (supplierId !== (product.supplierId ?? '')) input.supplierId = supplierId || null;

    // ── Nearest expiry: update the earliest batch expiry via inventory adjust ──
    // The API UpdateProductInput doesn't have nearestExpiry — expiry lives on
    // inventory batches. We pass it as a dedicated field so the service can
    // update the nearest batch record.
    const originalExpiry = (nearestExpiry ?? product.nearestExpiry ?? '').slice(0, 10);
    if (expiryDate !== originalExpiry) {
      // Pass as ISO string; service will update the nearest-expiry batch row
      input.nearestExpiry = expiryDate ? `${expiryDate}T00:00:00.000Z` : null;
    }

    let savedDetails = false;
    if (Object.keys(input).length > 0) {
      try {
        await updateProduct({ variables: { id: product.productId, input } });
        savedDetails = true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed');
        return;
      }
    }

    // ── Upload pending image ──────────────────────────────────────────────
    if (pendingFile) {
      setUploadingImg(true);
      try {
        const base64 = stripDataUrlPrefix(pendingFile.dataUrl);
        await uploadProductImage({
          variables: {
            productId: product.productId,
            fileBase64: base64,
            filename: pendingFile.filename,
            mimetype: pendingFile.mimetype,
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Image upload failed');
        setUploadingImg(false);
        return;
      }
      setUploadingImg(false);
    }

    if (Object.keys(input).length === 0 && !pendingFile) {
      onClose();
      return;
    }

    onSuccess?.();
    onClose();
  };

  if (!canEdit) return null;

  const isSaving = updating || uploadingImg;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative mx-4 w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            initial={shouldReduceMotion ? false : { scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Edit Product</h2>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{product.productName}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface-hover" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6" style={{ borderColor: 'var(--surface-border)' }}>
              {([['details', 'Product Details'], ['image', 'Product Image']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTab(k)}
                  className="relative px-4 py-2.5 text-xs font-semibold transition-colors"
                  style={{ color: tab === k ? 'var(--color-teal)' : 'var(--text-muted)' }}>
                  {l}
                  {tab === k && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--color-teal)' }} />}
                </button>
              ))}
            </div>

            {/* Alerts */}
            {error && (
              <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="mx-6 mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
            )}

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {tab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label className={lbl}>Product Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} className={inp} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Generic Name</label>
                      <input value={generic} onChange={e => setGeneric(e.target.value)} className={inp} placeholder="e.g. Paracetamol" />
                    </div>
                    <div>
                      <label className={lbl}>Barcode</label>
                      <input value={barcodeVal} onChange={e => setBarcodeVal(e.target.value)} className={inp} placeholder="EAN-13" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={lbl}>Price (GH₵)</label>
                      <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} className={cn(inp, 'font-mono')} />
                    </div>
                    <div>
                      <label className={lbl}>Classification</label>
                      <select value={classification} onChange={e => setClassification(e.target.value)} className={inp}>
                        <option value="OTC">OTC</option>
                        <option value="POM">POM</option>
                        <option value="CONTROLLED">CONTROLLED</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Reorder Level</label>
                      <input type="number" min="1" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} className={inp} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={lbl}>Supplier</label>
                      <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inp}>
                        <option value="">No supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Nearest Expiry</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        className={inp}
                      />
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Updates the earliest batch expiry date
                      </p>
                    </div>
                  </div>

                  {priceChanged && (
                    <div>
                      <label className={lbl}>Reason for Price Change</label>
                      <input value={reason} onChange={e => setReason(e.target.value)} className={inp} placeholder="e.g. Supplier price increase" />
                    </div>
                  )}
                </div>
              )}

              {tab === 'image' && (
                <div className="space-y-4">
                  {/* Current image preview */}
                  <div className="flex items-center gap-4 rounded-xl p-4" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                    {(imgPreview && !imgBroken) ? (
                      <img
                        src={imgPreview}
                        alt={name}
                        className="h-20 w-20 rounded-xl object-cover shrink-0"
                        style={{ border: '2px solid var(--surface-border)' }}
                        onError={() => setImgBroken(true)}
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--surface-border)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                          <circle cx="9" cy="9" r="2"/>
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: imgPreview ? '#15803d' : 'var(--text-muted)' }}>
                        {pendingFile ? '📎 New image ready to upload' : imgPreview ? '✓ Image set' : 'No product image'}
                      </p>
                      {(imgPreview || pendingFile) && (
                        <button
                          type="button"
                          onClick={() => { setImgPreview(''); setPendingFile(null); setImgBroken(false); }}
                          className="mt-1 text-[10px] font-bold"
                          style={{ color: '#dc2626' }}
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>

                  {/* File upload */}
                  <div>
                    <label className={lbl}>Upload New Image</label>
                    <label
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition-colors hover:border-teal/50"
                      style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 5 * 1024 * 1024) {
                            setError('Image must be under 5 MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            setImgPreview(dataUrl);
                            setImgBroken(false);
                            setPendingFile({
                              dataUrl,
                              filename: f.name,
                              mimetype: f.type || 'image/jpeg',
                            });
                          };
                          reader.readAsDataURL(f);
                          // Reset input so same file can be re-selected
                          e.target.value = '';
                        }}
                      />
                      <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        Click to upload (JPG, PNG, WebP · max 5 MB)
                      </span>
                    </label>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>or</span>
                    <div className="flex-1 h-px" style={{ background: 'var(--surface-border)' }} />
                  </div>

                  {/* URL input */}
                  <div>
                    <label className={lbl}>Image URL</label>
                    <input
                      type="url"
                      value={imgPreview.startsWith('data:') ? '' : imgPreview}
                      onChange={e => {
                        setImgPreview(e.target.value);
                        setPendingFile(null);
                        setImgBroken(false);
                      }}
                      className={inp}
                      placeholder="https://example.com/product.jpg"
                    />
                  </div>

                  {/* AI fetch */}
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      const searchName = (generic || name).trim();
                      if (!searchName) { setError('Enter a product name first'); return; }
                      try {
                        const res = await fetch(`/api/product-image?name=${encodeURIComponent(searchName)}`);
                        const data = await res.json() as { imageUrl?: string; searchUrl?: string; message?: string; error?: string };
                        if (data.imageUrl) {
                          setImgPreview(data.imageUrl);
                          setPendingFile(null);
                          setImgBroken(false);
                        } else if (data.searchUrl) {
                          window.open(data.searchUrl, '_blank');
                          setError(data.message ?? 'No image found. Google Images opened in a new tab.');
                        } else {
                          setError(data.message ?? data.error ?? 'No image found. Try uploading manually.');
                        }
                      } catch {
                        setError('Could not search for images. Check your connection.');
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:scale-[1.01]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(13,148,136,0.1))',
                      border: '1px solid rgba(124,58,237,0.2)',
                      color: '#7c3aed',
                    }}
                  >
                    <Sparkles size={16} />
                    AI Find Product Image
                  </button>
                  <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                    Searches NIH RxImage + OpenFDA databases for real pharmaceutical product photos
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
              {isOwner && !showDeactivate ? (
                <button
                  type="button"
                  onClick={() => setShowDeactivate(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Deactivate
                </button>
              ) : isOwner && showDeactivate ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-red-600">Sure?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await deactivateProduct({ variables: { id: product.productId } });
                      onSuccess?.();
                      onClose();
                    }}
                    disabled={deactivating}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deactivating ? 'Removing…' : 'Yes, deactivate'}
                  </button>
                  <button type="button" onClick={() => setShowDeactivate(false)} className="text-xs font-bold text-content-muted">
                    Cancel
                  </button>
                </div>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-surface-border px-4 py-2.5 text-sm font-bold text-content-secondary hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all',
                    'bg-teal hover:bg-teal-dark disabled:opacity-50',
                  )}
                >
                  {isSaving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  ) : (
                    <><Save size={14} /> Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

