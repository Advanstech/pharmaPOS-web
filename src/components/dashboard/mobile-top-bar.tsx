'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ShoppingCart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { DASHBOARD_NAV } from '@/lib/auth/dashboard-nav';
import { roleForAccess } from '@/lib/auth/post-login-path';
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

  const accessRole = roleForAccess(user.role);
  const navItems = DASHBOARD_NAV.filter(item =>
    accessRole && item.roles.includes(accessRole as UserRole),
  );

  const handleSignOut = () => {
    clearAuth();
    router.replace('/login');
  };

  const close = () => setOpen(false);

  return (
    <>
      {/* Top bar — only on mobile */}
      <div
        className="md:hidden flex items-center justify-between px-3 py-2 shrink-0 h-12"
        style={{ background: 'var(--surface-card)', borderBottom: '1px solid var(--surface-border)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[rgba(0,0,0,0.06)] active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <Menu size={20} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden bg-white border border-emerald-100 shadow-sm p-0.5">
              <img src="/logo.png" alt="Azzay" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-bold leading-none block" style={{ color: 'var(--text-primary)' }}>
                {user.branchName || 'Azzay Pharmacy'}
              </span>
              {user.branchType && (
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide"
                  style={{ color: user.branchType === 'pharmaceutical' ? 'var(--color-teal)' : '#ea580c' }}
                >
                  {user.branchType === 'pharmaceutical' ? '💊 Pharmacy' : '🧪 Chemical'}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href="/pos"
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'var(--color-teal)' }}
        >
          <ShoppingCart size={13} /> POS
        </Link>
      </div>

      {/* Slide-out drawer with animation */}
      <AnimatePresence>
        {open && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
            />

            {/* Drawer panel */}
            <motion.div
              className="relative flex flex-col h-full overflow-hidden"
              style={{
                width: 280,
                background: 'var(--surface-card)',
                boxShadow: '6px 0 32px rgba(0,0,0,0.18)',
              }}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Drawer header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--surface-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-white border border-emerald-100 shadow-sm p-1">
                    <img src="/logo.png" alt="Azzay" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      Azzay Pharmacy Pro
                    </p>
                    <p className="text-[10px] truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>
                      {user.branchName || 'Branch'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[rgba(0,0,0,0.06)] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              {/* Nav items — scrollable */}
              <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
                {navItems.map((item, i) => {
                  const active =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.18 }}
                    >
                      <Link
                        href={item.href}
                        onClick={close}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97]"
                        style={{
                          background: active
                            ? 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))'
                            : 'transparent',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          boxShadow: active ? '0 2px 8px rgba(0,109,119,0.25)' : 'none',
                        }}
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}

                {/* POS shortcut */}
                <div className="pt-2">
                  <Link
                    href="/pos"
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: 'color-mix(in oklab, var(--color-teal) 12%, var(--surface-card) 88%)',
                      color: 'color-mix(in oklab, var(--color-teal-dark) 78%, #000 22%)',
                      border: '1px solid color-mix(in oklab, var(--color-teal) 38%, var(--surface-border) 62%)',
                    }}
                  >
                    <ShoppingCart size={17} />
                    POS Terminal
                  </Link>
                </div>
              </nav>

              {/* User footer */}
              <div
                className="shrink-0 px-3 py-3"
                style={{ borderTop: '1px solid var(--surface-border)' }}
              >
                <div className="flex items-center gap-2.5 px-1 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {user.name}
                    </p>
                    <p
                      className="text-[10px] capitalize truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {user.role.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
