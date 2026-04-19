import type { ApolloClient } from '@apollo/client';
import { warmCache } from '@/lib/db/offline.db';
import type { OfflineProduct } from '@/types';

const WARM_CACHE_QUERY = `
  query WarmOfflineCache {
    inventory {
      productId
      productName
      classification
      quantityOnHand
      reorderLevel
      stockStatus
      supplierId
      supplierName
      unitPricePesewas
    }
  }
`;

/**
 * Warm the offline IndexedDB cache with the current branch's product catalog.
 * Called after login and periodically in the background.
 * Non-blocking — errors are silently logged.
 */
export async function warmOfflineCache(client: ApolloClient<unknown>, branchId: string): Promise<number> {
  try {
    const { data } = await client.query({
      query: require('@apollo/client').gql(WARM_CACHE_QUERY),
      fetchPolicy: 'network-only',
    });

    const inventory = (data?.inventory ?? []) as Array<{
      productId: string;
      productName: string;
      classification: string;
      quantityOnHand: number;
      reorderLevel: number;
      stockStatus: string;
      supplierId?: string;
      supplierName?: string;
      unitPricePesewas?: number;
    }>;

    const products: OfflineProduct[] = inventory.map(item => ({
      id: item.productId,
      name: item.productName,
      genericName: null,
      barcode: null,
      unitPrice: item.unitPricePesewas ?? 0,
      classification: item.classification as any,
      branchType: 'both' as any,
      vatExempt: false,
      requiresRx: item.classification === 'POM' || item.classification === 'CONTROLLED',
      branchId,
      quantityOnHand: item.quantityOnHand,
      imageThumb: null,
      supplierName: item.supplierName ?? null,
      lastSyncedAt: new Date().toISOString(),
    }));

    await warmCache(products);
    console.log('[OfflineCache] Warmed ' + products.length + ' products for branch ' + branchId);
    return products.length;
  } catch (err) {
    console.warn('[OfflineCache] Failed to warm cache:', err);
    return 0;
  }
}
