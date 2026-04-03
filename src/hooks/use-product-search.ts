'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { SEARCH_PRODUCTS_QUERY, STOCK_CHANGED_SUBSCRIPTION } from '@/lib/graphql/products.queries';
import { searchOffline } from '@/lib/db/offline.db';
import type { Product } from '@/types';
import { stockSnapshotKey, useInventorySyncStore } from '@/lib/store/inventory-sync.store';

const DEBOUNCE_MS = 150;

/** When the DB has duplicate display names (legacy data), POS should surface the best-stocked row. */
function dedupeProductsByNamePreferStock(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      continue;
    }
    const q = p.inventory?.quantityOnHand ?? 0;
    const pq = prev.inventory?.quantityOnHand ?? 0;
    if (q > pq) {
      map.set(key, p);
      continue;
    }
    if (q < pq) continue;
    const bc = p.barcode?.trim() ? 1 : 0;
    const pbc = prev.barcode?.trim() ? 1 : 0;
    if (bc > pbc) map.set(key, p);
    else if (bc === pbc && p.id < prev.id) map.set(key, p);
  }
  return Array.from(map.values());
}
// Barcode scanners fire characters rapidly — detect if input > 8 chars in < 100ms
const BARCODE_THRESHOLD_MS = 100;
const BARCODE_MIN_LENGTH = 8;

interface UseProductSearchOptions {
  branchId: string;
  isOnline: boolean;
}

interface UseProductSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: Product[];
  loading: boolean;
  isBarcodeScan: boolean;
}

export function useProductSearch({ branchId, isOnline }: UseProductSearchOptions): UseProductSearchResult {
  const [query, setQueryRaw] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offlineResults, setOfflineResults] = useState<Product[]>([]);
  const [isBarcodeScan, setIsBarcodeScan] = useState(false);
  const lastKeystrokeRef = useRef<number>(0);
  const keystrokeCountRef = useRef<number>(0);
  const barcodeBufferRef = useRef<string>('');
  const stockSnapshots = useInventorySyncStore((s) => s.snapshots);
  const applyRealtimeStockUpdate = useInventorySyncStore((s) => s.applyRealtimeStockUpdate);
  const observeProductsForStockCap = useInventorySyncStore((s) => s.observeProductsForStockCap);

  // Debounce query at 150ms
  useEffect(() => {
    if (query.length < 2) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Barcode scanner detection via keyboard event listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      const delta = now - lastKeystrokeRef.current;
      lastKeystrokeRef.current = now;

      if (delta < BARCODE_THRESHOLD_MS) {
        keystrokeCountRef.current += 1;
        barcodeBufferRef.current += e.key;
      } else {
        keystrokeCountRef.current = 1;
        barcodeBufferRef.current = e.key;
      }

      if (e.key === 'Enter' && keystrokeCountRef.current >= BARCODE_MIN_LENGTH) {
        const barcode = barcodeBufferRef.current.replace('Enter', '').trim();
        setIsBarcodeScan(true);
        setQueryRaw(barcode);
        keystrokeCountRef.current = 0;
        barcodeBufferRef.current = '';
      } else {
        setIsBarcodeScan(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Online GraphQL search — skip if offline, query too short, or no branchId yet
  const { data, loading: gqlLoading, error } = useQuery(SEARCH_PRODUCTS_QUERY, {
    variables: { query: debouncedQuery, branchId, limit: 20 },
    skip: !isOnline || debouncedQuery.length < 2 || !branchId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: stockChangedData } = useSubscription(STOCK_CHANGED_SUBSCRIPTION, {
    variables: { branchId },
    skip: !isOnline || !branchId,
  });

  useEffect(() => {
    const event = stockChangedData?.stockChanged as
      | { branchId: string; productId: string; quantityOnHand: number; reorderLevel: number; stockStatus: 'ok' | 'low' | 'critical' | 'out' }
      | undefined;
    if (!event) return;
    applyRealtimeStockUpdate(event);
  }, [applyRealtimeStockUpdate, stockChangedData]);

  useEffect(() => {
    if (!branchId || !isOnline) return;
    const products = data?.searchProducts as Product[] | undefined;
    if (!products?.length) return;
    observeProductsForStockCap(branchId, products);
  }, [branchId, isOnline, data?.searchProducts, observeProductsForStockCap]);

  useEffect(() => {
    if (error) {
      // Suppress noisy network errors in console
      if (error.message.includes('Failed to fetch') || error.message.includes('Connection terminated')) {
        console.warn('[ProductSearch] Transient network error:', error.message);
      } else {
        console.error('[ProductSearch] GraphQL error:', error.message, error.graphQLErrors);
      }
    }
  }, [error]);

  // Offline Dexie search
  useEffect(() => {
    if (isOnline || debouncedQuery.length < 2 || !branchId) return;
    searchOffline(debouncedQuery, branchId).then((offlineProducts) => {
      const mappedResults: Product[] = offlineProducts.map(p => ({
        id: p.id,
        name: p.name,
        genericName: p.genericName,
        barcode: p.barcode,
        unitPrice: p.unitPrice,
        classification: p.classification,
        branchType: p.branchType,
        vatExempt: p.vatExempt,
        requiresRx: p.requiresRx,
        isActive: true,
        image: p.imageThumb ? { cdnUrl: '', urlThumb: p.imageThumb, source: 'DRUG_DB', isApproved: true, id: 'offline' } : null,
        inventory: {
          quantityOnHand: p.quantityOnHand,
          reorderLevel: 0, // Fallback for offline mode if missing
          batches: []
        },
        supplier: p.supplierName ? { id: 'offline', name: p.supplierName, aiScore: null } : null,
        category: null
      }));
      setOfflineResults(mappedResults);
    });
  }, [debouncedQuery, branchId, isOnline]);

  useEffect(() => {
    if (!branchId || isOnline || offlineResults.length === 0) return;
    observeProductsForStockCap(branchId, offlineResults);
  }, [branchId, isOnline, offlineResults, observeProductsForStockCap]);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    setIsBarcodeScan(false);
  }, []);

  function applyStockOverlay(product: Product): Product {
    const snapshot = stockSnapshots[stockSnapshotKey(branchId, product.id)];
    if (!snapshot) return product;
    return {
      ...product,
      inventory: {
        quantityOnHand: snapshot.quantityOnHand,
        reorderLevel: snapshot.reorderLevel,
        batches: product.inventory?.batches ?? [],
      },
    };
  }

  const uniqueGqlResults = data?.searchProducts
    ? dedupeProductsByNamePreferStock(data.searchProducts as Product[]).map(applyStockOverlay)
    : [];

  const uniqueOfflineResults = offlineResults
    ? dedupeProductsByNamePreferStock(offlineResults).map(applyStockOverlay)
    : [];

  const results: Product[] = isOnline ? uniqueGqlResults : uniqueOfflineResults;

  return {
    query,
    setQuery,
    results,
    loading: isOnline ? gqlLoading : false,
    isBarcodeScan,
  };
}
