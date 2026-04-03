'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatGhs } from '@/lib/utils';
import { useReducedMotion } from 'framer-motion';

interface SalesTrendChartProps {
  data?: Array<{ time: string; amount: number }>;
  height?: number;
  color?: string;
  gradientId?: string;
  className?: string;
}

// Generate some mock data for the modern chart since the real API only gives us daily total
// In a real implementation, we'd fetch time-series data from the backend
const generateMockTrendData = () => {
  const data = [];
  const now = new Date();
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: d.toLocaleTimeString('en-GH', { hour: 'numeric', minute: '2-digit' }),
      amount: Math.floor(Math.random() * 500) + 100, // Random amount between 100 and 600 GHS
    });
  }
  return data;
};

export function SalesTrendChart({
  data,
  height = 200,
  color = 'var(--color-teal)',
  gradientId = 'colorSales',
  className = '',
}: SalesTrendChartProps) {
  const shouldReduceMotion = useReducedMotion();
  const chartData = useMemo(() => data || generateMockTrendData(), [data]);

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-border)" opacity={0.5} />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(val) => `GH₵${val}`}
            dx={-10}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-surface-border bg-surface-card p-3 shadow-lg">
                    <p className="mb-1 text-[10px] font-bold uppercase text-content-muted">{label}</p>
                    <p className="font-mono text-sm font-bold text-content-primary">
                      {formatGhs(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
