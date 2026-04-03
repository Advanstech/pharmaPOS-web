'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList, Loader2 } from 'lucide-react';
import { PRESCRIPTIONS_FOR_PRODUCT, VERIFY_PRESCRIPTION } from '@/lib/graphql/pharmacy.queries';
import { useAuthStore } from '@/lib/store/auth.store';
import { formatAccraDate } from '@/lib/utils';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';
import type { Product, UserRole } from '@/types';

interface RxRow {
  id: string;
  customerId: string;
  prescriberName: string;
  prescriberLicenceNo: string;
  prescribedDate: string;
  status: string;
  approvalCount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    dosageInstructions?: string | null;
  }>;
}

interface PomRxModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** Called after user picks a verified prescription — parent should add the line to cart with this id. */
  onPrescriptionLinked: (prescriptionId: string) => void;
}

function shortId(uuid: string) {
  return uuid.slice(0, 8).toUpperCase();
}

export function PomRxModal({ product, open, onClose, onPrescriptionLinked }: PomRxModalProps) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;
  const canVerify = role && ['head_pharmacist', 'pharmacist'].includes(role);
  const [verifyError, setVerifyError] = useState('');

  const { data, loading, error, refetch } = useQuery<{ prescriptionsForProduct: RxRow[] }>(
    PRESCRIPTIONS_FOR_PRODUCT,
    {
      variables: { productId: product.id },
      skip: !open || !product.id,
      fetchPolicy: 'network-only',
    },
  );

  const [verifyRx, { loading: verifying }] = useMutation(VERIFY_PRESCRIPTION, {
    onCompleted: () => {
      setVerifyError('');
      void refetch();
    },
    onError: (e) => setVerifyError(formatApolloError(e) ?? 'Verification failed'),
  });

  const list = data?.prescriptionsForProduct ?? [];

  useEffect(() => {
    if (open) setVerifyError('');
  }, [open]);

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => {
      const sa = a.status === 'VERIFIED' ? 0 : 1;
      const sb = b.status === 'VERIFIED' ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime();
    });
  }, [list]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pom-rx-modal-title"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl shadow-xl"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: 'var(--surface-border)' }}
            >
              <div>
                <h2 id="pom-rx-modal-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Link a prescription
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {product.name} — choose a verified Rx for this branch, or verify a pending one.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="max-h-[calc(85vh-8rem)] overflow-y-auto px-4 py-3">
              <Link
                href="/dashboard/prescriptions"
                className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: 'rgba(0,109,119,0.08)',
                  color: 'var(--color-teal-dark)',
                  border: '1px solid rgba(0,109,119,0.2)',
                }}
              >
                <ClipboardList size={14} aria-hidden />
                Open prescriptions workspace
              </Link>

              {(error || verifyError) && (
                <p className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c' }}>
                  {error ? (formatApolloError(error) ?? 'Failed to load prescriptions') : verifyError}
                </p>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Loading prescriptions…
                </div>
              )}

              {!loading && sorted.length === 0 && !error && (
                <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No prescriptions found for this medicine in your branch queue. Create one in{' '}
                  <Link href="/dashboard/prescriptions" className="font-semibold underline underline-offset-2">
                    Clinical → Prescriptions
                  </Link>
                  , then verify it here.
                </p>
              )}

              <ul className="space-y-3">
                {sorted.map((rx) => {
                  const line = rx.items.find((i) => i.productId === product.id);
                  const verified = rx.status === 'VERIFIED';
                  const pending = rx.status === 'PENDING';
                  return (
                    <li
                      key={rx.id}
                      className="rounded-xl p-3 text-sm"
                      style={{ border: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                          Rx {shortId(rx.id)}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={
                            verified
                              ? { background: 'rgba(22,163,74,0.12)', color: '#15803d' }
                              : { background: 'rgba(217,119,6,0.12)', color: '#92400e' }
                          }
                        >
                          {rx.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {rx.prescriberName} · Lic. {rx.prescriberLicenceNo}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Prescribed {formatAccraDate(rx.prescribedDate)}
                        {line ? (
                          <>
                            {' '}
                            · <strong style={{ color: 'var(--text-primary)' }}>{line.quantity}</strong> authorised for this
                            product
                          </>
                        ) : null}
                      </p>
                      {line?.dosageInstructions ? (
                        <p className="mt-1 text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
                          {line.dosageInstructions}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {verified && (
                          <button
                            type="button"
                            className="min-h-[40px] flex-1 rounded-lg px-3 text-xs font-bold text-white"
                            style={{ background: 'var(--color-teal)' }}
                            onClick={() => {
                              onPrescriptionLinked(rx.id);
                              onClose();
                            }}
                          >
                            Use this prescription
                          </button>
                        )}
                        {pending && canVerify && (
                          <button
                            type="button"
                            disabled={verifying}
                            className="min-h-[40px] flex-1 rounded-lg px-3 text-xs font-bold text-white disabled:opacity-60"
                            style={{ background: 'var(--color-gold)' }}
                            onClick={() => {
                              setVerifyError('');
                              void verifyRx({ variables: { input: { prescriptionId: rx.id } } });
                            }}
                          >
                            {verifying ? 'Verifying…' : 'Verify prescription'}
                          </button>
                        )}
                        {pending && !canVerify && (
                          <p className="w-full text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Pending review — ask a pharmacist to verify in Clinical, then return here.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
