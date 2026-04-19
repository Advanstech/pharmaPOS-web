'use client';

import { Monitor, Moon, Sun, ZoomIn, Smartphone, Wifi, WifiOff, Database, Receipt, AlertTriangle, CheckCircle } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/lib/store/theme.store';
import { useZoomStore, type ZoomLevel } from '@/lib/store/zoom.store';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getPendingSales, db } from '@/lib/db/offline.db';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TAX_CONFIG, UPDATE_TAX_CONFIG } from '@/lib/graphql/tax-config';
import { useAuthStore } from '@/lib/store/auth.store';

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

        {/* ── Tax Configuration ── */}
        <TaxConfigSection />
      </div>
    </div>
  );
}

function TaxConfigSection() {
  const user = useAuthStore(s => s.user);
  const canEdit = user && ['owner', 'se_admin', 'manager'].includes(user.role);

  const { data, loading, refetch } = useQuery(GET_TAX_CONFIG, { fetchPolicy: 'cache-and-network' });
  const [updateTaxConfig, { loading: saving }] = useMutation(UPDATE_TAX_CONFIG, { onCompleted: () => refetch() });

  const tax = data?.taxConfig;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ vatRate: '', nhilRate: '', getfundRate: '', covidLevyRate: '' });
  const [applyOtc, setApplyOtc] = useState(true);
  const [applyPom, setApplyPom] = useState(false);
  const [applyControlled, setApplyControlled] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tax) {
      setForm({
        vatRate: (tax.vatRate * 100).toFixed(2),
        nhilRate: (tax.nhilRate * 100).toFixed(2),
        getfundRate: (tax.getfundRate * 100).toFixed(2),
        covidLevyRate: (tax.covidLevyRate * 100).toFixed(2),
      });
      setApplyOtc(tax.applyVatOnOtc);
      setApplyPom(tax.applyVatOnPom);
      setApplyControlled(tax.applyVatOnControlled);
    }
  }, [tax]);

  const handleSave = async () => {
    try {
      await updateTaxConfig({
        variables: {
          input: {
            vatRate: parseFloat(form.vatRate) / 100,
            nhilRate: parseFloat(form.nhilRate) / 100,
            getfundRate: parseFloat(form.getfundRate) / 100,
            covidLevyRate: parseFloat(form.covidLevyRate) / 100,
            applyVatOnOtc: applyOtc,
            applyVatOnPom: applyPom,
            applyVatOnControlled: applyControlled,
          },
        },
      });
      setEditing(false);
      setSaveMsg('Tax configuration saved');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveMsg('Error: ' + (e?.message || 'Save failed'));
    }
  };

  const totalPreview = (
    (parseFloat(form.vatRate) || 0) +
    (parseFloat(form.nhilRate) || 0) +
    (parseFloat(form.getfundRate) || 0) +
    (parseFloat(form.covidLevyRate) || 0)
  ).toFixed(2);

  return (
    <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Receipt size={16} style={{ color: 'var(--color-teal)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Tax Configuration</h2>
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs font-bold text-teal hover:underline">Edit</button>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Ghana GRA standard: 12.5% VAT + 2.5% NHIL = 15% total. POM medicines are VAT exempt by default.
      </p>

      {saveMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: saveMsg.startsWith('Error') ? 'rgba(220,38,38,0.07)' : 'rgba(22,163,74,0.07)', color: saveMsg.startsWith('Error') ? '#dc2626' : '#16a34a', border: '1px solid ' + (saveMsg.startsWith('Error') ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)') }}>
          {saveMsg.startsWith('Error') ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
          {saveMsg}
        </div>
      )}

      {loading && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</p>}

      {tax && !editing && (
        <div className="space-y-3">
          {/* Rate display */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'VAT (GRA)', value: tax.vatRatePct, desc: 'Standard rate' },
              { label: 'NHIL', value: tax.nhilRatePct, desc: 'Health insurance levy' },
              { label: 'GetFund', value: tax.getfundRatePct, desc: 'Education levy' },
              { label: 'COVID-19', value: tax.covidLevyRatePct, desc: 'Special levy' },
            ].map(r => (
              <div key={r.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
                <p className="text-lg font-bold font-mono mt-0.5" style={{ color: 'var(--color-teal)' }}>{r.value}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{r.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total Effective Rate</span>
            <span className="text-xl font-bold font-mono" style={{ color: 'var(--color-teal)' }}>{tax.totalRatePct}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: tax.applyVatOnOtc ? 'rgba(13,148,136,0.1)' : 'rgba(220,38,38,0.08)', color: tax.applyVatOnOtc ? '#0d9488' : '#dc2626' }}>
              OTC: {tax.applyVatOnOtc ? 'Taxable' : 'Exempt'}
            </span>
            <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: tax.applyVatOnPom ? 'rgba(13,148,136,0.1)' : 'rgba(220,38,38,0.08)', color: tax.applyVatOnPom ? '#0d9488' : '#dc2626' }}>
              POM: {tax.applyVatOnPom ? 'Taxable' : 'Exempt'}
            </span>
            <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: tax.applyVatOnControlled ? 'rgba(13,148,136,0.1)' : 'rgba(220,38,38,0.08)', color: tax.applyVatOnControlled ? '#0d9488' : '#dc2626' }}>
              Controlled: {tax.applyVatOnControlled ? 'Taxable' : 'Exempt'}
            </span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Last updated: {tax.updatedAt ? new Date(tax.updatedAt).toLocaleString('en-GH') : '—'}
          </p>
        </div>
      )}

      {editing && (
        <div className="space-y-4">
          {/* Rate inputs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: 'vatRate', label: 'VAT %', desc: 'Standard: 12.5%' },
              { key: 'nhilRate', label: 'NHIL %', desc: 'Standard: 2.5%' },
              { key: 'getfundRate', label: 'GetFund %', desc: 'Standard: 0%' },
              { key: 'covidLevyRate', label: 'COVID-19 %', desc: 'Standard: 0%' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
                <input type="number" step="0.01" min="0" max="100"
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded-lg border px-2.5 py-2 text-sm font-mono"
                  style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }} />
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Total preview */}
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total Preview</span>
            <span className="text-xl font-bold font-mono" style={{ color: 'var(--color-teal)' }}>{totalPreview}%</span>
          </div>

          {/* Exemptions */}
          <div>
            <p className="text-[10px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Apply VAT to:</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'OTC Products', value: applyOtc, set: setApplyOtc },
                { label: 'POM Medicines', value: applyPom, set: setApplyPom },
                { label: 'Controlled Drugs', value: applyControlled, set: setApplyControlled },
              ].map(opt => (
                <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={opt.value} onChange={e => opt.set(e.target.checked)}
                    className="rounded border-surface-border" />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Ghana GRA: POM and Controlled medicines are VAT exempt. OTC products are taxable.
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--color-teal)' }}>
              {saving ? 'Saving...' : 'Save Tax Config'}
            </button>
            <button onClick={() => setEditing(false)}
              className="rounded-xl border px-4 py-2 text-xs font-semibold"
              style={{ borderColor: 'var(--surface-border)', color: 'var(--text-secondary)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
