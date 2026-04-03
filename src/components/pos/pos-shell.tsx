'use client';

import { Suspense } from 'react';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { ProductSearch } from '@/components/product-search/product-search';
import { Cart } from '@/components/cart/cart';
import { PosTopBar } from '@/components/pos/pos-top-bar';
import { OfflineBanner } from '@/components/pos/offline-banner';
import { ErrorBoundary } from '@/components/error-boundary';

/**
 * Client shell for the POS page.
 * Handles auth guard + token refresh before rendering the POS UI.
 */
export function PosShell() {
  const { ready } = useAuthGuard();

  // Show nothing while refreshing token — avoids flash of unauthenticated state
  if (!ready) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'var(--surface-base)' }}
      >
        {/* Skeleton top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-14 animate-pulse"
          style={{ background: 'var(--color-teal-dark)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden overscroll-none" style={{ background: 'var(--surface-base)' }}>
      <PosTopBar />
      <OfflineBanner />
      <main className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left 60%: product search — POS layout spec */}
        <section
          className="flex min-h-0 w-full flex-col overflow-hidden lg:w-[60%]"
          style={{ borderRight: '1px solid var(--surface-border)' }}
        >
          <ErrorBoundary>
            <Suspense fallback={null}>
              <ProductSearch />
            </Suspense>
          </ErrorBoundary>
        </section>

        {/* Right 40%: cart — POS layout spec */}
        <section className="hidden min-h-0 w-[40%] flex-col overflow-hidden lg:flex">
          <ErrorBoundary>
            <Cart />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
}
