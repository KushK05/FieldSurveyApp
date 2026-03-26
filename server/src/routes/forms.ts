import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  schema: z.object({
    fields: z.array(z.any()),
    settings: z.any().optional(),
  }),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

function parseForm(row: any) {
  return {
    ...row,
    schema: JSON.parse(row.schema),
  };
}

// GET /api/forms
router.get('/', requireAuth, (req, res) => {
  let rows;
  if (req.user!.role === 'admin') {
    rows = db.prepare(
      "SELECT * FROM forms WHERE org_id = ? AND status != 'archived' ORDER BY updated_at DESC"
    ).all(req.user!.org_id);
  } else {
    rows = db.prepare(
      "SELECT * FROM forms WHERE org_id = ? AND status = 'published' ORDER BY updated_at DESC"
    ).all(req.user!.org_id);
  }

  res.json(rows.map(parseForm));
});

// GET /api/forms/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.json(parseForm(row));
});

// POST /api/forms (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = formSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid form data', details: parsed.error.issues });
    return;
  }

  const { title, description, schema, status } = parsed.data;
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO forms (id, org_id, title, description, schema, version, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  ).run(id, req.user!.org_id, title, description || null, JSON.stringify(schema), status, req.user!.id, now, now);

  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(id);
  res.status(201).json(parseForm(row));
});

// PUT /api/forms/:id (admin only)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }

  const parsed = formSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid form data', details: parsed.error.issues });
    return;
  }

  const { title, description, schema, status } = parsed.data;
  const now = new Date().toISOString();
  const newVersion = existing.version + 1;

  db.prepare(
    `UPDATE forms SET title = ?, description = ?, schema = ?, version = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(title, description || null, JSON.stringify(schema), newVersion, status, now, req.params.id);

  const row = db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id);
  res.json(parseForm(row));
});

// DELETE /api/forms/:id (admin only - soft delete)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const result = db.prepare(
    "UPDATE forms SET status = 'archived', updated_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Form not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
