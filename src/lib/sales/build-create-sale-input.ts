import type { CartItem } from '@/types';

export function buildCreateSaleInput(
  items: CartItem[],
  grandTotalGhs: number,
  idempotencyKey: string,
  tenderMethod: 'CASH' | 'MTN_MOMO',
  /** When set, reporting uses this as checkout time (offline sync). Omit for live online checkout. */
  soldAtIso?: string,
  /** Optional branch customer — omitted for anonymous walk-out sales. */
  customerId?: string | null,
) {
  const totalPesewas = Math.round(grandTotalGhs * 100);
  return {
    idempotencyKey,
    ...(soldAtIso ? { soldAt: soldAtIso } : {}),
    ...(customerId ? { customerId } : {}),
    items: items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      ...(i.prescriptionId ? { prescriptionId: i.prescriptionId } : {}),
    })),
    tenders: [
      {
        method: tenderMethod,
        amountPesewas: totalPesewas,
      },
    ],
  };
}
