import Dexie, { type Table } from 'dexie';
import type { OfflineProduct, OfflineSale } from '@/types';

/**
 * Azzay Pharmacy offline IndexedDB via Dexie.js
 * - products: cached catalogue (7-day TTL, warmed on login)
 * - pendingSales: queued transactions when offline (synced on reconnect)
 */
export class PharmaposDB extends Dexie {
  products!: Table<OfflineProduct>;
  pendingSales!: Table<OfflineSale>;

  constructor() {
    super('pharmapos-v1');
    this.version(1).stores({
      // Index: id, barcode, name (for search), branchId, lastSyncedAt
      products: 'id, barcode, name, genericName, branchId, lastSyncedAt',
      // Index: id (idempotency key), createdAt, synced
      pendingSales: 'id, createdAt, synced',
    });
  }
}

export const db = new PharmaposDB();

/** Search products offline — matches name prefix or exact barcode */
export async function searchOffline(query: string, branchId: string): Promise<OfflineProduct[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const byBarcode = await db.products
    .where('barcode').equals(q)
    .and((p) => p.branchId === branchId)
    .toArray();

  if (byBarcode.length > 0) return byBarcode;

  return db.products
    .where('name').startsWithIgnoreCase(q)
    .or('genericName').startsWithIgnoreCase(q)
    .filter((p) => p.branchId === branchId)
    .limit(20)
    .toArray();
}

/** Warm the offline cache for a branch on login */
export async function warmCache(products: OfflineProduct[]): Promise<void> {
  await db.products.bulkPut(products);
}

/** Queue a sale for background sync when offline */
export async function queueSale(sale: OfflineSale): Promise<void> {
  await db.pendingSales.put({ ...sale, synced: 0 });
}

/** Get all unsynced sales */
export async function getPendingSales(): Promise<OfflineSale[]> {
  return db.pendingSales.where('synced').equals(0).toArray();
}

/** Mark a sale as synced */
export async function markSaleSynced(id: string): Promise<void> {
  await db.pendingSales.update(id, { synced: 1 });
}

/** Delete a specific pending sale by ID */
export async function deletePendingSale(id: string): Promise<void> {
  await db.pendingSales.delete(id);
}

/** Clear all pending sales (useful when stuck sales are causing sync errors) */
export async function clearAllPendingSales(): Promise<void> {
  await db.pendingSales.clear();
}
