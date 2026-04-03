'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/lib/store/theme.store';
import { cn } from '@/lib/utils';

const OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  Icon: typeof Sun;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright surfaces for daytime counters and back office.',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-glare panels aligned with your current dashboard default.',
    Icon: Moon,
  },
  {
    value: 'system',
    label: 'Match device',
    description: 'Follow iOS / Android / desktop light or dark mode automatically.',
    Icon: Monitor,
  },
];

export default function DashboardSettingsPage() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Appearance and display preferences for this browser.
      </p>

      <section
        className="mt-8 max-w-lg rounded-2xl border p-5"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}
      >
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Theme
        </h2>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          PharmaPOS uses teal brand tokens in both light and dark. Your choice is saved on this device only (not synced to
          the server).
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {OPTIONS.map(({ value, label, description, Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all',
                  selected ? 'ring-2 ring-teal/40' : 'hover:border-teal/25',
                )}
                style={{
                  borderColor: selected ? 'var(--color-teal)' : 'var(--surface-border)',
                  background: selected ? 'rgba(0,109,119,0.06)' : 'var(--surface-base)',
                }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: selected ? 'rgba(0,109,119,0.15)' : 'var(--surface-hover)',
                    color: 'var(--color-teal)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
