'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Save, Truck } from 'lucide-react';
import {
  CREATE_SUPPLIER_MUTATION,
  UPDATE_SUPPLIER_MUTATION,
  SUPPLIERS_LIST_QUERY,
  SUPPLIER_RESTOCK_WATCH,
} from '@/lib/graphql/suppliers.queries';
import { cn } from '@/lib/utils';

interface SupplierData {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

interface SupplierFormModalProps {
  /** Pass existing supplier to edit, or null/undefined to create new */
  supplier?: SupplierData | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SupplierFormModal({ supplier, open, onClose, onSuccess }: SupplierFormModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const isEdit = !!supplier;

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refetchQueries = [
    { query: SUPPLIERS_LIST_QUERY },
    { query: SUPPLIER_RESTOCK_WATCH },
  ];

  const [createSupplier, { loading: creating }] = useMutation(CREATE_SUPPLIER_MUTATION, { refetchQueries });
  const [updateSupplier, { loading: updating }] = useMutation(UPDATE_SUPPLIER_MUTATION, { refetchQueries });

  const loading = creating || updating;

  useEffect(() => {
    if (open) {
      setName(supplier?.name ?? '');
      setContactName(supplier?.contactName ?? '');
      setPhone(supplier?.phone ?? '');
      setEmail(supplier?.email ?? '');
      setAddress(supplier?.address ?? '');
      setError(null);
    }
  }, [open, supplier]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }

    const input = {
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    };

    try {
      if (isEdit && supplier) {
        await updateSupplier({ variables: { id: supplier.id, input } });
      } else {
        await createSupplier({ variables: { input } });
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.error('Supplier save error:', e);
      // Extract the actual error message from GraphQL errors
      const errorMessage = e?.graphQLErrors?.[0]?.message ||
                          e?.networkError?.message ||
                          e?.message ||
                          'Failed to save supplier. Please try again.';
      setError(errorMessage);
    }
  };

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
            className="relative mx-4 w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl"
            initial={shouldReduceMotion ? false : { scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10 text-teal">
                  <Truck size={18} />
                </div>
                <h2 className="text-lg font-bold text-content-primary">
                  {isEdit ? 'Edit Supplier' : 'New Supplier'}
                </h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-content-muted hover:bg-surface-hover">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ADD Pharma Limited"
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Contact Person</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Kwame Asante"
                  className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-content-secondary">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="supplier@example.com"
                    className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-content-secondary">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Accra, Ghana"
                  className="w-full resize-none rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm font-bold text-content-secondary hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white transition-all',
                  'bg-teal hover:bg-teal-dark disabled:opacity-50',
                )}
              >
                <Save size={14} />
                {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Supplier'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
