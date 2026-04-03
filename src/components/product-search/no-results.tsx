'use client';

import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

interface NoResultsProps {
  query: string;
}

export function NoResults({ query }: NoResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center justify-center py-20 text-center px-6"
      role="status"
      aria-live="polite"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-hover)' }}
      >
        <SearchX size={28} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      </div>

      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        No results for &ldquo;{query}&rdquo;
      </p>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Try the generic name, or scan the barcode directly
      </p>

      <div className="flex gap-2">
        <button
          className="min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors"
          style={{
            border: '1px solid var(--surface-border)',
            color: 'var(--text-secondary)',
            background: 'var(--surface-card)',
          }}
        >
          Try generic name
        </button>
        <button
          className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-teal)' }}
        >
          Request product
        </button>
      </div>
    </motion.div>
  );
}
