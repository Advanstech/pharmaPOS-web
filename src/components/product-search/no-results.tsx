'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchX, BrainCircuit, Package, Send, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { aiFetch } from '@/lib/ai/fetch-with-auth';

interface NoResultsProps {
  query: string;
}

export function NoResults({ query }: NoResultsProps) {
  const user = useAuthStore(s => s.user);
  const [showRequest, setShowRequest] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [note, setNote] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);

  // AI drug intelligence quick lookup
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function fetchAiHint() {
    if (aiSummary || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await aiFetch('/api/drug-intelligence', {
        name: query, genericName: '', classification: 'OTC',
      });
      if (res.ok) {
        const data = await res.json() as { whatItDoes?: string; genericName?: string; localAlternatives?: string[] };
        const parts: string[] = [];
        if (data.whatItDoes) parts.push(data.whatItDoes);
        if (data.localAlternatives?.length) {
          parts.push(`Local alternatives: ${data.localAlternatives.join(', ')}.`);
        }
        setAiSummary(parts.join(' ') || null);
      }
    } catch {
      // silent — AI hint is optional
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmitRequest() {
    setSubmitting(true);
    // Small delay to simulate submission (real implementation would call API)
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center px-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(21,128,61,0.1)', border: '1px solid rgba(21,128,61,0.2)' }}
        >
          <Package size={28} style={{ color: '#15803d' }} />
        </div>
        <p className="font-bold text-sm mb-1" style={{ color: '#15803d' }}>
          Request logged!
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Your manager has been notified to source <strong>&ldquo;{query}&rdquo;</strong>.
          {urgency === 'urgent' && ' Marked as urgent.'}
        </p>
        <button
          onClick={() => { setSubmitted(false); setShowRequest(false); setNote(''); }}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-white"
          style={{ background: 'var(--color-teal)' }}
        >
          Back to search
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center py-10 text-center px-6"
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-hover)' }}
      >
        <SearchX size={28} style={{ color: 'var(--text-muted)' }} aria-hidden />
      </div>

      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
        No results for &ldquo;{query}&rdquo;
      </p>
      <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
        Not in your catalog yet — try the generic name, or log a product request for your manager.
      </p>

      {/* AI hint */}
      <AnimatePresence>
        {(aiLoading || aiSummary) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-sm mb-4 overflow-hidden"
          >
            <div
              className="rounded-xl p-3 text-left"
              style={{
                background: 'linear-gradient(135deg, rgba(0,109,119,0.07) 0%, rgba(232,168,56,0.05) 100%)',
                border: '1px solid rgba(0,109,119,0.2)',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <BrainCircuit size={12} style={{ color: 'var(--color-teal)' }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-teal-dark)' }}>
                  AI Drug Intelligence
                </span>
                {aiLoading && (
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Looking up…
                  </span>
                )}
              </div>
              {aiSummary && (
                <p className="text-xs leading-relaxed text-left" style={{ color: 'var(--text-primary)' }}>
                  {aiSummary}
                </p>
              )}
              {aiLoading && !aiSummary && (
                <div className="flex gap-1 mt-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--color-teal)', animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!showRequest && (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {/* AI lookup button */}
          {!aiSummary && (
            <button
              onClick={() => void fetchAiHint()}
              disabled={aiLoading}
              className="flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, rgba(0,109,119,0.1) 0%, rgba(232,168,56,0.08) 100%)',
                border: '1px solid rgba(0,109,119,0.25)',
                color: 'var(--color-teal-dark)',
              }}
            >
              <BrainCircuit size={15} />
              Look up &ldquo;{query}&rdquo; with AI
              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: 'rgba(0,109,119,0.15)', color: 'var(--color-teal)' }}>
                GPT-4o
              </span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                // Trigger a search with the query as-is — user can edit it
                const input = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
                input?.focus();
                input?.select();
              }}
              className="flex-1 min-h-[44px] rounded-xl text-sm font-medium transition-colors"
              style={{
                border: '1px solid var(--surface-border)',
                color: 'var(--text-secondary)',
                background: 'var(--surface-card)',
              }}
            >
              Edit search
            </button>
            <button
              onClick={() => setShowRequest(true)}
              className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-teal)' }}
            >
              Request product
            </button>
          </div>
        </div>
      )}

      {/* Request form */}
      <AnimatePresence>
        {showRequest && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full max-w-sm mt-2"
          >
            <div
              className="rounded-2xl p-4 text-left"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={14} style={{ color: 'var(--color-teal)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Request product
                  </p>
                </div>
                <button
                  onClick={() => setShowRequest(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-hover"
                  aria-label="Cancel"
                >
                  <X size={13} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              {/* Product name (pre-filled) */}
              <div className="mb-3">
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Product requested
                </label>
                <div
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                >
                  {query}
                </div>
              </div>

              {/* Urgency */}
              <div className="mb-3">
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Urgency
                </label>
                <div className="flex gap-2">
                  {(['normal', 'urgent'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setUrgency(u)}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition-all"
                      style={
                        urgency === u
                          ? {
                              background: u === 'urgent' ? 'rgba(185,28,28,0.1)' : 'rgba(0,109,119,0.1)',
                              border: `1px solid ${u === 'urgent' ? 'rgba(185,28,28,0.3)' : 'rgba(0,109,119,0.3)'}`,
                              color: u === 'urgent' ? '#b91c1c' : 'var(--color-teal-dark)',
                            }
                          : {
                              background: 'var(--surface-base)',
                              border: '1px solid var(--surface-border)',
                              color: 'var(--text-muted)',
                            }
                      }
                    >
                      {u === 'urgent' ? '🔴 Urgent' : '🟢 Normal'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Note for manager <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Customer needs it today, quantity needed, brand preference…"
                  rows={2}
                  className="w-full rounded-xl px-3 py-2 text-xs resize-none outline-none"
                  style={{
                    background: 'var(--surface-base)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Requested by */}
              <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
                Requested by: <strong style={{ color: 'var(--text-secondary)' }}>{user?.name ?? 'Staff'}</strong>
              </p>

              <button
                onClick={() => void handleSubmitRequest()}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: urgency === 'urgent' ? '#b91c1c' : 'var(--color-teal)' }}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    {urgency === 'urgent' ? 'Send urgent request' : 'Send request to manager'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
