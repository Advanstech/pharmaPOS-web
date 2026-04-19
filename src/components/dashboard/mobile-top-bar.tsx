'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, Stethoscope, ShoppingCart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { DASHBOARD_NAV } from '@/lib/auth/dashboard-nav';
import type { UserRole } from '@/types';

/**
 * Mobile top bar with hamburger menu — only visible on screens < md (768px).
 * Replaces the sidebar on mobile for better usability.
 */
export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const navItems = DASHBOARD_NAV.filter(item => item.roles.includes(user.role as UserRole));

  const handleSignOut = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <>
      {/* Top bar — only on mobile */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 shrink-0"
        style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)]" aria-label="Open menu">
            <Menu size={20} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'var(--color-teal)' }}>
              <Stethoscope size={12} className="text-white" />
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>PharmaPOS</span>
          </div>
        </div>
        <Link href="/pos" className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white" style={{ background: 'var(--color-teal)' }}>
          <ShoppingCart size={13} /> POS
        </Link>
      </div>

      {/* Slide-out drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <div className="relative w-64 h-full flex flex-col overflow-y-auto"
            style={{ background: 'var(--surface-card)', boxShadow: '4px 0 24px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--color-teal)' }}>
                  <Stethoscope size={14} className="text-white" />
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>PharmaPOS Pro</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[rgba(0,0,0,0.05)]" aria-label="Close menu">
                <X size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {navItems.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      background: active ? 'rgba(13,148,136,0.1)' : 'transparent',
                      color: active ? 'var(--color-teal)' : 'var(--text-secondary)',
                    }}>
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/pos" onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white mt-2"
                style={{ background: 'var(--color-teal)' }}>
                <ShoppingCart size={18} /> POS Terminal
              </Link>
            </nav>

            {/* User + sign out */}
            <div className="px-3 py-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--color-teal)' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{user.role.replace('_', ' ')}</p>
                </div>
              </div>
              <button onClick={handleSignOut}
                className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
