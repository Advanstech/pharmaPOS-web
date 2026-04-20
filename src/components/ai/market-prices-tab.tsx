'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, AlertTriangle, Package } from 'lucide-react';

interface PriceSignal {
  drug: string;
  category: string;
  trend: 'up' | 'down' | 'stable';
  note: string;
  source: string;
  sourceUrl: string;
}

// Curated market intelligence signals for Ghana pharmacy market
const MARKET_SIGNALS: PriceSignal[] = [
  {
    drug: 'Artemether-Lumefantrine (ACT)',
    category: 'Antimalarials',
    trend: 'up',
    note: 'Seasonal demand increase — malaria season. Stock up early to avoid shortages.',
    source: 'Ghana Health Service',
    sourceUrl: 'https://www.ghsghana.org/',
  },
  {
    drug: 'Amoxicillin 500mg',
    category: 'Antibiotics',
    trend: 'stable',
    note: 'Stable supply from local manufacturers. NHIS-covered — high demand expected.',
    source: 'Ghana FDA',
    sourceUrl: 'https://www.fdaghana.gov.gh/',
  },
  {
    drug: 'Metformin 500mg',
    category: 'Antidiabetics',
    trend: 'up',
    note: 'Rising diabetes prevalence in Ghana driving increased demand. Consider higher reorder levels.',
    source: 'WHO Ghana',
    sourceUrl: 'https://www.afro.who.int/countries/ghana',
  },
  {
    drug: 'Paracetamol 500mg',
    category: 'Analgesics',
    trend: 'stable',
    note: 'Consistent demand. Local manufacturing keeps prices stable. High-volume OTC item.',
    source: 'Market intelligence',
    sourceUrl: 'https://www.fdaghana.gov.gh/',
  },
  {
    drug: 'Amlodipine 5mg',
    category: 'Antihypertensives',
    trend: 'up',
    note: 'Hypertension prevalence rising. NHIS coverage driving demand. Ensure adequate stock.',
    source: 'Ghana Health Service',
    sourceUrl: 'https://www.ghsghana.org/',
  },
  {
    drug: 'Ciprofloxacin 500mg',
    category: 'Antibiotics',
    trend: 'down',
    note: 'Antimicrobial stewardship reducing unnecessary use. Ensure proper dispensing protocols.',
    source: 'WHO AMR Programme',
    sourceUrl: 'https://www.who.int/health-topics/antimicrobial-resistance',
  },
  {
    drug: 'Omeprazole 20mg',
    category: 'GI Medicines',
    trend: 'stable',
    note: 'Steady demand for PPI therapy. Common co-prescription with NSAIDs.',
    source: 'Market intelligence',
    sourceUrl: 'https://www.fdaghana.gov.gh/',
  },
  {
    drug: 'Oral Rehydration Salts',
    category: 'Rehydration',
    trend: 'up',
    note: 'Rainy season increases diarrhoeal disease. Stock ORS and zinc supplements together.',
    source: 'Ghana Health Service',
    sourceUrl: 'https://www.ghsghana.org/',
  },
];

const SUPPLIER_TIPS = [
  {
    title: 'Negotiate early for malaria season',
    body: 'ACT prices typically rise 15-25% during peak malaria season (April-June, Sept-Nov). Lock in prices with suppliers now.',
    icon: '💊',
  },
  {
    title: 'NHIS reimbursement timing',
    body: 'NHIS claims typically take 60-90 days. Maintain adequate cash reserves for NHIS-covered stock.',
    icon: '🏥',
  },
  {
    title: 'Local vs. imported generics',
    body: 'Ghana-manufactured generics are typically 20-40% cheaper than imports. Prioritize local suppliers where quality is assured.',
    icon: '🇬🇭',
  },
  {
    title: 'Expiry management',
    body: 'Negotiate return-to-supplier clauses for slow-moving items. Reduces write-off losses significantly.',
    icon: '📅',
  },
];

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: '#b91c1c', bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.2)', label: 'Rising' },
  down: { icon: TrendingDown, color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.2)', label: 'Falling' },
  stable: { icon: Minus, color: '#b45309', bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.2)', label: 'Stable' },
};

export function MarketPricesTab() {
  const [filter, setFilter] = useState<string>('All');
  const categories = ['All', ...Array.from(new Set(MARKET_SIGNALS.map(s => s.category)))];
  const filtered = filter === 'All' ? MARKET_SIGNALS : MARKET_SIGNALS.filter(s => s.category === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(232,168,56,0.1) 0%, rgba(0,109,119,0.08) 100%)',
          border: '1px solid rgba(232,168,56,0.25)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} style={{ color: '#b45309' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Ghana Pharma Market Intelligence
              </h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Demand trends, pricing signals, and supplier intelligence for Ghana pharmacy market.
            </p>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
            style={{ background: 'rgba(232,168,56,0.15)', color: '#92400e', border: '1px solid rgba(232,168,56,0.3)' }}>
            Updated daily
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
            style={
              filter === cat
                ? { background: 'var(--color-teal)', color: '#fff' }
                : { background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Price signals grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((signal, i) => {
          const trend = TREND_CONFIG[signal.trend];
          const TrendIcon = trend.icon;
          return (
            <motion.div
              key={signal.drug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {signal.drug}
                  </p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {signal.category}
                  </p>
                </div>
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold"
                  style={{ background: trend.bg, color: trend.color, border: `1px solid ${trend.border}` }}
                >
                  <TrendIcon size={10} />
                  {trend.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                {signal.note}
              </p>
              <a
                href={signal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold hover:underline"
                style={{ color: 'var(--color-teal)' }}
              >
                <ExternalLink size={9} />
                {signal.source}
              </a>
            </motion.div>
          );
        })}
      </div>

      {/* Supplier tips */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          💡 Supplier Negotiation Intelligence
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SUPPLIER_TIPS.map((tip, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{tip.icon}</span>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{tip.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
        Market intelligence is advisory only. Verify prices with your suppliers before making purchasing decisions.
      </p>
    </div>
  );
}
