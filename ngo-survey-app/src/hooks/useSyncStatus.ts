import { useState, useEffect, useCallback } from 'react';
import { getSyncQueueCount } from '../lib/db';
import { syncManager } from '../lib/sync';

export interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  triggerSync: () => void;
}

export function useSyncStatus(): SyncState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll pending count
  useEffect(() => {
    const refresh = async () => {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen to sync manager updates
  useEffect(() => {
    const unsub = syncManager.subscribe(() => {
      getSyncQueueCount().then(setPendingCount);
    });
    return () => { unsub(); };
  }, []);

  const triggerSync = useCallback(() => {
    syncManager.triggerSync();
  }, []);

  return { isOnline, pendingCount, triggerSync };
}
