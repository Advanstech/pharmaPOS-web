'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { ShoppingCart, LogOut, Stethoscope, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth.store';
import { DASHBOARD_NAV } from '@/lib/auth/dashboard-nav';
import { roleForAccess } from '@/lib/auth/post-login-path';
import { useRef, useState } from 'react';
import { useNestedLenis } from '@/lib/lenis/use-nested-lenis';
import { BranchSwitcher } from '@/components/dashboard/branch-switcher';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navScrollRef = useRef<HTMLElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const accessRole = user ? roleForAccess(user.role) : null;
  const visibleNav = DASHBOARD_NAV.filter((item) => accessRole && item.roles.includes(accessRole));

  useNestedLenis(navScrollRef, navListRef, {
    enabled: !prefersReducedMotion,
    layoutKey: visibleNav.length,
    syncTouch: true,
  });

  function handleSignOut() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <aside
      className={cn(
        'relative z-40 flex h-screen min-h-0 shrink-0 flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-20 md:w-56',
      )}
      style={{
        background:
          'linear-gradient(180deg, color-mix(in oklab, var(--surface-card) 88%, var(--color-teal) 12%) 0%, var(--surface-card) 42%, color-mix(in oklab, var(--surface-card) 90%, #000 10%) 100%)',
        borderRight: '1px solid color-mix(in oklab, var(--surface-border) 70%, var(--color-teal-dark) 30%)',
      }}
    >
      {/* Collapse Toggle Button (Desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex absolute -right-3 top-6 w-6 h-6 border border-surface-border rounded-full items-center justify-center text-content-secondary hover:text-teal hover:border-teal transition-colors shadow-sm z-50"
        style={{ background: 'var(--surface-card)' }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center transition-all',
          collapsed ? "justify-center px-0" : "justify-center md:justify-start md:px-4"
        )}
        style={{ borderBottom: '1px solid var(--surface-border)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))',
            boxShadow: '0 2px 10px rgba(0,78,87,0.35)',
          }}
        >
          <Stethoscope size={14} className="text-white" />
        </div>
        <div className={cn("min-w-0 ml-2.5 transition-opacity duration-200", collapsed ? "hidden" : "hidden md:block")}>
          <p className="text-sm font-bold leading-none truncate" style={{ color: 'color-mix(in oklab, var(--text-primary) 86%, #000 14%)' }}>
            PharmaPOS Pro
          </p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'color-mix(in oklab, var(--text-secondary) 88%, #000 12%)' }}>
            {user?.branchName || 'Azzay Pharmacy'}
          </p>
          {user?.branchType && (
            <span className="inline-flex items-center mt-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
              style={{
                background: user.branchType === 'pharmaceutical' ? 'rgba(13,148,136,0.12)' : 'rgba(234,88,12,0.12)',
                color: user.branchType === 'pharmaceutical' ? '#0d9488' : '#ea580c',
              }}>
              {user.branchType === 'pharmaceutical' ? '💊 Pharmacy' : '🧪 Chemical'}
            </span>
          )}
        </div>
      </div>

      {/* Branch switcher — owners/se_admin only */}
      {!collapsed && <div className="px-2 mt-2"><BranchSwitcher /></div>}

      {/* Nav — min-h-0 + flex-1 so this region scrolls; Lenis smooths wheel when motion OK */}
      <nav
        ref={navScrollRef}
        className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth px-2 py-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
        aria-label="Dashboard navigation"
      >
        <ul ref={navListRef} className="space-y-1 md:space-y-0.5">
          {visibleNav.map((item, i) => {
            const active =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <motion.li
                key={item.href}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    collapsed ? "justify-center p-3" : "justify-center md:justify-start p-3 md:px-3 md:py-2.5",
                    active ? 'text-white' : 'hover:bg-[var(--surface-hover)]',
                  )}
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))',
                          color: '#fff',
                          boxShadow: '0 2px 8px rgba(0,109,119,0.3)',
                        }
                      : { color: 'color-mix(in oklab, var(--text-primary) 74%, #000 26%)' }
                  }
                  title={item.label}
                >
                  <Icon size={18} className={cn(collapsed ? "" : "md:w-[15px] md:h-[15px]")} />
                  <span className={cn("whitespace-nowrap overflow-hidden", collapsed ? "hidden" : "hidden md:block")}>{item.label}</span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* POS shortcut — shrink-0 so nav scroll band absorbs overflow */}
      <div className="shrink-0 px-2 py-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
        <Link
          href="/pos"
          className={cn(
            "flex items-center gap-2.5 rounded-xl text-sm font-semibold transition-all duration-150",
            collapsed ? "justify-center p-3" : "justify-center md:justify-start p-3 md:px-3 md:py-2.5"
          )}
          style={{
            background: 'color-mix(in oklab, var(--color-teal) 12%, var(--surface-card) 88%)',
            color: 'color-mix(in oklab, var(--color-teal-dark) 78%, #000 22%)',
            border: '1px solid color-mix(in oklab, var(--color-teal) 38%, var(--surface-border) 62%)',
          }}
          title="POS Terminal"
        >
          <ShoppingCart size={18} className={cn(collapsed ? "" : "md:w-[15px] md:h-[15px]")} />
          <span className={cn("whitespace-nowrap overflow-hidden", collapsed ? "hidden" : "hidden md:block")}>POS Terminal</span>
        </Link>
      </div>

      {/* User + logout — shrink-0 keeps profile + sign out on screen */}
      {user && (
        <div
          className={cn(
            'flex shrink-0 flex-col px-2 py-3',
            collapsed ? 'items-center' : 'items-center md:items-stretch md:px-3',
          )}
          style={{ borderTop: '1px solid var(--surface-border)' }}
        >
          <div className={cn("flex items-center gap-2.5 mb-3", collapsed ? "justify-center" : "justify-center md:justify-start md:mb-2")}>
            <div
              className={cn(
                "rounded-xl flex items-center justify-center shrink-0 font-bold text-white shadow-sm",
                collapsed ? "w-10 h-10 text-sm" : "w-10 h-10 md:w-8 md:h-8 text-sm md:text-xs"
              )}
              style={{ background: 'linear-gradient(135deg, var(--color-teal-dark), var(--color-teal))' }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className={cn("min-w-0", collapsed ? "hidden" : "hidden md:block")}>
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name}
              </p>
              <p className="text-[10px] capitalize truncate" style={{ color: 'var(--text-muted)' }}>
                {user.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl text-xs font-medium transition-colors hover:bg-red-50",
              collapsed ? "justify-center p-3" : "justify-center md:justify-start p-3 md:px-3 md:py-2"
            )}
            style={{ color: '#dc2626' }}
            title="Sign out"
          >
            <LogOut size={18} className={cn(collapsed ? "" : "md:w-[13px] md:h-[13px]")} />
            <span className={cn("whitespace-nowrap overflow-hidden", collapsed ? "hidden" : "hidden md:block")}>Sign out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
