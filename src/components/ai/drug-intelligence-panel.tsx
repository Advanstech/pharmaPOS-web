'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BrainCircuit, Pill, AlertTriangle, Heart, Baby,
  Thermometer, BookOpen, ExternalLink, ChevronDown, ChevronUp,
  Sparkles, ShieldCheck, MessageSquare, Loader2, RefreshCw,
} from 'lucide-react';
import type { DrugIntelligence } from '@/app/api/drug-intelligence/route';
import type { Product } from '@/types';

interface DrugIntelligencePanelProps {
  product: Product;
  onClose: () => void;
}

type Section = 'overview' | 'dosage' | 'safety' | 'counselling' | 'ghana';

const SEVERITY_COLORS = {
  safe: { bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.25)', text: '#15803d', icon: ShieldCheck },
  caution: { bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.25)', text: '#b45309', icon: AlertTriangle },
  warning: { bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.25)', text: '#b91c1c', icon: AlertTriangle },
};

export function DrugIntelligencePanel({ product, onClose }: DrugIntelligencePanelProps) {
  const [data, setData] = useState<DrugIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/drug-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          genericName: product.genericName ?? '',
          classification: product.classification,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json() as DrugIntelligence;
      setData(json);
    } catch {
      setError('Could not load drug intelligence. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [product.name, product.genericName, product.classification]);

  useEffect(() => {
    void fetchIntelligence();
  }, [fetchIntelligence]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const sections: Array<{ id: Section; label: string; icon: typeof Pill }> = [
    { id: 'overview', label: 'Overview', icon: Pill },
    { id: 'dosage', label: 'Dosage', icon: Thermometer },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
    { id: 'counselling', label: 'Counselling', icon: MessageSquare },
    { id: 'ghana', label: 'Ghana', icon: Heart },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 64 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 64 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 h-full w-full max-w-[480px] z-[70] flex flex-col"
        style={{ background: 'var(--surface-card)', boxShadow: '-8px 0 48px rgba(0,0,0,0.18)' }}
        role="dialog"
        aria-modal
        aria-label={`Drug intelligence: ${product.name}`}
      >
        {/* Header */}
        <div
          className="shrink-0 p-4 pb-3"
          style={{
            background: 'linear-gradient(135deg, rgba(0,109,119,0.12) 0%, rgba(232,168,56,0.08) 100%)',
            borderBottom: '1px solid var(--surface-border)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
              >
                <BrainCircuit size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-teal)' }}>
                    AI Drug Intelligence
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                    style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
                    <Sparkles size={8} />
                    GPT-4o
                  </span>
                </div>
                <h2 className="text-base font-bold leading-tight mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                  {product.name}
                </h2>
                {product.genericName && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {product.genericName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!loading && (
                <button
                  onClick={() => void fetchIntelligence()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover"
                  aria-label="Refresh drug intelligence"
                  title="Refresh"
                >
                  <RefreshCw size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-hover"
                aria-label="Close"
              >
                <X size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>

          {/* Section tabs */}
          {!loading && data && (
            <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                  style={
                    activeSection === id
                      ? { background: 'var(--color-teal)', color: '#fff' }
                      : { background: 'var(--surface-base)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }
                  }
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-teal/20 border-t-teal animate-spin" />
                <BrainCircuit size={18} className="absolute inset-0 m-auto text-teal" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Analysing drug profile…
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  GPT-4o is generating clinical intelligence
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4">
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.2)' }}>
                <AlertTriangle size={24} className="mx-auto mb-2" style={{ color: '#b91c1c' }} />
                <p className="text-sm font-semibold" style={{ color: '#b91c1c' }}>{error}</p>
                <button
                  onClick={() => void fetchIntelligence()}
                  className="mt-3 flex items-center gap-2 mx-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: 'var(--color-teal)' }}
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-4 space-y-3"
              >
                {activeSection === 'overview' && (
                  <>
                    {/* What it does */}
                    <InfoCard
                      icon={<Pill size={14} />}
                      title="What it does"
                      accent="teal"
                    >
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {data.whatItDoes}
                      </p>
                    </InfoCard>

                    {/* Mechanism */}
                    <InfoCard icon={<BrainCircuit size={14} />} title="How it works" accent="purple">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {data.mechanism}
                      </p>
                    </InfoCard>

                    {/* Indications */}
                    <InfoCard icon={<BookOpen size={14} />} title="Treats / Used for" accent="green">
                      <ul className="space-y-1">
                        {data.indications.map((ind, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                            {ind}
                          </li>
                        ))}
                      </ul>
                    </InfoCard>

                    {/* Learn more links */}
                    {data.learnMoreLinks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                          Learn more
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {data.learnMoreLinks.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                              style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}
                            >
                              <ExternalLink size={10} />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeSection === 'dosage' && (
                  <>
                    <InfoCard icon={<Pill size={14} />} title="Adult dose" accent="teal">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.adultDose}</p>
                    </InfoCard>

                    {data.pediatricDose && (
                      <InfoCard icon={<Baby size={14} />} title="Pediatric dose" accent="blue">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.pediatricDose}</p>
                      </InfoCard>
                    )}

                    {data.renalAdjustment && (
                      <InfoCard icon={<AlertTriangle size={14} />} title="Renal adjustment" accent="amber">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.renalAdjustment}</p>
                      </InfoCard>
                    )}

                    {data.foodInteractions && (
                      <InfoCard icon={<AlertTriangle size={14} />} title="Food & drink interactions" accent="amber">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.foodInteractions}</p>
                      </InfoCard>
                    )}

                    <InfoCard icon={<Thermometer size={14} />} title="Storage" accent="gray">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.storageConditions}</p>
                    </InfoCard>
                  </>
                )}

                {activeSection === 'safety' && (
                  <>
                    {/* Common side effects */}
                    <InfoCard icon={<AlertTriangle size={14} />} title="Common side effects" accent="amber">
                      <ul className="space-y-1">
                        {data.commonSideEffects.map((se, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {se}
                          </li>
                        ))}
                      </ul>
                    </InfoCard>

                    {/* Serious side effects */}
                    {data.seriousSideEffects.length > 0 && (
                      <InfoCard icon={<AlertTriangle size={14} />} title="Serious side effects — report immediately" accent="red">
                        <ul className="space-y-1">
                          {data.seriousSideEffects.map((se, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#b91c1c' }}>
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                              {se}
                            </li>
                          ))}
                        </ul>
                      </InfoCard>
                    )}

                    {/* Contraindications */}
                    <InfoCard icon={<ShieldCheck size={14} />} title="Contraindications" accent="red">
                      <ul className="space-y-1">
                        {data.contraindications.map((ci, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                            {ci}
                          </li>
                        ))}
                      </ul>
                    </InfoCard>

                    {/* Pregnancy & lactation */}
                    <div className="grid grid-cols-2 gap-2">
                      <InfoCard icon={<Heart size={14} />} title="Pregnancy" accent="pink" compact>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{data.pregnancySafety}</p>
                      </InfoCard>
                      <InfoCard icon={<Baby size={14} />} title="Breastfeeding" accent="blue" compact>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{data.lactationSafety}</p>
                      </InfoCard>
                    </div>
                  </>
                )}

                {activeSection === 'counselling' && (
                  <>
                    <div
                      className="rounded-xl p-3 mb-1"
                      style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.15)' }}
                    >
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-teal-dark)' }}>
                        💬 What to tell the patient / customer
                      </p>
                    </div>
                    <div className="space-y-2">
                      {data.counsellingPoints.map((point, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-xl p-3"
                          style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: 'var(--color-teal)' }}
                          >
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {point}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeSection === 'ghana' && (
                  <>
                    {/* NHIS Status */}
                    <InfoCard icon={<ShieldCheck size={14} />} title="NHIS Coverage" accent="green">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.nhisStatus}</p>
                    </InfoCard>

                    {/* Local alternatives */}
                    {data.localAlternatives.length > 0 && (
                      <InfoCard icon={<Pill size={14} />} title="Local brand alternatives" accent="teal">
                        <div className="flex flex-wrap gap-2">
                          {data.localAlternatives.map((alt, i) => (
                            <span
                              key={i}
                              className="rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </InfoCard>
                    )}

                    {/* Ghana FDA link */}
                    <a
                      href="https://www.fdaghana.gov.gh/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-3 transition-colors hover:opacity-80"
                      style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.2)' }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-teal-dark)' }}>Ghana FDA</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Official drug regulatory authority</p>
                      </div>
                      <ExternalLink size={14} style={{ color: 'var(--color-teal)' }} />
                    </a>

                    <a
                      href="https://www.nhis.gov.gh/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-3 transition-colors hover:opacity-80"
                      style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.2)' }}
                    >
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#92400e' }}>NHIS Ghana</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>National Health Insurance Scheme</p>
                      </div>
                      <ExternalLink size={14} style={{ color: '#b45309' }} />
                    </a>
                  </>
                )}

                {/* Disclaimer */}
                <div
                  className="rounded-xl p-3 mt-2"
                  style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
                >
                  <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    ⚠️ {data.disclaimer}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── InfoCard sub-component ────────────────────────────────────────────────────

const ACCENT_STYLES: Record<string, { bg: string; border: string; iconColor: string }> = {
  teal:   { bg: 'rgba(0,109,119,0.06)',   border: 'rgba(0,109,119,0.18)',   iconColor: 'var(--color-teal)' },
  green:  { bg: 'rgba(21,128,61,0.06)',   border: 'rgba(21,128,61,0.18)',   iconColor: '#15803d' },
  amber:  { bg: 'rgba(180,83,9,0.06)',    border: 'rgba(180,83,9,0.18)',    iconColor: '#b45309' },
  red:    { bg: 'rgba(185,28,28,0.06)',   border: 'rgba(185,28,28,0.18)',   iconColor: '#b91c1c' },
  blue:   { bg: 'rgba(29,78,216,0.06)',   border: 'rgba(29,78,216,0.18)',   iconColor: '#1d4ed8' },
  purple: { bg: 'rgba(109,40,217,0.06)',  border: 'rgba(109,40,217,0.18)',  iconColor: '#6d28d9' },
  pink:   { bg: 'rgba(190,24,93,0.06)',   border: 'rgba(190,24,93,0.18)',   iconColor: '#be185d' },
  gray:   { bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.18)', iconColor: '#6b7280' },
};

function InfoCard({
  icon, title, accent = 'teal', children, compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const style = ACCENT_STYLES[accent] ?? ACCENT_STYLES.teal;
  return (
    <div
      className={`rounded-xl ${compact ? 'p-2.5' : 'p-3'}`}
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: style.iconColor }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}
