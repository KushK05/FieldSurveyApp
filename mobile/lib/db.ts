import * as SQLite from 'expo-sqlite';
import type { SurveyForm, SurveyResponse, Attachment, SyncQueueItem } from '../types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('fieldsurvey.db');
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      org_id TEXT,
      title TEXT,
      description TEXT,
      schema TEXT,
      version INTEGER,
      status TEXT,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      form_id TEXT,
      form_version INTEGER,
      respondent_id TEXT,
      data TEXT,
      location TEXT,
      collected_at TEXT,
      synced_at TEXT,
      device_id TEXT,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      response_id TEXT,
      field_key TEXT,
      file_uri TEXT,
      file_type TEXT,
      file_size INTEGER,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT,
      reference_id TEXT,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_attempt INTEGER,
      created_at INTEGER,
      error TEXT
    );
  `);
}

// ── Forms ──

export async function getAllForms(): Promise<SurveyForm[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<any>('SELECT * FROM forms');
  return rows.map(parseForm);
}

export async function getForm(id: string): Promise<SurveyForm | undefined> {
  const database = await getDB();
  const row = await database.getFirstAsync<any>('SELECT * FROM forms WHERE id = ?', id);
  return row ? parseForm(row) : undefined;
}

export async function saveForm(form: SurveyForm): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO forms (id, org_id, title, description, schema, version, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    form.id, form.org_id, form.title, form.description || null,
    JSON.stringify(form.schema), form.version, form.status,
    form.created_by, form.created_at, form.updated_at
  );
}

export async function saveForms(forms: SurveyForm[]): Promise<void> {
  const database = await getDB();
  for (const form of forms) {
    await database.runAsync(
      `INSERT OR REPLACE INTO forms (id, org_id, title, description, schema, version, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      form.id, form.org_id, form.title, form.description || null,
      JSON.stringify(form.schema), form.version, form.status,
      form.created_by, form.created_at, form.updated_at
    );
  }
}

// ── Responses ──

export async function getAllResponses(): Promise<SurveyResponse[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<any>('SELECT * FROM responses ORDER BY collected_at DESC');
  return rows.map(parseResponse);
}

export async function getResponse(id: string): Promise<SurveyResponse | undefined> {
  const database = await getDB();
  const row = await database.getFirstAsync<any>('SELECT * FROM responses WHERE id = ?', id);
  return row ? parseResponse(row) : undefined;
}

export async function getResponsesByUser(userId: string): Promise<SurveyResponse[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM responses WHERE respondent_id = ? ORDER BY collected_at DESC', userId
  );
  return rows.map(parseResponse);
}

export async function getPendingResponses(): Promise<SurveyResponse[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<any>(
    "SELECT * FROM responses WHERE sync_status = 'pending'"
  );
  return rows.map(parseResponse);
}

export async function saveResponse(response: SurveyResponse): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO responses (id, form_id, form_version, respondent_id, data, location, collected_at, synced_at, device_id, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    response.id, response.form_id, response.form_version, response.respondent_id,
    JSON.stringify(response.data),
    response.location ? JSON.stringify(response.location) : null,
    response.collected_at, response.synced_at || null,
    response.device_id || null, response.sync_status
  );
}

export async function updateResponseSyncStatus(
  id: string, syncStatus: SurveyResponse['sync_status'], syncedAt?: string
): Promise<void> {
  const database = await getDB();
  if (syncedAt) {
    await database.runAsync(
      'UPDATE responses SET sync_status = ?, synced_at = ? WHERE id = ?',
      syncStatus, syncedAt, id
    );
  } else {
    await database.runAsync(
      'UPDATE responses SET sync_status = ? WHERE id = ?',
      syncStatus, id
    );
  }
}

// ── Attachments ──

export async function saveAttachment(attachment: Attachment): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO attachments (id, response_id, field_key, file_uri, file_type, file_size, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    attachment.id, attachment.response_id, attachment.field_key,
    attachment.file_uri, attachment.file_type, attachment.file_size, attachment.sync_status
  );
}

export async function getAttachmentsByResponse(responseId: string): Promise<Attachment[]> {
  const database = await getDB();
  return database.getAllAsync<Attachment>(
    'SELECT * FROM attachments WHERE response_id = ?', responseId
  );
}

// ── Sync Queue ──

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO sync_queue (id, type, reference_id, status, retry_count, last_attempt, created_at, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id, item.type, item.reference_id, item.status,
    item.retry_count, item.last_attempt, item.created_at, item.error || null
  );
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDB();
  return database.getAllAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue WHERE status = 'pending'"
  );
}

export async function getFailedSyncItems(): Promise<SyncQueueItem[]> {
  const database = await getDB();
  return database.getAllAsync<SyncQueueItem>(
    "SELECT * FROM sync_queue WHERE status = 'failed'"
  );
}

export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE sync_queue SET status = ?, retry_count = ?, last_attempt = ?, error = ? WHERE id = ?`,
    item.status, item.retry_count, item.last_attempt, item.error || null, item.id
  );
}

export async function removeSyncItem(id: string): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
}

export async function getSyncQueueCount(): Promise<number> {
  const database = await getDB();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'failed')"
  );
  return result?.count || 0;
}

// ── Helpers ──

function parseForm(row: any): SurveyForm {
  return {
    ...row,
    schema: typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
  };
}

function parseResponse(row: any): SurveyResponse {
  return {
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    location: row.location
      ? typeof row.location === 'string' ? JSON.parse(row.location) : row.location
      : null,
  };
}
