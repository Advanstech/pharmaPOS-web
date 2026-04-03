'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface ReportsRevenueVisualProps {
  currentPesewas: number;
  previousPesewas: number;
  height?: number;
}

export function ReportsRevenueVisual({
  currentPesewas,
  previousPesewas,
  height = 120,
}: ReportsRevenueVisualProps) {
  const data = [
    { name: 'Prior', value: Math.max(0, previousPesewas / 100) },
    { name: 'Period', value: Math.max(0, currentPesewas / 100) },
  ];
  const max = Math.max(data[0].value, data[1].value, 1);

  return (
    <div style={{ width: '100%', height }} className="font-sans">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide domain={[0, max * 1.15]} />
          <Tooltip
            formatter={(v: number) => [`GH₵ ${v.toFixed(2)}`, 'Revenue']}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
            wrapperStyle={{ outline: 'none' }}
          />
          {/* activeBar off: Recharts default hover fill is near-white and hid the prior bar on dark theme */}
          <Bar dataKey="value" radius={[8, 8, 4, 4]} maxBarSize={48} activeBar={false}>
            <Cell fill="var(--chart-prior-revenue)" stroke="var(--chart-prior-revenue-stroke)" strokeWidth={1} />
            <Cell fill="url(#barGradExec)" stroke="rgba(15, 118, 110, 0.35)" strokeWidth={1} />
          </Bar>
          <defs>
            <linearGradient id="barGradExec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
