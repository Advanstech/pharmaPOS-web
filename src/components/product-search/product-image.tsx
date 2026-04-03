'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { pharmaStockPhotoUrl, productImageFallbackSeed } from '@/lib/pharma-stock-photo';

interface ProductImageProps {
  src?: string | null;
  productName: string;
  /** Stable per-product seed; improves consistency of fallback art */
  productId?: string;
  genericName?: string | null;
  categoryName?: string | null;
  className?: string;
  /** Pixel width for Unsplash request (height matches). */
  fallbackWidth?: number;
  sizes?: string;
}

export function ProductImage({
  src,
  productName,
  productId,
  genericName,
  categoryName,
  className,
  fallbackWidth = 256,
  sizes = '200px',
}: ProductImageProps) {
  const hasUploaded = Boolean(src?.trim());
  const fallbackSeed = useMemo(
    () =>
      productImageFallbackSeed({
        productId,
        productName,
        genericName,
        categoryName,
      }),
    [productId, productName, genericName, categoryName],
  );

  const actualSrc = useMemo(
    () => (hasUploaded ? src!.trim() : pharmaStockPhotoUrl(fallbackSeed, fallbackWidth)),
    [hasUploaded, src, fallbackSeed, fallbackWidth],
  );

  const [imgReady, setImgReady] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setImgReady(false);
    setBroken(false);
  }, [actualSrc]);

  if (broken) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-[14px] bg-gray-100', className)}>
        <span className="text-2xl" aria-hidden="true">
          💊
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!imgReady && <div className="skeleton absolute inset-0 z-[1]" aria-hidden="true" />}
      <Image
        key={actualSrc}
        src={actualSrc}
        alt={productName}
        fill
        sizes={sizes}
        className={cn('object-cover transition-opacity duration-300', imgReady ? 'opacity-100' : 'opacity-0')}
        onLoad={() => setImgReady(true)}
        onError={() => setBroken(true)}
        priority={!hasUploaded}
      />
    </div>
  );
}
