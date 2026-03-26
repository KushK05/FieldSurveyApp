import { v4 as uuidv4 } from 'uuid';
import {
  getPendingSyncItems,
  getFailedSyncItems,
  updateSyncItem,
  removeSyncItem,
  getResponse,
  updateResponseSyncStatus,
  getSyncQueueCount,
} from './db';
import { api } from './api';
import type { SyncQueueItem } from '../types';

const MAX_RETRY_DELAY = 5 * 60 * 1000;
const BATCH_SIZE = 10;

function getRetryDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
}

export function createSyncQueueItem(
  type: 'response' | 'attachment',
  referenceId: string
): SyncQueueItem {
  return {
    id: uuidv4(),
    type,
    reference_id: referenceId,
    status: 'pending',
    retry_count: 0,
    last_attempt: null,
    created_at: Date.now(),
  };
}

async function uploadResponse(
  item: SyncQueueItem,
  serverUrl: string,
  token: string
): Promise<boolean> {
  const response = await getResponse(item.reference_id);
  if (!response) {
    await removeSyncItem(item.id);
    return true;
  }

  if (response.sync_status === 'synced') {
    await removeSyncItem(item.id);
    return true;
  }

  try {
    await updateResponseSyncStatus(item.reference_id, 'syncing');
    item.status = 'syncing';
    await updateSyncItem(item);

    const result = await api.responses.submit(serverUrl, token, response);

    await updateResponseSyncStatus(item.reference_id, 'synced', result.synced_at);
    await removeSyncItem(item.id);
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    item.status = 'failed';
    item.retry_count += 1;
    item.last_attempt = Date.now();
    item.error = errorMsg;
    await updateSyncItem(item);
    await updateResponseSyncStatus(item.reference_id, 'failed');
    return false;
  }
}

export async function syncAll(
  serverUrl: string,
  token: string
): Promise<{ synced: number; failed: number }> {
  // Check server is reachable
  const reachable = await api.health.ping(serverUrl);
  if (!reachable) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getPendingSyncItems();
  const failed = await getFailedSyncItems();

  const now = Date.now();
  const retryable = failed.filter((item) => {
    const delay = getRetryDelay(item.retry_count);
    return !item.last_attempt || now - item.last_attempt >= delay;
  });

  for (const item of retryable) {
    item.status = 'pending';
    await updateSyncItem(item);
  }

  const allPending = [...pending, ...retryable];
  const responseBatch = allPending
    .filter((i) => i.type === 'response')
    .slice(0, BATCH_SIZE);

  let synced = 0;
  let failedCount = 0;

  for (const item of responseBatch) {
    const ok = await uploadResponse(item, serverUrl, token);
    if (ok) synced++;
    else failedCount++;
  }

  return { synced, failed: failedCount };
}

// Listeners
type SyncListener = (pendingCount: number) => void;
const listeners = new Set<SyncListener>();
let syncInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export function subscribeSyncStatus(listener: SyncListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

async function notifyListeners() {
  const count = await getSyncQueueCount();
  listeners.forEach((fn) => fn(count));
}

export async function triggerSync(serverUrl: string, token: string) {
  if (isRunning || !serverUrl || !token) return;
  isRunning = true;
  try {
    await syncAll(serverUrl, token);
    await notifyListeners();
  } catch {
    // Will retry
  } finally {
    isRunning = false;
  }
}

export function startAutoSync(serverUrl: string, token: string) {
  stopAutoSync();
  syncInterval = setInterval(() => {
    triggerSync(serverUrl, token);
  }, 30_000);
  // Immediate first sync
  triggerSync(serverUrl, token);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
