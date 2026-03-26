import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';
import { getSyncQueueCount } from '../lib/db';
import { subscribeSyncStatus, triggerSync } from '../lib/sync';
import { useAuth } from '../contexts/AuthContext';

export function useSyncStatus() {
  const { serverUrl, token } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isWifi, setIsWifi] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Network state
  useEffect(() => {
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsOnline(state.isInternetReachable ?? false);
        setIsWifi(state.type === Network.NetworkStateType.WIFI);
      } catch {
        setIsOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Pending count
  useEffect(() => {
    const refresh = async () => {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    const unsub = subscribeSyncStatus((count) => setPendingCount(count));

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const doSync = useCallback(() => {
    if (serverUrl && token) {
      triggerSync(serverUrl, token);
    }
  }, [serverUrl, token]);

  return { isOnline, isWifi, pendingCount, triggerSync: doSync };
}
