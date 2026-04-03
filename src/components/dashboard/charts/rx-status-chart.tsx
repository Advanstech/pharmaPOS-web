'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useReducedMotion } from 'framer-motion';

interface RxStatusChartProps {
  pending: number;
  verified: number;
  completed?: number;
  height?: number;
  className?: string;
}

export function RxStatusChart({
  pending,
  verified,
  completed = 0,
  height = 200,
  className = '',
}: RxStatusChartProps) {
  const shouldReduceMotion = useReducedMotion();
  
  const data = useMemo(() => [
    { name: 'Pending', value: pending, color: '#d97706' }, // Amber
    { name: 'Verified', value: verified, color: '#2563eb' }, // Blue
    { name: 'Completed', value: completed, color: '#16a34a' }, // Green
  ], [pending, verified, completed]);

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--surface-border)" opacity={0.5} />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }}
            width={80}
          />
          <Tooltip
            cursor={{ fill: 'var(--surface-hover)', opacity: 0.5 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-surface-border bg-surface-card p-2 shadow-md">
                    <p className="font-mono text-sm font-bold" style={{ color: payload[0].payload.color }}>
                      {payload[0].value} <span className="text-xs font-normal text-content-muted">Rx</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
            isAnimationActive={!shouldReduceMotion}
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
