'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CloudOff } from 'lucide-react';
import { useApolloClient } from '@apollo/client';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useEffect, useState } from 'react';
import { getPendingSales } from '@/lib/db/offline.db';
import { syncPendingSales } from '@/lib/offline/sync-pending-sales';

export function OfflineBanner() {
  const client = useApolloClient();
  const { isOnline, isReconnecting } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (isOnline) {
        await syncPendingSales(client);
        if (cancelled) return;
      }
      const sales = await getPendingSales();
      if (!cancelled) setPendingCount(sales.length);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOnline, client]);

  const show = !isOnline || isReconnecting;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden shrink-0"
          role="alert"
          aria-live="assertive"
        >
          <div
            className="flex items-center gap-2.5 px-5 py-2 text-xs font-medium"
            style={{
              background: isReconnecting
                ? 'linear-gradient(90deg, #78350f, #92400e)'
                : 'linear-gradient(90deg, #7f1d1d, #991b1b)',
              color: '#fef3c7',
            }}
          >
            {isReconnecting ? (
              <CloudOff size={13} className="shrink-0" aria-hidden="true" />
            ) : (
              <WifiOff size={13} className="shrink-0" aria-hidden="true" />
            )}
            <span>
              {isReconnecting
                ? 'Reconnecting to server…'
                : 'Offline Mode — Cash payments only. MoMo disabled.'}
              {!isReconnecting && pendingCount > 0 && (
                <span className="ml-1 font-bold">
                  {pendingCount} sale{pendingCount > 1 ? 's' : ''} queued for sync.
                </span>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
