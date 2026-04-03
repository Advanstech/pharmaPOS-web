import { create } from 'zustand';
import { stockCurrentOverCapacity } from '@/lib/stock-display';

export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export interface StockSnapshot {
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  updatedAt: number;
}

interface SaleStockSyncItem {
  productId: string;
  stockAfterSale: number;
  reorderLevel: number;
  stockStatus: StockStatus;
}

interface RealtimeStockItem {
  branchId: string;
  productId: string;
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: StockStatus;
}

/** Highest `stockCurrentOverCapacity(...).total` seen this browser session (per branch + product). */
function nextSessionPeakTotal(
  prev: number | undefined,
  qty: number,
  reorderLevel: number,
): number {
  const natural = stockCurrentOverCapacity(qty, reorderLevel).total;
  return prev === undefined ? natural : Math.max(prev, natural);
}

interface ProductLikeForCap {
  id: string;
  inventory: { quantityOnHand: number; reorderLevel: number } | null | undefined;
}

interface InventorySyncState {
  snapshots: Record<string, StockSnapshot>;
  /** Monotonic display denominator for POS `qty/total` — survives quantity drops until restock. */
  displayCaps: Record<string, number>;
  applySaleStockSync: (branchId: string, items: SaleStockSyncItem[]) => void;
  applyRealtimeStockUpdate: (item: RealtimeStockItem) => void;
  /** Record caps from search / barcode results so peaks exist before checkout. */
  observeProductsForStockCap: (branchId: string, products: ProductLikeForCap[]) => void;
  reset: () => void;
}

export function stockSnapshotKey(branchId: string, productId: string): string {
  return `${branchId}:${productId}`;
}

export const useInventorySyncStore = create<InventorySyncState>((set) => ({
  snapshots: {},
  displayCaps: {},
  applySaleStockSync: (branchId, items) =>
    set((state) => {
      const now = Date.now();
      const next = { ...state.snapshots };
      const caps = { ...state.displayCaps };
      for (const item of items) {
        const key = stockSnapshotKey(branchId, item.productId);
        next[key] = {
          quantityOnHand: item.stockAfterSale,
          reorderLevel: item.reorderLevel,
          stockStatus: item.stockStatus,
          updatedAt: now,
        };
        caps[key] = nextSessionPeakTotal(caps[key], item.stockAfterSale, item.reorderLevel);
      }
      return { snapshots: next, displayCaps: caps };
    }),
  applyRealtimeStockUpdate: (item) =>
    set((state) => {
      const key = stockSnapshotKey(item.branchId, item.productId);
      return {
        snapshots: {
          ...state.snapshots,
          [key]: {
            quantityOnHand: item.quantityOnHand,
            reorderLevel: item.reorderLevel,
            stockStatus: item.stockStatus,
            updatedAt: Date.now(),
          },
        },
        displayCaps: {
          ...state.displayCaps,
          [key]: nextSessionPeakTotal(state.displayCaps[key], item.quantityOnHand, item.reorderLevel),
        },
      };
    }),
  observeProductsForStockCap: (branchId, products) =>
    set((state) => {
      const caps = { ...state.displayCaps };
      let changed = false;
      for (const p of products) {
        const inv = p.inventory;
        if (!inv) continue;
        const key = stockSnapshotKey(branchId, p.id);
        const next = nextSessionPeakTotal(caps[key], inv.quantityOnHand, inv.reorderLevel);
        if (next !== caps[key]) {
          caps[key] = next;
          changed = true;
        }
      }
      return changed ? { displayCaps: caps } : state;
    }),
  reset: () => set({ snapshots: {}, displayCaps: {} }),
}));
