import Database from 'better-sqlite3';
import { config } from './config.js';

const db = new Database(config.databasePath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function ensureColumn(table: string, columnDefinition: string) {
  const column = columnDefinition.trim().split(/\s+/, 1)[0];
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDefinition}`);
  }
}

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','supervisor','field_worker')),
      phone TEXT,
      delivery_channel TEXT NOT NULL DEFAULT 'manual' CHECK(delivery_channel IN ('sms','whatsapp','manual')),
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      schema TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL CHECK(status IN ('draft','published','archived')) DEFAULT 'draft',
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS form_versions (
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      schema TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (form_id, version)
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id),
      form_version INTEGER NOT NULL,
      respondent_id TEXT NOT NULL REFERENCES users(id),
      data TEXT NOT NULL,
      location TEXT,
      collected_at TEXT NOT NULL,
      synced_at TEXT,
      device_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL REFERENCES responses(id),
      field_key TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credential_deliveries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel TEXT NOT NULL CHECK(channel IN ('sms','whatsapp','manual')),
      destination TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending','sent','logged','failed','manual')),
      provider TEXT NOT NULL,
      provider_response TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      attempted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_responses_form ON responses(form_id);
    CREATE INDEX IF NOT EXISTS idx_responses_respondent ON responses(respondent_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_response ON attachments(response_id);
    CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(org_id, role);
    CREATE INDEX IF NOT EXISTS idx_forms_org_status ON forms(org_id, status);
    CREATE INDEX IF NOT EXISTS idx_form_versions_form ON form_versions(form_id, version);
    CREATE INDEX IF NOT EXISTS idx_credential_deliveries_user ON credential_deliveries(user_id, created_at DESC);
  `);

  ensureColumn('users', 'phone TEXT');
  ensureColumn("users", "delivery_channel TEXT NOT NULL DEFAULT 'manual'");
  ensureColumn('users', 'is_active INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'last_login_at TEXT');
  ensureColumn('users', 'updated_at TEXT');

  db.prepare("UPDATE users SET delivery_channel = 'manual' WHERE delivery_channel IS NULL").run();
  db.prepare('UPDATE users SET is_active = 1 WHERE is_active IS NULL').run();
  db.prepare('UPDATE users SET updated_at = COALESCE(updated_at, created_at, datetime(\'now\'))').run();

  db.exec(`
    INSERT OR IGNORE INTO form_versions (form_id, version, schema, created_by, created_at)
    SELECT id, version, schema, created_by, created_at
    FROM forms
  `);
}

export default db;
