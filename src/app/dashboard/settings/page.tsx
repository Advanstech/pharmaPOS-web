'use client';

import { Monitor, Moon, Sun, ZoomIn, Smartphone, Wifi, WifiOff, Database } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/lib/store/theme.store';
import { useZoomStore, type ZoomLevel } from '@/lib/store/zoom.store';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getPendingSales, db } from '@/lib/db/offline.db';

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; description: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', description: 'Bright surfaces for daytime counters and back office.', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-glare panels for night shifts and dim environments.', Icon: Moon },
  { value: 'system', label: 'Match device', description: 'Follow your device light or dark mode automatically.', Icon: Monitor },
];

const ZOOM_OPTIONS: Array<{ value: ZoomLevel; label: string; description: string }> = [
  { value: '90', label: '90%', description: 'Compact — fits more on screen' },
  { value: '100', label: '100%', description: 'Default — standard display size' },
  { value: '110', label: '110%', description: 'Comfortable — easier to read' },
  { value: '120', label: '120%', description: 'Large — great for touch screens' },
  { value: '130', label: '130%', description: 'Extra large — maximum readability' },
];

export default function DashboardSettingsPage() {
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);
  const zoom = useZoomStore(s => s.zoom);
  const setZoom = useZoomStore(s => s.setZoom);
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedProducts, setCachedProducts] = useState(0);

  useEffect(() => {
    getPendingSales().then(s => setPendingCount(s.length));
    db.products.count().then(c => setCachedProducts(c));
  }, []);

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Appearance, display, and device preferences. Saved locally on this device.
      </p>

      <div className="mt-8 max-w-2xl space-y-6">
        {/* ── Theme ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Theme</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Choose light for daytime, dark for night shifts. Teal brand tokens work in both.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
              const selected = theme === value;
              return (
                <button key={value} type="button" onClick={() => setTheme(value)}
                  className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all', selected ? 'ring-2 ring-teal/40' : 'hover:border-teal/25')}
                  style={{ borderColor: selected ? 'var(--color-teal)' : 'var(--surface-border)', background: selected ? 'rgba(0,109,119,0.06)' : 'var(--surface-base)' }}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: selected ? 'rgba(0,109,119,0.15)' : 'var(--surface-hover)', color: 'var(--color-teal)' }}>
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-muted)' }}>{description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Display Zoom ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-1">
            <ZoomIn size={16} style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Display Zoom</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Increase the display size for large touch screens or night shifts. Recommended: 110% for pharmacy counters, 120% for wall-mounted displays.
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {ZOOM_OPTIONS.map(opt => {
              const selected = zoom === opt.value;
              return (
                <button key={opt.value} type="button" onClick={() => setZoom(opt.value)}
                  className={cn('rounded-xl border p-3 text-center transition-all', selected ? 'ring-2 ring-teal/40' : 'hover:border-teal/25')}
                  style={{ borderColor: selected ? 'var(--color-teal)' : 'var(--surface-border)', background: selected ? 'rgba(0,109,119,0.06)' : 'var(--surface-base)' }}>
                  <p className="text-lg font-bold font-mono" style={{ color: selected ? 'var(--color-teal)' : 'var(--text-primary)' }}>{opt.label}</p>
                  <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>{opt.description.split(' — ')[0]}</p>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Current: {zoom}% &middot; Changes apply instantly. Refresh if layout looks off.
          </p>
        </section>

        {/* ── Offline & Sync Status ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-1">
            {isOnline ? <Wifi size={16} style={{ color: '#16a34a' }} /> : <WifiOff size={16} style={{ color: '#dc2626' }} />}
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Offline & Sync</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            PharmaPOS works offline for cash sales. Transactions queue locally and sync when connection returns.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background: isOnline ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)', border: '1px solid ' + (isOnline ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)') }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Status</p>
              <p className="text-sm font-bold mt-1" style={{ color: isOnline ? '#16a34a' : '#dc2626' }}>{isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Queued Sales</p>
              <p className="text-sm font-bold mt-1" style={{ color: pendingCount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>{pendingCount}</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Cached Products</p>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{cachedProducts}</p>
            </div>
          </div>
          <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Product cache warms automatically on login. Offline sales use cash only (MoMo disabled). Queued sales sync with idempotency keys to prevent duplicates.
          </p>
        </section>

        {/* ── Mobile ── */}
        <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} style={{ color: 'var(--color-teal)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Mobile & Tablet</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            PharmaPOS is optimized for tablets and phones. The POS terminal has a floating cart button on mobile. Dashboard pages stack vertically on smaller screens.
          </p>
          <div className="mt-3 text-[10px] space-y-1" style={{ color: 'var(--text-muted)' }}>
            <p>&bull; POS: Floating cart button on mobile, slide-up drawer for checkout</p>
            <p>&bull; Dashboard: Responsive grid, cards stack on small screens</p>
            <p>&bull; Sidebar: Collapsible on mobile with hamburger menu</p>
            <p>&bull; Touch targets: Minimum 44px for all interactive elements</p>
          </div>
        </section>
      </div>
    </div>
  );
}
