'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ProductCard } from './product-card';
import { ProductCardSkeleton } from './product-card-skeleton';
import type { Product } from '@/types';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onSelect: (product: Product) => void;
  shouldReduceMotion: boolean;
}

const SKELETON_COUNT = 8;

export function ProductGrid({ products, loading, onSelect, shouldReduceMotion }: ProductGridProps) {
  if (loading && products.length === 0) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        aria-label="Loading products"
        aria-busy="true"
      >
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="list"
      aria-label={`${products.length} products found`}
    >
      <AnimatePresence mode="popLayout">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            role="listitem"
            layout
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
            // Stagger: 0.05s per item
            transition={{ delay: shouldReduceMotion ? 0 : index * 0.05, duration: 0.2 }}
          >
            <ProductCard
              product={product}
              onSelect={onSelect}
              shouldReduceMotion={shouldReduceMotion}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
