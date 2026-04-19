'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Camera, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth.store';

const ALLOWED = new Set(['application/pdf','image/png','image/jpeg','image/jpg','image/webp','image/heic','image/heif','image/tiff','image/bmp']);

export default function InvoiceUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (f: File) => {
    const ext = f.name.toLowerCase();
    const ok = ALLOWED.has(f.type) || ['.pdf','.png','.jpg','.jpeg','.webp','.heic','.tiff','.bmp'].some(e => ext.endsWith(e));
    if (!ok) { setError('Please upload a PDF or image file (JPG, PNG, WEBP, HEIC, TIFF, BMP)'); return; }
    if (f.size > 10 * 1024 * 1024) { setError('File size must be less than 10MB'); return; }
    setFile(f); setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const f = e.dataTransfer.files?.[0]; if (f) validate(f);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file'); return; }
    setUploading(true); setError(null);

    try {
      const token = useAuthStore.getState().accessToken;
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
      const url = `${apiBase}/invoices/upload`;

      const body = new FormData();
      body.append('file', file, file.name);
      if (supplierId.trim()) body.append('supplierId', supplierId.trim());

      console.log(`POST ${url} — ${file.name} (${(file.size/1024).toFixed(1)} KB, ${file.type})`);

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const json = await res.json();
      console.log('Response:', json);

      if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);

      router.push(`/dashboard/invoices/ocr/${json.ocrJobId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6">
        <Link href="/dashboard/inventory/receive" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Inventory
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">Upload Supplier Invoice</h1>
        <p className="mt-1 text-sm font-medium text-content-secondary">
          Upload a supplier invoice for AI-powered OCR processing and automatic GRN creation
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">Upload Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-content-primary">Supplier (Optional)</label>
          <input
            type="text" value={supplierId} onChange={e => setSupplierId(e.target.value)}
            placeholder="Enter supplier ID or leave blank for auto-detection"
            className="w-full rounded-lg border border-surface-border px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
            style={{ background: 'var(--surface-card)' }} disabled={uploading}
          />
        </div>

        <div
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${dragActive ? 'border-teal bg-teal/5' : 'border-surface-border hover:border-teal/50'}`}
          style={{ background: 'var(--surface-card)' }}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        >
          <input type="file" id="file-upload" className="hidden" accept="image/*,.pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) validate(f); }} disabled={uploading} />

          {file ? (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
                <FileText className="h-8 w-8 text-teal" />
              </div>
              <div>
                <p className="font-semibold text-content-primary">{file.name}</p>
                <p className="text-sm text-content-secondary">{(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}</p>
              </div>
              {!uploading && (
                <button onClick={() => { setFile(null); setError(null); }} className="text-sm font-medium text-red-500 hover:text-red-600">
                  Remove file
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
                <Upload className="h-8 w-8 text-teal" />
              </div>
              <div>
                <p className="font-semibold text-content-primary">Drag and drop your invoice here</p>
                <p className="text-sm text-content-secondary">or click to browse files</p>
              </div>
              <label htmlFor="file-upload" className="inline-block cursor-pointer rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal/90">
                Select File
              </label>
              <div className="flex items-center justify-center gap-4 text-sm text-content-secondary">
                <span>or</span>
                <button type="button" disabled={uploading}
                  onClick={async () => {
                    try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); s.getTracks().forEach(t => t.stop()); }
                    catch { setError('Camera not available on this device'); }
                  }}
                  className="inline-flex items-center gap-2 font-medium text-teal hover:text-teal/90"
                >
                  <Camera className="h-4 w-4" /> Use Camera
                </button>
              </div>
              <p className="text-xs text-content-muted">PDF, JPG, PNG, WEBP, HEIC · Max 10MB</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href="/dashboard/inventory/receive"
            className="rounded-lg border border-surface-border px-6 py-2.5 text-sm font-semibold text-content-primary hover:bg-surface-hover"
            style={{ background: 'var(--surface-card)' }}>
            Cancel
          </Link>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50">
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
}
