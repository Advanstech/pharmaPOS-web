'use client';

import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 4500
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const duration = opts.duration ?? 4500;
    setToasts(prev => [...prev.slice(-4), { ...opts, id }]); // max 5 visible
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error   = useCallback((title: string, message?: string) => toast({ type: 'error',   title, message, duration: 6000 }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);
  const info    = useCallback((title: string, message?: string) => toast({ type: 'info',    title, message }), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: typeof CheckCircle2; iconColor: string }> = {
  success: { bg: 'rgba(21,128,61,0.97)',  border: 'rgba(21,128,61,0.4)',  icon: CheckCircle2,   iconColor: '#86efac' },
  error:   { bg: 'rgba(185,28,28,0.97)',  border: 'rgba(185,28,28,0.4)',  icon: XCircle,        iconColor: '#fca5a5' },
  warning: { bg: 'rgba(146,64,14,0.97)',  border: 'rgba(180,83,9,0.4)',   icon: AlertTriangle,  iconColor: '#fcd34d' },
  info:    { bg: 'rgba(0,78,87,0.97)',    border: 'rgba(0,109,119,0.4)',  icon: Info,           iconColor: '#67e8f9' },
};

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 'min(380px, calc(100vw - 2rem))' }}
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const s = TOAST_STYLES[t.type];
  const Icon = s.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
      role="alert"
    >
      <Icon size={18} className="shrink-0 mt-0.5" style={{ color: s.iconColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug">{t.title}</p>
        {t.message && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{t.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10"
        aria-label="Dismiss"
      >
        <X size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
      </button>
    </motion.div>
  );
}

// ── Confirm dialog (replaces window.confirm) ──────────────────────────────────

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handle = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {pending && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998]"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => handle(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              {pending.danger && (
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(220,38,38,0.1)' }}>
                  <AlertTriangle size={20} style={{ color: '#dc2626' }} />
                </div>
              )}
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {pending.title}
              </h3>
              {pending.message && (
                <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {pending.message}
                </p>
              )}
              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => handle(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}
                >
                  {pending.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  onClick={() => handle(true)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                  style={{ background: pending.danger ? '#dc2626' : 'var(--color-teal)' }}
                >
                  {pending.confirmLabel ?? 'Confirm'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

// ── Prompt dialog (replaces window.prompt) ────────────────────────────────────

interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  required?: boolean;
}

interface PromptContextValue {
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const PromptContext = createContext<PromptContextValue | null>(null);

export function usePrompt(): PromptContextValue {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('usePrompt must be used inside <PromptProvider>');
  return ctx;
}

interface PendingPrompt extends PromptOptions {
  resolve: (v: string | null) => void;
}

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [value, setValue] = useState('');

  const prompt = useCallback((opts: PromptOptions): Promise<string | null> => {
    setValue('');
    return new Promise(resolve => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handle = (confirmed: boolean) => {
    if (confirmed) {
      pending?.resolve(value.trim() || null);
    } else {
      pending?.resolve(null);
    }
    setPending(null);
    setValue('');
  };

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      <AnimatePresence>
        {pending && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998]"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => handle(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {pending.title}
              </h3>
              {pending.message && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{pending.message}</p>
              )}
              <input
                autoFocus
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handle(true); if (e.key === 'Escape') handle(false); }}
                placeholder={pending.placeholder}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none mb-4"
                style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => handle(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  onClick={() => handle(true)}
                  disabled={pending.required && !value.trim()}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: 'var(--color-teal)' }}>
                  {pending.confirmLabel ?? 'OK'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PromptContext.Provider>
  );
}
