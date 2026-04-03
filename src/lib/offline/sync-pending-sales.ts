import type { ApolloClient } from '@apollo/client';
import { CREATE_SALE } from '@/lib/graphql/sales.mutations';
import { DAILY_SUMMARY, RECENT_SALES } from '@/lib/graphql/sales.queries';
import { buildCreateSaleInput } from '@/lib/sales/build-create-sale-input';
import { getPendingSales, markSaleSynced } from '@/lib/db/offline.db';
import type { PaymentMethod } from '@/types';

function tenderToApiMethod(m: PaymentMethod): 'CASH' | 'MTN_MOMO' {
  if (m === 'MTN_MOMO' || m === 'VODAFONE_CASH' || m === 'AIRTELTIGO_MONEY') {
    return 'MTN_MOMO';
  }
  return 'CASH';
}

/** Push queued offline sales to the API. Returns how many were synced. */
export async function syncPendingSales(client: ApolloClient): Promise<number> {
  const pending = await getPendingSales();
  let synced = 0;
  for (const sale of pending) {
    const tender = sale.tenders[0];
    const method = tender ? tenderToApiMethod(tender.method) : 'CASH';
    const grandTotal = sale.totalGhs + sale.vatGhs;
    const input = buildCreateSaleInput(
      sale.items,
      grandTotal,
      sale.id,
      method,
      sale.createdAt,
      sale.customerId ?? null,
    );
    try {
      await client.mutate({
        mutation: CREATE_SALE,
        variables: { input },
        refetchQueries: [
          { query: RECENT_SALES, variables: { limit: 20 } },
          { query: DAILY_SUMMARY, variables: { date: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }) } },
        ],
        awaitRefetchQueries: true,
      });
      await markSaleSynced(sale.id);
      synced += 1;
    } catch (e) {
      console.error('[syncPendingSales] failed for', sale.id, e);
      break;
    }
  }
  return synced;
}
