'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SupplierHealthDonutProps {
  out: number;
  critical: number;
  low: number;
  ok: number;
  height?: number;
}

const COLORS = {
  out: '#7f1d1d',
  critical: '#dc2626',
  low: '#d97706',
  ok: '#0f766e',
};

export function SupplierHealthDonut({ out, critical, low, ok, height = 200 }: SupplierHealthDonutProps) {
  const data = [
    { name: 'Out', value: out, color: COLORS.out },
    { name: 'Critical', value: critical, color: COLORS.critical },
    { name: 'Low', value: low, color: COLORS.low },
    { name: 'Healthy', value: ok, color: COLORS.ok },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border text-xs font-medium"
        style={{ height, borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
      >
        No SKU issues in view
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }} className="min-h-[160px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={72}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [v, name]}
            contentStyle={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
