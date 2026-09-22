'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, X, Send, Sparkles, Loader2,
  TrendingUp, Pill, Package, DollarSign, AlertTriangle,
} from 'lucide-react';
import { aiFetch } from '@/lib/ai/fetch-with-auth';
import { useAuthStore } from '@/lib/store/auth.store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const ROLE_CONTEXT: Record<string, string> = {
  owner: 'pharmacy owner who needs financial intelligence, revenue insights, and operational oversight',
  manager: 'pharmacy manager who needs operational data, staff performance, and inventory intelligence',
  head_pharmacist: 'head pharmacist who needs clinical drug information, prescription management, and compliance guidance',
  pharmacist: 'pharmacist who needs drug information, interaction checks, dosage guidance, and patient counselling scripts',
  technician: 'pharmacy technician who needs inventory management, stock levels, and dispensing support',
  cashier: 'pharmacy cashier who needs product information, pricing, and sales support',
  chemical_cashier: 'chemical shop cashier who needs OTC product information and sales support',
  se_admin: 'system administrator with full access to all pharmacy intelligence',
};

const QUICK_PROMPTS: Record<string, Array<{ icon: typeof Pill; label: string; prompt: string }>> = {
  pharmacist: [
    { icon: Pill, label: 'Drug info', prompt: 'What are the key counselling points for Amoxicillin?' },
    { icon: AlertTriangle, label: 'Interactions', prompt: 'What interactions should I watch for with Metformin and Lisinopril?' },
    { icon: Package, label: 'Stock alert', prompt: 'What are the signs of a drug that needs urgent reorder?' },
  ],
  cashier: [
    { icon: Pill, label: 'Product info', prompt: 'What does Paracetamol treat?' },
    { icon: DollarSign, label: 'Pricing', prompt: 'How do I handle a price discrepancy at checkout?' },
    { icon: TrendingUp, label: 'Sales tip', prompt: 'What OTC products are commonly bought together?' },
  ],
  owner: [
    { icon: TrendingUp, label: 'Revenue', prompt: 'What are the key metrics I should track daily?' },
    { icon: DollarSign, label: 'Cash flow', prompt: 'How do I improve pharmacy cash flow?' },
    { icon: Package, label: 'Inventory', prompt: 'What is the ideal inventory turnover for a pharmacy?' },
  ],
};

function getQuickPrompts(role: string) {
  return QUICK_PROMPTS[role] ?? QUICK_PROMPTS.cashier;
}

export function PharmaCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(s => s.user);
  const role = user?.role ?? 'cashier';

  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting: Message = {
        id: 'greeting',
        role: 'assistant',
        content: `Hello ${user?.name?.split(' ')[0] ?? 'there'}! 👋 I'm your Azzay Pharmacy AI Copilot. I can help you with drug information, clinical guidance, inventory intelligence, and more. What would you like to know?`,
        ts: Date.now(),
      };
      setMessages([greeting]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, user?.name, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_KEY;
      const res = await aiFetch('/api/ai-copilot', {
        message: text.trim(),
        role,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      });

      let reply = '';
      if (res.ok) {
        const data = await res.json() as { reply: string };
        reply = data.reply;
      } else {
        reply = 'I\'m having trouble connecting right now. Please check your internet connection and try again.';
      }

      const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: reply, ts: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Connection error. Please try again.',
        ts: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, role]);

  const quickPrompts = getQuickPrompts(role);

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))',
              boxShadow: '0 8px 32px rgba(0,109,119,0.4)',
            }}
            aria-label="Open AI Copilot"
          >
            <BrainCircuit size={22} className="text-white" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
              style={{ background: 'var(--color-gold)' }}>
              AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.3)' }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl overflow-hidden"
              style={{
                height: 'min(560px, calc(100dvh - 3rem))',
                background: 'var(--surface-card)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                border: '1px solid var(--surface-border)',
              }}
            >
              {/* Header */}
              <div
                className="flex shrink-0 items-center justify-between p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,109,119,0.12) 0%, rgba(232,168,56,0.08) 100%)',
                  borderBottom: '1px solid var(--surface-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
                  >
                    <BrainCircuit size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        Pharma Copilot
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
                        <Sparkles size={7} /> AI
                      </span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {ROLE_CONTEXT[role]?.split(' who')[0] ?? 'Pharmacy assistant'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover"
                  aria-label="Close copilot"
                >
                  <X size={15} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                      style={
                        msg.role === 'user'
                          ? { background: 'var(--color-teal)', color: '#fff', borderBottomRightRadius: '4px' }
                          : { background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderBottomLeftRadius: '4px' }
                      }
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5"
                      style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                      <Loader2 size={13} className="animate-spin text-teal" />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking…</span>
                    </div>
                  </div>
                )}

                {/* Quick prompts — show after greeting */}
                {messages.length === 1 && !loading && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: 'var(--text-muted)' }}>
                      Quick questions
                    </p>
                    {quickPrompts.map(({ icon: Icon, label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => void sendMessage(prompt)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all hover:opacity-80"
                        style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                      >
                        <Icon size={13} style={{ color: 'var(--color-teal)' }} />
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div
                className="shrink-0 p-3"
                style={{ borderTop: '1px solid var(--surface-border)' }}
              >
                <form
                  onSubmit={e => { e.preventDefault(); void sendMessage(input); }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about any drug, stock, or clinical question…"
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{
                      background: 'var(--surface-base)',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-primary)',
                    }}
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:opacity-40"
                    style={{ background: 'var(--color-teal)' }}
                    aria-label="Send"
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </form>
                <p className="mt-1.5 text-center text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  Advisory only — not a substitute for clinical judgment
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
