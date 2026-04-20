'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BrainCircuit, Pill, AlertTriangle, ShieldCheck,
  Heart, Baby, Thermometer, BookOpen, ExternalLink, Sparkles,
  Loader2, MessageSquare, RefreshCw,
} from 'lucide-react';
import type { DrugIntelligence } from '@/app/api/drug-intelligence/route';

const QUICK_SEARCHES = [
  'Amoxicillin', 'Paracetamol', 'Metformin', 'Amlodipine',
  'Artemether-Lumefantrine', 'Omeprazole', 'Ciprofloxacin', 'Ibuprofen',
  'Atorvastatin', 'Lisinopril', 'Azithromycin', 'Metronidazole',
];

type Section = 'overview' | 'dosage' | 'safety' | 'counselling' | 'ghana';

const SECTIONS: Array<{ id: Section; label: string; icon: typeof Pill }> = [
  { id: 'overview', label: 'Overview', icon: Pill },
  { id: 'dosage', label: 'Dosage', icon: Thermometer },
  { id: 'safety', label: 'Safety', icon: ShieldCheck },
  { id: 'counselling', label: 'Counselling', icon: MessageSquare },
  { id: 'ghana', label: 'Ghana', icon: Heart },
];

export function DrugSearchIntelligence() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<DrugIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [history, setHistory] = useState<string[]>([]);

  const search = useCallback(async (drugName: string) => {
    if (!drugName.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setActiveSection('overview');
    try {
      const res = await fetch('/api/drug-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: drugName.trim(), genericName: '', classification: 'OTC' }),
      });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json() as DrugIntelligence;
      setData(json);
      setHistory(prev => [drugName, ...prev.filter(h => h.toLowerCase() !== drugName.toLowerCase())].slice(0, 8));
    } catch {
      setError('Could not load drug intelligence. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(query);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(0,109,119,0.1) 0%, rgba(232,168,56,0.08) 100%)',
          border: '1px solid rgba(0,109,119,0.2)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, var(--color-teal) 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
            >
              <BrainCircuit size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Drug Intelligence Search
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Ask about any drug — indications, dosage, interactions, counselling
              </p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
              style={{ background: 'rgba(0,109,119,0.12)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
              <Sparkles size={9} /> GPT-4o
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search any drug — e.g. Amoxicillin, Metformin, Artemether..."
                className="w-full rounded-xl py-3 pl-9 pr-4 text-sm font-medium outline-none transition-all"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </form>

          {/* Quick searches */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_SEARCHES.map(drug => (
              <button
                key={drug}
                onClick={() => { setQuery(drug); void search(drug); }}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-all hover:opacity-80"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-secondary)',
                }}
              >
                {drug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent searches */}
      {history.length > 0 && !data && !loading && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Recent searches
          </p>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <button
                key={h}
                onClick={() => { setQuery(h); void search(h); }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}
              >
                <BookOpen size={10} />
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-2 border-teal/20 border-t-teal animate-spin" />
            <BrainCircuit size={20} className="absolute inset-0 m-auto text-teal" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Generating drug intelligence…
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              GPT-4o is analysing clinical data for {query}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.2)' }}>
          <AlertTriangle size={28} className="mx-auto mb-3" style={{ color: '#b91c1c' }} />
          <p className="text-sm font-semibold" style={{ color: '#b91c1c' }}>{error}</p>
          <button
            onClick={() => void search(query)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--color-teal)' }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Drug header */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(0,109,119,0.08) 0%, rgba(232,168,56,0.06) 100%)',
              border: '1px solid rgba(0,109,119,0.2)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.name}</h3>
                {data.genericName !== data.name && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{data.genericName}</p>
                )}
                <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {data.whatItDoes}
                </p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                style={{
                  background: data.classification === 'POM' ? 'rgba(180,83,9,0.1)' : data.classification === 'CONTROLLED' ? 'rgba(185,28,28,0.1)' : 'rgba(21,128,61,0.1)',
                  color: data.classification === 'POM' ? '#b45309' : data.classification === 'CONTROLLED' ? '#b91c1c' : '#15803d',
                  border: `1px solid ${data.classification === 'POM' ? 'rgba(180,83,9,0.25)' : data.classification === 'CONTROLLED' ? 'rgba(185,28,28,0.25)' : 'rgba(21,128,61,0.25)'}`,
                }}
              >
                {data.classification}
              </span>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                style={
                  activeSection === id
                    ? { background: 'var(--color-teal)', color: '#fff' }
                    : { background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }
                }
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Section content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              {activeSection === 'overview' && (
                <>
                  <InfoBlock title="Mechanism of action" icon={<BrainCircuit size={13} />} accent="purple">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{data.mechanism}</p>
                  </InfoBlock>
                  <InfoBlock title="Indications" icon={<BookOpen size={13} />} accent="green">
                    <ul className="space-y-1">
                      {data.indications.map((ind, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </InfoBlock>
                  <div className="flex flex-wrap gap-2">
                    {data.learnMoreLinks.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                        style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
                        <ExternalLink size={10} /> {link.label}
                      </a>
                    ))}
                  </div>
                </>
              )}

              {activeSection === 'dosage' && (
                <>
                  <InfoBlock title="Adult dose" icon={<Pill size={13} />} accent="teal">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.adultDose}</p>
                  </InfoBlock>
                  {data.pediatricDose && (
                    <InfoBlock title="Pediatric dose" icon={<Baby size={13} />} accent="blue">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.pediatricDose}</p>
                    </InfoBlock>
                  )}
                  {data.renalAdjustment && (
                    <InfoBlock title="Renal dose adjustment" icon={<AlertTriangle size={13} />} accent="amber">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.renalAdjustment}</p>
                    </InfoBlock>
                  )}
                  {data.foodInteractions && (
                    <InfoBlock title="Food & drink interactions" icon={<AlertTriangle size={13} />} accent="amber">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.foodInteractions}</p>
                    </InfoBlock>
                  )}
                  <InfoBlock title="Storage conditions" icon={<Thermometer size={13} />} accent="gray">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.storageConditions}</p>
                  </InfoBlock>
                </>
              )}

              {activeSection === 'safety' && (
                <>
                  <InfoBlock title="Common side effects" icon={<AlertTriangle size={13} />} accent="amber">
                    <ul className="space-y-1">
                      {data.commonSideEffects.map((se, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          {se}
                        </li>
                      ))}
                    </ul>
                  </InfoBlock>
                  {data.seriousSideEffects.length > 0 && (
                    <InfoBlock title="Serious side effects — report immediately" icon={<AlertTriangle size={13} />} accent="red">
                      <ul className="space-y-1">
                        {data.seriousSideEffects.map((se, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#b91c1c' }}>
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                            {se}
                          </li>
                        ))}
                      </ul>
                    </InfoBlock>
                  )}
                  <InfoBlock title="Contraindications" icon={<ShieldCheck size={13} />} accent="red">
                    <ul className="space-y-1">
                      {data.contraindications.map((ci, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                          {ci}
                        </li>
                      ))}
                    </ul>
                  </InfoBlock>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBlock title="Pregnancy" icon={<Heart size={13} />} accent="pink">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{data.pregnancySafety}</p>
                    </InfoBlock>
                    <InfoBlock title="Breastfeeding" icon={<Baby size={13} />} accent="blue">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{data.lactationSafety}</p>
                    </InfoBlock>
                  </div>
                </>
              )}

              {activeSection === 'counselling' && (
                <>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.15)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-teal-dark)' }}>
                      💬 Key points to communicate to the patient or customer
                    </p>
                  </div>
                  <div className="space-y-2">
                    {data.counsellingPoints.map((point, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-xl p-3"
                        style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: 'var(--color-teal)' }}>
                          {i + 1}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{point}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeSection === 'ghana' && (
                <>
                  <InfoBlock title="NHIS Coverage Status" icon={<ShieldCheck size={13} />} accent="green">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{data.nhisStatus}</p>
                  </InfoBlock>
                  {data.localAlternatives.length > 0 && (
                    <InfoBlock title="Local brand alternatives in Ghana" icon={<Pill size={13} />} accent="teal">
                      <div className="flex flex-wrap gap-2">
                        {data.localAlternatives.map((alt, i) => (
                          <span key={i} className="rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
                            {alt}
                          </span>
                        ))}
                      </div>
                    </InfoBlock>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <a href="https://www.fdaghana.gov.gh/" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-3 transition-colors hover:opacity-80"
                      style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.2)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-teal-dark)' }}>Ghana FDA</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Drug regulator</p>
                      </div>
                      <ExternalLink size={13} style={{ color: 'var(--color-teal)' }} />
                    </a>
                    <a href="https://www.nhis.gov.gh/" target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl p-3 transition-colors hover:opacity-80"
                      style={{ background: 'rgba(232,168,56,0.06)', border: '1px solid rgba(232,168,56,0.2)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#92400e' }}>NHIS Ghana</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Insurance scheme</p>
                      </div>
                      <ExternalLink size={13} style={{ color: '#b45309' }} />
                    </a>
                  </div>
                </>
              )}

              {/* Disclaimer */}
              <div className="rounded-xl p-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  ⚠️ {data.disclaimer}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

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

function InfoBlock({ icon, title, accent = 'teal', children }: {
  icon: React.ReactNode; title: string; accent?: string; children: React.ReactNode;
}) {
  const s = ACCENT_STYLES[accent] ?? ACCENT_STYLES.teal;
  return (
    <div className="rounded-xl p-3.5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="flex items-center gap-1.5 mb-2" style={{ color: s.iconColor }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}
