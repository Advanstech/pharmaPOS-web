'use client';

import { Truck } from 'lucide-react';

interface SupplierPillProps {
  name: string;
  aiScore?: number | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#15803d';
  if (score >= 60) return '#b45309';
  return '#b91c1c';
}

export function SupplierPill({ name, aiScore }: SupplierPillProps) {
  return (
    <div
      className="flex items-center gap-1.5 mt-2"
      aria-label={`Supplier: ${name}${aiScore != null ? `, AI score ${aiScore}` : ''}`}
    >
      <Truck size={10} className="shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      <span
        className="text-[10px] truncate max-w-[90px]"
        style={{ color: 'var(--text-muted)' }}
      >
        {name}
      </span>
      {aiScore != null && (
        // Score: colour + number — never colour alone
        <span
          className="text-[10px] font-bold font-mono ml-auto shrink-0"
          style={{ color: scoreColor(aiScore) }}
        >
          {aiScore}
        </span>
      )}
    </div>
  );
}
