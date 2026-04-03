'use client';

interface StockBarProps {
  quantityOnHand: number;
  reorderLevel: number;
}

export function StockBar({ quantityOnHand, reorderLevel }: StockBarProps) {
  const max = Math.max(reorderLevel * 2, quantityOnHand, 1);
  const pct = Math.min((quantityOnHand / max) * 100, 100);

  const isHigh = pct > 50;
  const isMid  = pct > 20 && pct <= 50;
  // Colour + text label — never colour alone
  const color = isHigh ? 'var(--color-stock-high)' : isMid ? 'var(--color-stock-mid)' : 'var(--color-stock-low)';
  const label = isHigh ? 'Good' : isMid ? 'Low' : 'Critical';

  return (
    <div className="mt-2.5" aria-label={`Stock: ${quantityOnHand} units — ${label}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-medium" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{quantityOnHand} units</span>
      </div>
      {/* 4px height per ui-ux spec */}
      <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
          role="progressbar"
          aria-valuenow={quantityOnHand}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
