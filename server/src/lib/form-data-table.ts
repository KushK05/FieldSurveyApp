import type Database from 'better-sqlite3';

type FormTableRecord = {
  id: string;
  data_table?: string | null;
};

function toIdentifierBase(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'form';
}

function shortHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

export function buildFormDataTableName(formId: string): string {
  const base = toIdentifierBase(formId).slice(0, 28);
  const hash = shortHash(formId);
  return `form_data_${base}_${hash}`;
}

export function quoteIdentifier(identifier: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

export function resolveFormDataTableName(form: FormTableRecord): string {
  return form.data_table || buildFormDataTableName(form.id);
}

export function createFormDataTable(db: Database.Database, tableName: string) {
  const quoted = quoteIdentifier(tableName);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${quoted} (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      form_version INTEGER NOT NULL,
      volunteer_id TEXT NOT NULL REFERENCES users(id),
      data TEXT NOT NULL,
      location TEXT,
      collected_at TEXT NOT NULL,
      synced_at TEXT,
      device_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${tableName}_volunteer_idx`)} ON ${quoted}(volunteer_id);
    CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${tableName}_collected_idx`)} ON ${quoted}(collected_at DESC);
  `);
}

export function getFormRecord(db: Database.Database, formId: string, orgId: string): FormTableRecord | null {
  const row = db.prepare('SELECT id, data_table FROM forms WHERE id = ? AND org_id = ?').get(formId, orgId) as FormTableRecord | undefined;
  return row ?? null;
}

export function getOrgFormRecords(db: Database.Database, orgId: string): FormTableRecord[] {
  return db.prepare('SELECT id, data_table FROM forms WHERE org_id = ?').all(orgId) as FormTableRecord[];
}
