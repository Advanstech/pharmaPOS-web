'use client';

import { cn } from '@/lib/utils';

interface StockLevelGaugeProps {
  quantityOnHand: number;
  reorderLevel: number;
  className?: string;
  thin?: boolean;
}

/** Visual fill ratio: how close to reorder / stock-out (executive at-a-glance). */
export function StockLevelGauge({
  quantityOnHand,
  reorderLevel,
  className,
  thin,
}: StockLevelGaugeProps) {
  const cap = Math.max(reorderLevel * 2, quantityOnHand, 1);
  const ratio = Math.min(1, quantityOnHand / cap);
  const danger = quantityOnHand <= 0;
  const warn = !danger && quantityOnHand <= reorderLevel;

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn('overflow-hidden rounded-full', thin ? 'h-1' : 'h-2')}
        style={{ background: 'rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${ratio * 100}%`,
            background: danger
              ? 'linear-gradient(90deg, #7f1d1d, #dc2626)'
              : warn
                ? 'linear-gradient(90deg, #b45309, #f59e0b)'
                : 'linear-gradient(90deg, #0f766e, #2dd4bf)',
            boxShadow: '0 0 12px rgba(13,148,136,0.35)',
          }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] font-semibold uppercase tracking-wider opacity-70">
        <span style={{ color: 'var(--text-muted)' }}>Stock</span>
        <span style={{ color: warn || danger ? '#f59e0b' : 'var(--text-muted)' }}>
          {quantityOnHand} / ~{cap}
        </span>
      </div>
    </div>
  );
}
