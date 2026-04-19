'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useAuthStore } from '@/lib/store/auth.store';
import { canAccessDashboardPath } from '@/lib/auth/dashboard-route-access';
import { postLoginPathForRole, roleForAccess } from '@/lib/auth/post-login-path';
import { Sidebar } from '@/components/dashboard/sidebar';
import { ErrorBoundary } from '@/components/error-boundary';
import { useNestedLenis } from '@/lib/lenis/use-nested-lenis';
import { OfflineBanner } from '@/components/pos/offline-banner';
import { MobileTopBar } from '@/components/dashboard/mobile-top-bar';
import { warmOfflineCache } from '@/lib/offline/warm-offline-cache';
import { useApolloClient } from '@apollo/client';
import { PageTransition } from '@/components/dashboard/page-transition';

function DashboardAuthLoading() {
  return (
    <div
      className="relative flex h-screen items-center justify-center"
      style={{ background: 'var(--surface-base)' }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-14 animate-pulse"
        style={{ background: 'var(--color-teal-dark)' }}
      />
    </div>
  );
}

export function DashboardAuthShell({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthGuard();
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const mainScrollRef = useRef<HTMLElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useNestedLenis(mainScrollRef, mainContentRef, {
    enabled: !prefersReducedMotion,
    layoutKey: pathname ?? '',
    syncTouch: true,
  });

  const accessRole = user ? roleForAccess(user.role) : null;
  const allowed =
    !!accessRole && canAccessDashboardPath(accessRole, pathname ?? '/dashboard');

  // Warm offline cache on first load
  const apolloClient = useApolloClient();
  useEffect(() => {
    if (!ready || !user) return;
    warmOfflineCache(apolloClient, user.branch_id).catch(() => {});
  }, [ready, user, apolloClient]);

  useEffect(() => {
    if (!ready || !user) return;
    const r = roleForAccess(user.role);
    if (!r || !canAccessDashboardPath(r, pathname ?? '/dashboard')) {
      router.replace(postLoginPathForRole(r ?? user.role));
    }
  }, [ready, user, pathname, router]);

  if (!ready || !user) {
    return <DashboardAuthLoading />;
  }

  if (!allowed) {
    return <DashboardAuthLoading />;
  }

  return (
    <div
      className="flex h-screen min-h-0 overflow-hidden flex-col"
      style={{ background: 'var(--surface-base)' }}
    >
      <OfflineBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: hidden on mobile, shown on md+ */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {/* Mobile top bar */}
        <MobileTopBar />
        <main
          ref={mainScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div ref={mainContentRef} className="min-h-full relative">
            <ErrorBoundary>
              <PageTransition>{children}</PageTransition>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
