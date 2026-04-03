'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface StockPressureDialProps {
  lowSkuCount: number;
  /** Above this, dial reads as high pressure (full amber/red). */
  scaleAt?: number;
}

/** At-a-glance SKU attention dial — conic ring + center count with touch tooltip. */
export function StockPressureDial({ lowSkuCount, scaleAt = 45 }: StockPressureDialProps) {
  const pressure = Math.min(100, (lowSkuCount / scaleAt) * 100);
  const safe = Math.max(0, 100 - pressure);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative mx-auto w-fit pb-6">
      <button 
        className="relative flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full p-1 shadow-[0_12px_40px_rgba(0,109,119,0.12)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal active:scale-95"
        style={{
          background: `conic-gradient(from -90deg, #0f766e 0%, #0f766e ${safe}%, #f59e0b ${safe}%, #dc2626 100%)`,
        }}
        aria-label={`${lowSkuCount} products need stock attention. Click for details.`}
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(true)}
      >
        <div
          className="flex h-[calc(100%-10px)] w-[calc(100%-10px)] flex-col items-center justify-center rounded-full border border-white/5 relative"
          style={{
            background: 'var(--surface-card)',
            boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.06)',
          }}
        >
          <span className="font-mono text-3xl font-bold leading-none text-content-primary">{lowSkuCount}</span>
          <span className="mt-1 text-center text-[9px] font-bold uppercase tracking-wider text-content-muted flex items-center gap-1">
            SKU attention <Info size={10} className="opacity-50" />
          </span>
        </div>
      </button>

      {/* Tooltip that works on hover and touch */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 rounded-xl border border-surface-border bg-surface-card p-3 shadow-xl z-10 text-center animate-in fade-in slide-in-from-top-2">
          <p className="text-xs font-medium text-content-primary mb-1">
            {lowSkuCount} product{lowSkuCount !== 1 ? 's' : ''} at risk
          </p>
          <p className="text-[10px] text-content-secondary leading-relaxed">
            These SKUs are low, critical, or out of stock and require immediate supplier reordering to prevent revenue loss.
          </p>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-b-surface-card" />
        </div>
      )}
    </div>
  );
}
