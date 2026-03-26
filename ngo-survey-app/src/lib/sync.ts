import { v4 as uuidv4 } from 'uuid';
import {
  getPendingSyncItems,
  getFailedSyncItems,
  updateSyncItem,
  removeSyncItem,
  getResponse,
  updateResponseSyncStatus,
} from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import type { SyncQueueItem } from '../types';

const MAX_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes
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

async function uploadResponse(item: SyncQueueItem): Promise<boolean> {
  const response = await getResponse(item.reference_id);
  if (!response) {
    // Response was deleted locally; remove from queue
    await removeSyncItem(item.id);
    return true;
  }

  if (response.sync_status === 'synced') {
    await removeSyncItem(item.id);
    return true;
  }

  if (!isSupabaseConfigured()) {
    // Can't sync without Supabase — mark as failed with message
    item.status = 'failed';
    item.error = 'Supabase not configured';
    item.last_attempt = Date.now();
    await updateSyncItem(item);
    return false;
  }

  try {
    await updateResponseSyncStatus(item.reference_id, 'syncing');
    item.status = 'syncing';
    await updateSyncItem(item);

    const { error } = await supabase.from('responses').upsert({
      id: response.id,
      form_id: response.form_id,
      form_version: response.form_version,
      respondent_id: response.respondent_id,
      data: response.data,
      location: response.location,
      collected_at: response.collected_at,
      device_id: response.device_id,
    });

    if (error) throw error;

    const syncedAt = new Date().toISOString();
    await updateResponseSyncStatus(item.reference_id, 'synced', syncedAt);
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

export async function syncAll(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSyncItems();
  const failed = await getFailedSyncItems();

  // Retry failed items whose delay has elapsed
  const now = Date.now();
  const retryable = failed.filter((item) => {
    const delay = getRetryDelay(item.retry_count);
    return !item.last_attempt || now - item.last_attempt >= delay;
  });

  // Reset retryable items to pending
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
    const ok = await uploadResponse(item);
    if (ok) synced++;
    else failedCount++;
  }

  return { synced, failed: failedCount };
}

// ── SyncManager: auto-syncs on connectivity changes ──

type SyncListener = (pending: number) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  start() {
    window.addEventListener('online', this.handleOnline);

    // Periodic sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.triggerSync();
      }
    }, 30_000);
  }

  stop() {
    window.removeEventListener('online', this.handleOnline);
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(pending: number) {
    this.listeners.forEach((fn) => fn(pending));
  }

  private handleOnline = () => {
    this.triggerSync();
  };

  async triggerSync() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const result = await syncAll();
      this.notify(result.failed);
    } catch {
      // Sync failed silently — will retry
    } finally {
      this.isRunning = false;
    }
  }
}

export const syncManager = new SyncManager();
