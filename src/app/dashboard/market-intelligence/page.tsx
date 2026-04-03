'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PharmaMarketPulse } from '@/components/dashboard/pharma-market-pulse';

export default function MarketIntelligencePage() {
  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to overview
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Market &amp; health intelligence</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-content-secondary">
            Full briefing: rotating spotlight, categorized headlines, and outbound links for counselling context and supplier
            conversations. The overview dashboard shows only the compact live strip.
          </p>
        </div>
      </div>

      <PharmaMarketPulse layout="feature" />
    </div>
  );
}
