'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { getCategoryObject } from '@/utils/category-mesh-config';
import { useWebGL } from '@/hooks/use-webgl';
import { Package } from 'lucide-react';
import { cn, formatGhs } from '@/lib/utils';
import type { Product } from '@/types';
import { formatStockFraction } from '@/lib/stock-display';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';
import { useAuthStore } from '@/lib/store/auth.store';

function RowCategoryMesh({ category }: { category: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  const config = getCategoryObject(category);

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.rotation.y = clock.elapsedTime * 0.5;
      mesh.current.rotation.x = clock.elapsedTime * 0.2;
    }
  });

  return (
    <mesh ref={mesh} geometry={config.geometry} scale={0.7}>
      <MeshDistortMaterial
        color={config.color}
        distort={0.1}
        speed={1}
        metalness={0.5}
        roughness={0.3}
        emissive={config.color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

interface MedItemRow3DProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export function MedItemRow3D({ product, onClick }: MedItemRow3DProps) {
  const hasWebGL = useWebGL();
  const [isMobile, setIsMobile] = useState(false);

  const user = useAuthStore((s) => s.user);
  const branchId = user?.branch_id ?? '';
  const sessionPeakTotal = useInventorySyncStore((s) =>
    branchId ? s.displayCaps[stockSnapshotKey(branchId, product.id)] : undefined,
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const stock = product.inventory?.quantityOnHand ?? 0;
  const reorderLevel = product.inventory?.reorderLevel ?? 10;
  const isOutOfStock = stock === 0;

  return (
    <div 
      onClick={() => onClick?.(product)}
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl border border-surface-border bg-surface-card hover:shadow-md transition-all cursor-pointer group",
        isOutOfStock && "opacity-60"
      )}
      role="row"
    >
      {/* Inline 3D Icon */}
      <div className="w-12 h-12 rounded-lg bg-surface-hover shrink-0 flex items-center justify-center relative overflow-hidden shadow-inner border border-surface-border">
        {(!hasWebGL || isMobile) ? (
          <Package size={20} className="text-teal" />
        ) : (
          <div className="absolute inset-0">
            <Canvas
              camera={{ position: [0, 0, 2.5], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              frameloop="demand"
            >
              <ambientLight intensity={0.6} />
              <pointLight position={[2, 2, 2]} intensity={1.5} />
              <RowCategoryMesh category={product.category?.name || 'Default'} />
            </Canvas>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-content-primary truncate font-syne">
          {product.name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-content-secondary font-dm-sans">
          <span className="truncate max-w-[120px]">{product.genericName || 'No generic'}</span>
          <span className="text-surface-border">&bull;</span>
          <span className="font-mono text-[10px] uppercase text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
            {product.category?.name || 'Uncategorized'}
          </span>
        </div>
      </div>

      {/* Stock & Price */}
      <div className="text-right shrink-0">
        <div className="font-mono font-bold text-sm text-teal">
          GH&#8373; {formatGhs(product.unitPrice / 100)}
        </div>
        <div className={cn(
          "text-[11px] font-semibold mt-0.5",
          isOutOfStock ? "text-red-500" : "text-emerald-600"
        )}>
          {formatStockFraction(stock, reorderLevel, sessionPeakTotal)} units
        </div>
      </div>
    </div>
  );
}
