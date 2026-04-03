'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number;
  deltaLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({
  label,
  value,
  format = (n) => n.toLocaleString('en-GH'),
  delta,
  deltaLabel,
  icon,
  className,
}: KpiCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  // Number spring counting on dashboard KPI cards (ui-ux rule)
  const rounded = useTransform(motionValue, (v) => format(Math.round(v)));
  const prevRef = useRef(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      motionValue.set(value);
      return;
    }
    const controls = animate(prevRef.current, value, {
      duration: 1.2,
      type: 'spring',
      stiffness: 60,
      damping: 20,
      onUpdate: (v) => motionValue.set(v),
    });
    prevRef.current = value;
    return controls.stop;
  }, [value, motionValue, shouldReduceMotion]);

  const positive = delta !== undefined && delta >= 0;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className={cn('rounded-2xl p-5', className)}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </p>
        {icon && (
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal)' }}
          >
            {icon}
          </span>
        )}
      </div>

      <motion.p
        className="font-mono text-2xl font-bold leading-none"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
      >
        {rounded}
      </motion.p>

      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {positive
            ? <TrendingUp size={12} style={{ color: '#15803d' }} />
            : <TrendingDown size={12} style={{ color: '#b91c1c' }} />
          }
          <p
            className="text-xs font-semibold"
            style={{ color: positive ? '#15803d' : '#b91c1c' }}
          >
            {positive ? '+' : ''}{Math.abs(delta).toFixed(1)}%
          </p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {deltaLabel ?? 'vs last month'}
          </span>
        </div>
      )}
    </motion.div>
  );
}
