import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { formPayloadSchema } from '../lib/form-schema.js';
import { buildFormDataTableName, createFormDataTable, quoteIdentifier, resolveFormDataTableName } from '../lib/form-data-table.js';

const router = Router();

function parseForm(row: any) {
  return {
    ...row,
    schema: JSON.parse(row.schema),
    response_count: row.response_count !== undefined ? Number(row.response_count) : undefined,
  };
}

function getResponseCountForForm(form: { id: string; data_table?: string | null }): number {
  const tableName = resolveFormDataTableName(form);
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)} WHERE form_id = ?`).get(form.id) as { count?: number };
  return Number(row.count ?? 0);
}

// GET /api/forms
router.get('/', requireAuth, (req, res) => {
  let rows: any[];
  if (req.user!.role === 'admin' || req.user!.role === 'supervisor') {
    rows = db.prepare(`
      SELECT f.*
      FROM forms f
      WHERE f.org_id = ? AND f.status != 'archived'
      ORDER BY f.updated_at DESC
    `).all(req.user!.org_id) as any[];
  } else {
    rows = db.prepare(`
      SELECT f.*
      FROM forms f
      WHERE f.org_id = ? AND f.status = 'published'
      ORDER BY f.updated_at DESC
    `).all(req.user!.org_id) as any[];
  }

  const withCounts = rows.map((row) => ({
    ...row,
    response_count: getResponseCountForForm(row),
  }));
  res.json(withCounts.map(parseForm));
});

// GET /api/forms/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM forms WHERE id = ? AND org_id = ?').get(req.params.id, req.user!.org_id) as any;
  if (!row) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  if (req.user!.role === 'field_worker' && row.status !== 'published') {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.json(parseForm(row));
});

// POST /api/forms (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = formPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid form data', details: parsed.error.issues });
    return;
  }

  const { title, description, schema, status } = parsed.data;
  const id = uuidv4();
  const dataTable = buildFormDataTableName(id);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO forms (id, org_id, title, description, schema, data_table, version, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).run(id, req.user!.org_id, title, description || null, JSON.stringify(schema), dataTable, status, req.user!.id, now, now);

  db.prepare(
    `INSERT INTO form_versions (form_id, version, schema, created_by, created_at)
     VALUES (?, 1, ?, ?, ?)`
  ).run(id, JSON.stringify(schema), req.user!.id, now);

  createFormDataTable(db, dataTable);

  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(id);
  res.status(201).json(parseForm(row));
});

// PUT /api/forms/:id (admin only)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM forms WHERE id = ? AND org_id = ?').get(req.params.id, req.user!.org_id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  const parsed = formPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid form data', details: parsed.error.issues });
    return;
  }

  const { title, description, schema, status } = parsed.data;
  const now = new Date().toISOString();
  const serializedSchema = JSON.stringify(schema);
  const schemaChanged = serializedSchema !== existing.schema;
  const newVersion = schemaChanged ? existing.version + 1 : existing.version;

  db.prepare(
    `UPDATE forms SET title = ?, description = ?, schema = ?, version = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(title, description || null, serializedSchema, newVersion, status, now, req.params.id);

  if (schemaChanged) {
    db.prepare(
      `INSERT INTO form_versions (form_id, version, schema, created_by, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(req.params.id, newVersion, serializedSchema, req.user!.id, now);
  }

  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  res.json(parseForm(row));
});

// DELETE /api/forms/:id (admin only - soft delete)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const result = db.prepare(
    "UPDATE forms SET status = 'archived', updated_at = ? WHERE id = ? AND org_id = ?"
  ).run(new Date().toISOString(), req.params.id, req.user!.org_id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
