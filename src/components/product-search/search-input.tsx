'use client';

import { useRef, useEffect } from 'react';
import { Search, ScanBarcode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  isBarcodeScan: boolean;
}

export function SearchInput({ value, onChange, loading, isBarcodeScan }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount — cashier workflow starts here
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="relative group">
      {/* Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
        <AnimatePresence mode="wait">
          {isBarcodeScan ? (
            <motion.div key="barcode"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ScanBarcode size={22} className="text-[var(--color-teal)]" aria-hidden="true" />
            </motion.div>
          ) : (
            <motion.div key="search"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Search size={22} className="text-[var(--text-muted)] group-focus-within:text-[var(--color-teal)] transition-colors" aria-hidden="true" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        aria-label="Search products by name, generic name, or barcode"
        aria-busy={loading}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, generic name, or scan barcode…"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full h-14 pl-12 pr-12 text-base rounded-2xl border transition-all duration-200 focus:outline-none"
        style={{
          background: 'var(--surface-card)',
          color: 'var(--text-primary)',
          borderColor: 'var(--surface-border)',
          fontFamily: 'var(--font-inter)',
          boxShadow: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-teal)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,109,119,0.12)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--surface-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />

      {/* Clear: full-height flex rail so the icon stays centered — motion `transform` must not own vertical translate */}
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <AnimatePresence>
          {value ? (
            <motion.button
              key="clear"
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              aria-label="Clear search"
            >
              <X size={18} strokeWidth={2} className="block shrink-0 text-[var(--text-muted)]" aria-hidden />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Loading bar — never a spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left"
            style={{ background: 'var(--color-teal)' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
