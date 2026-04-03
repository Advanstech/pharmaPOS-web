'use client';

import Image from 'next/image';
import { Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pharmaStockPhotoUrl, productImageFallbackSeed } from '@/lib/pharma-stock-photo';

interface PharmaProductVisualProps {
  productName: string;
  productId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showImage?: boolean;
}

const SIZES = { sm: 40, md: 56, lg: 72 };

/**
 * Executive product tile: optional real stock photo + CSS 3D capsule accent.
 */
export function PharmaProductVisual({
  productName,
  productId,
  size = 'md',
  className,
  showImage = true,
}: PharmaProductVisualProps) {
  const px = SIZES[size];
  const seed = productImageFallbackSeed({ productId, productName });
  const src = pharmaStockPhotoUrl(seed, px * 2);

  return (
    <div
      className={cn('relative shrink-0 [perspective:800px]', className)}
      style={{ width: px, height: px }}
      aria-hidden={!productName}
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-90"
        style={{
          background: `linear-gradient(145deg, rgba(0,109,119,0.35) 0%, rgba(232,168,56,0.2) 50%, rgba(13,148,136,0.25) 100%)`,
          transform: 'rotateX(8deg) rotateY(-12deg) translateZ(0)',
          boxShadow: '0 12px 28px rgba(0,109,119,0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      />
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10"
        style={{
          background: 'var(--surface-base)',
          boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        {showImage ? (
          <Image
            src={src}
            alt={productName.slice(0, 120)}
            width={px}
            height={px}
            className="h-full w-full object-cover"
            sizes={`${px}px`}
          />
        ) : (
          <Pill className="text-teal/80" size={Math.round(px * 0.45)} strokeWidth={1.5} />
        )}
      </div>
    </div>
  );
}
