import { openDB, type IDBPDatabase } from 'idb';
import type { SurveyForm, SurveyResponse, Attachment, SyncQueueItem } from '../types';

const DB_NAME = 'fieldsurvey';
const DB_VERSION = 1;

export type AppDB = IDBPDatabase;

let dbPromise: Promise<AppDB> | null = null;

export function getDB(): Promise<AppDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Forms store
        if (!db.objectStoreNames.contains('forms')) {
          db.createObjectStore('forms', { keyPath: 'id' });
        }

        // Responses store
        if (!db.objectStoreNames.contains('responses')) {
          const responseStore = db.createObjectStore('responses', { keyPath: 'id' });
          responseStore.createIndex('by_form', 'form_id');
          responseStore.createIndex('by_sync_status', 'sync_status');
          responseStore.createIndex('by_respondent', 'respondent_id');
        }

        // Attachments store
        if (!db.objectStoreNames.contains('attachments')) {
          const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
          attachmentStore.createIndex('by_response', 'response_id');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by_status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

// ── Forms ──

export async function getAllForms(): Promise<SurveyForm[]> {
  const db = await getDB();
  return db.getAll('forms');
}

export async function getForm(id: string): Promise<SurveyForm | undefined> {
  const db = await getDB();
  return db.get('forms', id);
}

export async function saveForm(form: SurveyForm): Promise<void> {
  const db = await getDB();
  await db.put('forms', form);
}

export async function saveForms(forms: SurveyForm[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('forms', 'readwrite');
  for (const form of forms) {
    await tx.store.put(form);
  }
  await tx.done;
}

// ── Responses ──

export async function getAllResponses(): Promise<SurveyResponse[]> {
  const db = await getDB();
  return db.getAll('responses');
}

export async function getResponse(id: string): Promise<SurveyResponse | undefined> {
  const db = await getDB();
  return db.get('responses', id);
}

export async function getResponsesByForm(formId: string): Promise<SurveyResponse[]> {
  const db = await getDB();
  return db.getAllFromIndex('responses', 'by_form', formId);
}

export async function getResponsesByUser(userId: string): Promise<SurveyResponse[]> {
  const db = await getDB();
  return db.getAllFromIndex('responses', 'by_respondent', userId);
}

export async function getPendingResponses(): Promise<SurveyResponse[]> {
  const db = await getDB();
  return db.getAllFromIndex('responses', 'by_sync_status', 'pending');
}

export async function saveResponse(response: SurveyResponse): Promise<void> {
  const db = await getDB();
  await db.put('responses', response);
}

export async function updateResponseSyncStatus(
  id: string,
  syncStatus: SurveyResponse['sync_status'],
  syncedAt?: string
): Promise<void> {
  const db = await getDB();
  const response = await db.get('responses', id);
  if (response) {
    response.sync_status = syncStatus;
    if (syncedAt) response.synced_at = syncedAt;
    await db.put('responses', response);
  }
}

// ── Attachments ──

export async function saveAttachment(attachment: Attachment): Promise<void> {
  const db = await getDB();
  await db.put('attachments', attachment);
}

export async function getAttachmentsByResponse(responseId: string): Promise<Attachment[]> {
  const db = await getDB();
  return db.getAllFromIndex('attachments', 'by_response', responseId);
}

// ── Sync Queue ──

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync_queue', 'by_status', 'pending');
}

export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync_queue', 'by_status', 'failed');
}

export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', item);
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  const pending = await db.countFromIndex('sync_queue', 'by_status', 'pending');
  const failed = await db.countFromIndex('sync_queue', 'by_status', 'failed');
  return pending + failed;
}
