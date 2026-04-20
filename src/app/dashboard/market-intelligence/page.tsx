'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, HeartPulse, BrainCircuit, TrendingUp, AlertTriangle, GraduationCap } from 'lucide-react';
import { PharmaMarketPulse } from '@/components/dashboard/pharma-market-pulse';
import { DrugSearchIntelligence } from '@/components/ai/drug-search-intelligence';
import { MarketPricesTab } from '@/components/ai/market-prices-tab';
import { DiseaseAlertsTab } from '@/components/ai/disease-alerts-tab';
import { StaffLearningTab } from '@/components/ai/staff-learning-tab';

type Tab = 'pulse' | 'drug-intel' | 'market' | 'alerts' | 'learning';

const TABS: Array<{ id: Tab; label: string; icon: typeof HeartPulse; description: string; badge?: string }> = [
  {
    id: 'pulse',
    label: 'Health Pulse',
    icon: HeartPulse,
    description: 'WHO · BBC Health · industry signals',
  },
  {
    id: 'drug-intel',
    label: 'Drug Intelligence',
    icon: BrainCircuit,
    description: 'AI-powered drug monographs',
    badge: 'AI',
  },
  {
    id: 'market',
    label: 'Market Prices',
    icon: TrendingUp,
    description: 'Price trends & supplier intel',
  },
  {
    id: 'alerts',
    label: 'Disease Alerts',
    icon: AlertTriangle,
    description: 'WHO & Ghana Health Service',
  },
  {
    id: 'learning',
    label: 'Staff Learning',
    icon: GraduationCap,
    description: 'Drug education modules',
    badge: 'NEW',
  },
];

export default function MarketIntelligencePage() {
  const [activeTab, setActiveTab] = useState<Tab>('pulse');

  return (
    <div className="p-4 md:p-6 lg:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
          style={{ color: 'var(--color-teal)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to overview
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
              >
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  AI Market &amp; Health Intelligence
                </h1>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Drug intelligence · Market signals · Disease alerts · Staff learning
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
              style={{ background: 'rgba(0,109,119,0.08)', borderColor: 'rgba(0,109,119,0.25)', color: 'var(--color-teal-dark)' }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, icon: Icon, description, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex shrink-0 flex-col items-start gap-0.5 rounded-2xl px-4 py-3 text-left transition-all"
            style={
              activeTab === id
                ? {
                    background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(0,109,119,0.3)',
                  }
                : {
                    background: 'var(--surface-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--surface-border)',
                  }
            }
          >
            <div className="flex items-center gap-2">
              <Icon size={15} />
              <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
              {badge && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                  style={
                    activeTab === id
                      ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      : { background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)' }
                  }
                >
                  {badge}
                </span>
              )}
            </div>
            <span
              className="text-[10px] font-medium whitespace-nowrap"
              style={{ opacity: activeTab === id ? 0.8 : 0.6 }}
            >
              {description}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'pulse' && <PharmaMarketPulse layout="feature" />}
          {activeTab === 'drug-intel' && <DrugSearchIntelligence />}
          {activeTab === 'market' && <MarketPricesTab />}
          {activeTab === 'alerts' && <DiseaseAlertsTab />}
          {activeTab === 'learning' && <StaffLearningTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
