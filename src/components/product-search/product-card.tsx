'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Store, BrainCircuit } from 'lucide-react';
import { ClassificationBadge } from './classification-badge';
import { cn, formatGhs } from '@/lib/utils';
import { GhsMoney } from '@/components/ui/ghs-money';
import { formatStockFraction } from '@/lib/stock-display';
import { useAuthStore } from '@/lib/store/auth.store';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import type { Product } from '@/types';
import styles from '@/components/pos/med-card-3d.module.css';
import { MedCardScene } from '@/components/pos/med-card-scene';

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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const stock = product.inventory?.quantityOnHand ?? 0;
  const reorderLevel = product.inventory?.reorderLevel ?? 10;
  const isOutOfStock = stock === 0;
  const isPom = product.classification === 'POM' || product.classification === 'CONTROLLED';
  const isCritical = !isOutOfStock && stock <= Math.max(1, Math.floor(reorderLevel * 0.2));
  const isLow = !isOutOfStock && !isCritical && stock <= reorderLevel;

  const actionLabel = isOutOfStock ? 'OUT' : isPom ? 'CHECK Rx' : '+ Add';

  const handleInteraction = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!isOutOfStock) onSelect(product);
  };

  const getStockBadgeClass = () => {
    if (isOutOfStock || isCritical) return styles.stockBadgeCritical;
    if (isLow) return styles.stockBadgeLow;
    return styles.stockBadgeOk;
  };

  const getStockLabel = () => {
    if (isOutOfStock) return 'OUT OF STOCK';
    if (isCritical) return '⚠ CRITICAL';
    if (isLow) return '⚠ LOW STOCK';
    return null; // OK doesn't need badge according to prompt, but can show
  };

  const stockLabel = getStockLabel();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? {} : { y: -4, scale: 1.02 }}
      whileTap={isOutOfStock ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={handleInteraction}
      onKeyDown={(e) => e.key === 'Enter' && handleInteraction(e)}
      tabIndex={isOutOfStock ? -1 : 0}
      role="button"
      aria-disabled={isOutOfStock}
      aria-label={`${product.name}, ${formatGhs(product.unitPrice / 100)}`}
      className={cn(styles.medCard, isOutOfStock ? 'opacity-70 grayscale' : '')}
    >
      {/* 3D Scene Top */}
      <div className={styles.cardCanvas}>
        <MedCardScene category={product.category?.name || 'Default'} isMobile={isMobile} />
        {stockLabel && (
          <span className={cn(styles.stockBadge, getStockBadgeClass())}>
            {stockLabel}
          </span>
        )}
        {/* Classification Badge overlaid */}
        <div className="absolute top-2 left-2 z-10">
          <ClassificationBadge classification={product.classification} />
        </div>
      </div>

      {/* Info Body */}
      <div className={styles.cardBody}>
        <p className={styles.cardName}>{product.name}</p>
        <p className={styles.cardStrength}>
          {product.genericName ? `${product.genericName} · ` : ''} 
          {product.category?.name || 'Uncategorized'}
        </p>
        <div className="mt-auto flex items-center gap-2">
          {product.supplier?.aiScore != null && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700">
              <BrainCircuit size={10} /> AI {product.supplier.aiScore}
            </span>
          )}
          <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
             <Store size={10} /> {formatStockFraction(stock, reorderLevel, sessionPeakTotal)} in stock
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        <GhsMoney
          amount={product.unitPrice / 100}
          className={styles.price}
        />
        <button
          className={cn(styles.addBtn, isOutOfStock ? 'bg-gray-400 cursor-not-allowed hover:bg-gray-400' : '')}
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock) onSelect(product);
          }}
        >
          {actionLabel}
        </button>
      </div>
    </motion.div>
  );
}
