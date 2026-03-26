import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const responseSchema = z.object({
  id: z.string().uuid(),
  form_id: z.string(),
  form_version: z.number(),
  respondent_id: z.string(),
  data: z.record(z.unknown()),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number(),
  }).nullable().optional(),
  collected_at: z.string(),
  device_id: z.string().optional(),
});

function parseResponse(row: any) {
  return {
    ...row,
    data: JSON.parse(row.data),
    location: row.location ? JSON.parse(row.location) : null,
  };
}

// POST /api/responses (upsert single response)
router.post('/', requireAuth, (req, res) => {
  const parsed = responseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid response data', details: parsed.error.issues });
    return;
  }

  const r = parsed.data;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR REPLACE INTO responses (id, form_id, form_version, respondent_id, data, location, collected_at, synced_at, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    r.id,
    r.form_id,
    r.form_version,
    r.respondent_id,
    JSON.stringify(r.data),
    r.location ? JSON.stringify(r.location) : null,
    r.collected_at,
    now,
    r.device_id || null,
    now,
  );

  res.status(201).json({ id: r.id, synced_at: now });
});

// POST /api/responses/batch (upsert multiple responses)
router.post('/batch', requireAuth, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Expected an array of responses' });
    return;
  }

  const insert = db.prepare(
    `INSERT OR REPLACE INTO responses (id, form_id, form_version, respondent_id, data, location, collected_at, synced_at, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date().toISOString();
  const results: { id: string; synced_at: string }[] = [];
  const errors: { index: number; error: string }[] = [];

  const insertMany = db.transaction(() => {
    items.forEach((item: any, index: number) => {
      const parsed = responseSchema.safeParse(item);
      if (!parsed.success) {
        errors.push({ index, error: parsed.error.message });
        return;
      }

      const r = parsed.data;
      insert.run(
        r.id,
        r.form_id,
        r.form_version,
        r.respondent_id,
        JSON.stringify(r.data),
        r.location ? JSON.stringify(r.location) : null,
        r.collected_at,
        now,
        r.device_id || null,
        now,
      );
      results.push({ id: r.id, synced_at: now });
    });
  });

  insertMany();

  res.status(201).json({ synced: results, errors });
});

// GET /api/responses (admin/supervisor: all; field_worker: own)
router.get('/', requireAuth, (req, res) => {
  const { form_id } = req.query;

  let rows;
  if (req.user!.role === 'admin' || req.user!.role === 'supervisor') {
    if (form_id) {
      rows = db.prepare('SELECT * FROM responses WHERE form_id = ? ORDER BY collected_at DESC').all(form_id);
    } else {
      rows = db.prepare('SELECT * FROM responses ORDER BY collected_at DESC LIMIT 500').all();
    }
  } else {
    if (form_id) {
      rows = db.prepare('SELECT * FROM responses WHERE respondent_id = ? AND form_id = ? ORDER BY collected_at DESC').all(req.user!.id, form_id);
    } else {
      rows = db.prepare('SELECT * FROM responses WHERE respondent_id = ? ORDER BY collected_at DESC').all(req.user!.id);
    }
  }

  res.json(rows.map(parseResponse));
});

// GET /api/responses/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM responses WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Response not found' });
    return;
  }
  res.json(parseResponse(row));
});

export default router;
