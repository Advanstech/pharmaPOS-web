'use client';

import { Suspense, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { ProductSearch } from '@/components/product-search/product-search';
import { Cart } from '@/components/cart/cart';
import { PosTopBar } from '@/components/pos/pos-top-bar';
import { OfflineBanner } from '@/components/pos/offline-banner';
import { ErrorBoundary } from '@/components/error-boundary';
import { useCartStore } from '@/lib/store/cart.store';

/**
 * Client shell for the POS page.
 * Desktop: side-by-side product search (60%) + cart (40%)
 * Mobile/Tablet: full-width product search + floating cart button + slide-up cart drawer
 */
export function PosShell() {
  const { ready } = useAuthGuard();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const itemCount = useCartStore(s => s.items.length);
  const totalGhs = useCartStore(s => s.totalGhs);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--surface-base)' }}>
        <div className="absolute top-0 left-0 right-0 h-14 animate-pulse" style={{ background: 'var(--color-teal-dark)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden overscroll-none" style={{ background: 'var(--surface-base)' }}>
      <PosTopBar />
      <OfflineBanner />

      <main className="flex min-h-0 flex-1 overflow-hidden relative">
        {/* Product search — full width on mobile, 60% on desktop */}
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

        {/* Desktop cart — 40% right panel (hidden on mobile) */}
        <section className="hidden min-h-0 w-[40%] flex-col overflow-hidden lg:flex">
          <ErrorBoundary>
            <Cart />
          </ErrorBoundary>
        </section>

        {/* ── Mobile: Floating cart button ── */}
        {itemCount > 0 && !mobileCartOpen && (
          <button
            onClick={() => setMobileCartOpen(true)}
            className="lg:hidden fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl px-5 py-3.5 text-white font-bold text-sm shadow-2xl active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #0d9488, #0f766e)',
              boxShadow: '0 8px 32px rgba(13,148,136,0.5), 0 2px 8px rgba(0,0,0,0.2)',
            }}
            aria-label="Open cart"
          >
            <ShoppingCart size={18} />
            <span>Cart ({itemCount})</span>
            <span className="font-mono">GH&#8373;{totalGhs().toFixed(2)}</span>
          </button>
        )}

        {/* ── Mobile: Cart drawer (slide up from bottom) ── */}
        {mobileCartOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
            {/* Backdrop */}
            <div
              className="flex-shrink-0"
              style={{ background: 'rgba(0,0,0,0.5)', height: '8vh' }}
              onClick={() => setMobileCartOpen(false)}
            />
            {/* Cart panel */}
            <div
              className="flex-1 flex flex-col overflow-hidden rounded-t-2xl"
              style={{
                background: 'var(--surface-base)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Drag handle + close */}
              <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--surface-border)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    Cart ({itemCount} items)
                  </span>
                </div>
                <button
                  onClick={() => setMobileCartOpen(false)}
                  className="p-2 rounded-lg hover:bg-[rgba(0,0,0,0.05)]"
                  aria-label="Close cart"
                >
                  <X size={18} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              {/* Cart content */}
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary>
                  <Cart />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
