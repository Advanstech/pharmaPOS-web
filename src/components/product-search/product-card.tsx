'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { ShieldAlert, Plus, Store, BrainCircuit } from 'lucide-react';
import { ProductImage } from './product-image';
import { ClassificationBadge } from './classification-badge';
import { cn, formatGhs } from '@/lib/utils';
import { GhsMoney } from '@/components/ui/ghs-money';
import { formatStockFraction } from '@/lib/stock-display';
import { canOpenInventoryFromPos, inventoryProductHref } from '@/lib/auth/pos-dashboard-links';
import { useAuthStore } from '@/lib/store/auth.store';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import type { Product, UserRole } from '@/types';

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
  const canProductLink = canOpenInventoryFromPos(user?.role as UserRole | undefined);
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

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    rotateY.set(((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 5);
    rotateX.set(-((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 5);
  }, [shouldReduceMotion, rotateX, rotateY]);

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
        ...(shouldReduceMotion ? {} : { rotateX: springX, rotateY: springY })
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
        "relative flex flex-row items-stretch overflow-hidden cursor-pointer rounded-[20px] focus:outline-none focus:ring-4 focus:ring-teal/50 will-change-transform shadow-sm border-[2px] transition-all bg-surface-card p-2 h-[120px] group",
        isOutOfStock ? "grayscale opacity-80 border-surface-border bg-surface-base cursor-not-allowed" : "border-surface-border hover:border-teal/30 hover:shadow-lg"
      )}
    >
      {/* Decorative inner glare */}
      <div className="absolute inset-x-0 top-0 h-[40px] bg-gradient-to-b from-white/20 dark:from-white/5 to-transparent pointer-events-none rounded-t-[18px] z-20" />

      {/* Left: Product Thumbnail */}
      <div className="relative w-[100px] shrink-0 h-full rounded-[14px] overflow-hidden bg-surface-hover flex items-center justify-center border border-surface-border shadow-inner">
         <ProductImage
          src={product.image?.urlThumb ?? product.image?.cdnUrl}
          productId={product.id}
          productName={product.name}
          genericName={product.genericName}
          categoryName={product.category?.name}
          fallbackWidth={200}
          sizes="100px"
          className="w-full h-full object-cover"
        />
        {/* Out of Stock visual badge directly on the image */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-surface-card/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
             <div
               className="transform -rotate-12 rounded border-2 px-2 py-1 font-black text-[10px] tracking-widest shadow-md"
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

      {/* Right: Compact Info & Action */}
      <div className="flex min-w-0 flex-col flex-1 pl-3 justify-between">
        
        {/* Meta Header */}
        <div className="flex items-start justify-between gap-1">
           <div className="flex flex-wrap gap-1 mb-1">
             <ClassificationBadge classification={product.classification} />
           </div>
           {isPom && !isOutOfStock && (
             <ShieldAlert size={14} className="text-amber-500 mr-1 mt-0.5" />
           )}
        </div>

        {/* Titles */}
        <div className="flex-1 min-w-0 pr-1">
           {canProductLink ? (
             <Link
               href={inventoryProductHref(product.id)}
               onClick={(e) => e.stopPropagation()}
               className="block font-extrabold text-content-primary text-[15px] leading-tight tracking-tight line-clamp-1 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-teal/40 rounded-sm"
             >
               {product.name}
             </Link>
           ) : (
             <h3 className="font-extrabold text-content-primary text-[15px] leading-tight tracking-tight line-clamp-1">{product.name}</h3>
           )}
           {product.genericName && (
             <p className="text-[11px] font-medium text-content-secondary mt-[2px] line-clamp-1">{product.genericName}</p>
           )}
           <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
            {product.category?.name ? (
              <span
                className="max-w-full rounded-full px-1.5 py-0.5 truncate"
                style={{ background: 'var(--surface-base)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }}
              >
                {product.category.name}
              </span>
            ) : null}
            {product.supplier?.aiScore != null ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
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

        {/* Footer: Price, Inventory & CTA */}
        <div className="mt-1 flex items-end justify-between gap-2">
           <div className="flex min-w-0 flex-1 flex-col">
              <GhsMoney
                amount={product.unitPrice / 100}
                className="mb-0.5 whitespace-nowrap font-extrabold text-[16px] leading-tight tracking-tight text-teal sm:text-[18px]"
              />
              <div className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-content-muted">
                <Store size={10} />
                <span
                  className={cn(
                    isOutOfStock ? 'text-red-500' : isCritical ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-emerald-600',
                  )}
                >
                  {formatStockFraction(stock, reorderLevel, sessionPeakTotal)}
                </span>
                {(isLow || isCritical) && (
                  <span className={cn('uppercase tracking-wide', isCritical ? 'text-red-500' : 'text-amber-600')}>
                    {isCritical ? 'critical' : 'low'}
                  </span>
                )}
                {!isOutOfStock && (
                  <span className="hidden uppercase tracking-wide text-content-muted/80 sm:inline">tap for details</span>
                )}
              </div>
           </div>

           {/* Super Compact Action Button */}
           <button
             disabled={isOutOfStock}
             className={cn(
               "h-[32px] shrink-0 rounded-full px-2 text-[10px] font-black tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-1 sm:px-3 sm:text-[11px]",
              isOutOfStock 
                ? "bg-surface-hover text-content-secondary cursor-not-allowed shadow-none border border-[var(--action-outline-neutral)]" 
                : "bg-teal text-white shadow-[0_3px_0_0_var(--color-teal-dark)] active:translate-y-[3px] active:shadow-none hover:bg-teal-dark"
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
