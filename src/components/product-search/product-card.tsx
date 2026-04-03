'use client';

import { useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { Plus, Store, BrainCircuit } from 'lucide-react';
import { ProductImage } from './product-image';
import { ClassificationBadge } from './classification-badge';
import { cn, formatGhs } from '@/lib/utils';
import { GhsMoney } from '@/components/ui/ghs-money';
import { formatStockFraction } from '@/lib/stock-display';
import { useAuthStore } from '@/lib/store/auth.store';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  shouldReduceMotion: boolean;
}

export function ProductCard({ product, onSelect, shouldReduceMotion }: ProductCardProps) {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch_id ?? '';
  const sessionPeakTotal = useInventorySyncStore((s) =>
    branchId ? s.displayCaps[stockSnapshotKey(branchId, product.id)] : undefined,
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 150, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 150, damping: 20 });

  const stock = product.inventory?.quantityOnHand ?? 0;
  const reorderLevel = product.inventory?.reorderLevel ?? 10;
  const isOutOfStock = stock === 0;
  const isPom = product.classification === 'POM' || product.classification === 'CONTROLLED';
  const isCritical = !isOutOfStock && stock <= Math.max(1, Math.floor(reorderLevel * 0.2));
  const isLow = !isOutOfStock && !isCritical && stock <= reorderLevel;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      rotateY.set(((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 5);
      rotateX.set(-((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 5);
    },
    [shouldReduceMotion, rotateX, rotateY],
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
  }, [rotateX, rotateY]);

  const actionLabel = isOutOfStock ? '0' : isPom ? 'CHECK Rx' : 'ADD';

  const handleInteraction = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!isOutOfStock) onSelect(product);
  };

  return (
    <motion.div
      ref={cardRef}
      style={{
        transformStyle: 'preserve-3d',
        ...(shouldReduceMotion ? {} : { rotateX: springX, rotateY: springY }),
      }}
      whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.01 }}
      whileTap={isOutOfStock ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleInteraction}
      onKeyDown={(e) => e.key === 'Enter' && handleInteraction(e)}
      tabIndex={isOutOfStock ? -1 : 0}
      role="button"
      aria-disabled={isOutOfStock}
      aria-label={`${product.name}, ${formatGhs(product.unitPrice / 100)}`}
      className={cn(
        'relative isolate flex h-[120px] min-h-[120px] max-h-[120px] cursor-pointer flex-row items-stretch gap-2 overflow-hidden rounded-[20px] border-2 bg-surface-card p-2 shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-teal/50',
        isOutOfStock
          ? 'cursor-not-allowed border-surface-border bg-surface-base opacity-80 grayscale'
          : 'border-surface-border hover:border-teal/30 hover:shadow-lg',
      )}
    >
      {/* Left: thumbnail — glare only here so it never covers text */}
      <div className="relative h-full min-h-0 w-[92px] shrink-0 overflow-hidden rounded-[14px] border border-surface-border bg-surface-hover shadow-inner sm:w-[100px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-7 rounded-t-[13px] bg-gradient-to-b from-white/25 to-transparent dark:from-white/10" />
        <ProductImage
          src={product.image?.urlThumb ?? product.image?.cdnUrl}
          productId={product.id}
          productName={product.name}
          genericName={product.genericName}
          categoryName={product.category?.name}
          fallbackWidth={200}
          sizes="100px"
          className="relative z-0 h-full w-full object-cover"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-card/70 backdrop-blur-[2px]">
            <div
              className="-rotate-12 rounded border-2 px-2 py-1 font-black text-[10px] tracking-widest shadow-md"
              style={{
                background: 'var(--stock-pill-out-bg)',
                color: 'var(--stock-pill-out-fg)',
                borderColor: 'var(--stock-pill-out-fg)',
              }}
            >
              OUT
            </div>
          </div>
        )}
      </div>

      {/* Right: grid keeps badge / body / price from overlapping */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-0.5 pr-0.5">
        <div className="min-w-0 shrink-0">
          <ClassificationBadge classification={product.classification} />
        </div>

        <div className="min-h-0 min-w-0 overflow-hidden">
          <h3 className="line-clamp-2 break-words text-[12px] font-extrabold leading-tight tracking-tight text-content-primary sm:text-[13px]">
            {product.name}
          </h3>
          {product.genericName ? (
            <p className="mt-px line-clamp-1 text-[10px] font-medium leading-tight text-content-secondary">
              {product.genericName}
            </p>
          ) : null}
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1">
            {product.category?.name ? (
              <span
                className="max-w-full truncate rounded-full border px-1.5 py-0.5 text-[10px]"
                style={{
                  background: 'var(--surface-base)',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--surface-border)',
                }}
                title={product.category.name}
              >
                {product.category.name}
              </span>
            ) : null}
            {product.supplier?.aiScore != null ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: 'rgba(0,109,119,0.1)',
                  color:
                    product.supplier.aiScore >= 80
                      ? '#15803d'
                      : product.supplier.aiScore >= 60
                        ? '#b45309'
                        : '#b91c1c',
                }}
              >
                <BrainCircuit size={10} /> AI {product.supplier.aiScore}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className="flex shrink-0 items-end justify-between gap-1.5 border-t pt-1"
          style={{ borderColor: 'var(--surface-border)' }}
        >
          <div className="min-w-0 flex-1">
            <GhsMoney
              amount={product.unitPrice / 100}
              className="block text-[15px] font-extrabold leading-none tracking-tight text-teal sm:text-[16px]"
            />
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0 text-[10px] font-bold leading-tight text-content-muted">
              <Store size={10} className="shrink-0" />
              <span
                className={cn(
                  'min-w-0',
                  isOutOfStock ? 'text-red-500' : isCritical ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-emerald-600',
                )}
              >
                {formatStockFraction(stock, reorderLevel, sessionPeakTotal)}
              </span>
              {(isLow || isCritical) && (
                <span className={cn('shrink-0 uppercase tracking-wide', isCritical ? 'text-red-500' : 'text-amber-600')}>
                  {isCritical ? 'critical' : 'low'}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) onSelect(product);
            }}
            className={cn(
              'flex h-[30px] shrink-0 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-black uppercase tracking-wider transition-all sm:h-[32px] sm:px-3 sm:text-[11px]',
              isOutOfStock
                ? 'cursor-not-allowed border border-[var(--action-outline-neutral)] bg-surface-hover text-content-secondary shadow-none'
                : 'bg-teal text-white shadow-[0_3px_0_0_var(--color-teal-dark)] hover:bg-teal-dark active:translate-y-[2px] active:shadow-none',
            )}
          >
            {!isOutOfStock && !isPom && <Plus size={14} />}
            {actionLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
