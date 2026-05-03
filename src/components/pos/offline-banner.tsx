'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CloudOff, RefreshCw, CloudUpload } from 'lucide-react';
import { useApolloClient } from '@apollo/client';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useEffect, useState, useCallback } from 'react';
import { getPendingSales } from '@/lib/db/offline.db';
import { syncPendingSales } from '@/lib/offline/sync-pending-sales';

export function OfflineBanner() {
  const client = useApolloClient();
  const { isOnline, isReconnecting } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const sales = await getPendingSales();
    setPendingCount(sales.length);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncPendingSales(client);
    } finally {
      await refreshPending();
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (isOnline) {
        setIsSyncing(true);
        try {
          await syncPendingSales(client);
        } finally {
          if (!cancelled) setIsSyncing(false);
        }
      }
      const sales = await getPendingSales();
      if (!cancelled) setPendingCount(sales.length);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOnline, client]);

  const show = !isOnline || isReconnecting || pendingCount > 0;

  if (!show) return null;

  const isWarning = !isOnline || isReconnecting;

  return (
    <AnimatePresence>
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
          className="flex items-center justify-between gap-2.5 px-5 py-2 text-xs font-medium transition-colors"
          style={{
            background: isWarning
              ? isReconnecting
                ? 'linear-gradient(90deg, #78350f, #92400e)'
                : 'linear-gradient(90deg, #7f1d1d, #991b1b)'
              : 'rgba(13,148,136,0.1)',
            color: isWarning ? '#fef3c7' : '#0d9488',
            borderBottom: isWarning ? 'none' : '1px solid rgba(13,148,136,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            {isReconnecting ? (
              <CloudOff size={13} className="shrink-0" />
            ) : !isOnline ? (
              <WifiOff size={13} className="shrink-0" />
            ) : (
              <CloudUpload size={14} className="shrink-0" />
            )}
            <span>
              {isReconnecting
                ? 'Reconnecting to server…'
                : !isOnline
                ? 'Offline Mode — Cash payments only. MoMo disabled.'
                : `Connected — ${pendingCount} sale${pendingCount === 1 ? '' : 's'} waiting to sync.`}
              {!isReconnecting && !isOnline && pendingCount > 0 && (
                <span className="ml-1 font-bold">
                  {pendingCount} sale{pendingCount > 1 ? 's' : ''} queued.
                </span>
              )}
            </span>
          </div>

          {isOnline && pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
              style={{
                background: isWarning ? 'rgba(255,255,255,0.2)' : 'rgba(13,148,136,0.1)',
                color: isWarning ? '#fff' : '#0d9488',
              }}
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
