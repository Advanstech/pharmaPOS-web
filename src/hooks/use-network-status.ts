'use client';

import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  // Start with true on both server and client to avoid hydration mismatch.
  // Real value is set after mount via useEffect (client-only).
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Sync to real navigator.onLine after hydration
    setIsOnline(navigator.onLine);

    let reconnectTimer: ReturnType<typeof setTimeout>;

    const handleOnline = () => {
      setIsReconnecting(false);
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(true);
      reconnectTimer = setTimeout(() => setIsReconnecting(false), 5_000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(reconnectTimer);
    };
  }, []);

  return { isOnline, isReconnecting };
}
