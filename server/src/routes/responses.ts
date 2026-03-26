import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateResponseData } from '../lib/form-schema.js';

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

function getFormVersionRecord(formId: string, version: number) {
  return db.prepare(`
    SELECT fv.schema, f.status, f.version, f.org_id
    FROM form_versions fv
    JOIN forms f ON f.id = fv.form_id
    WHERE fv.form_id = ? AND fv.version = ?
  `).get(formId, version) as any;
}

function validateIncomingResponse(input: z.infer<typeof responseSchema>, authUser: NonNullable<Express.Request['user']>) {
  const formVersion = getFormVersionRecord(input.form_id, input.form_version);
  if (!formVersion || formVersion.org_id !== authUser.org_id) {
    return { status: 404 as const, error: 'Form version not found' };
  }

  if (authUser.role === 'field_worker' && formVersion.status !== 'published') {
    return { status: 409 as const, error: 'This form is no longer published' };
  }

  if (input.form_version > formVersion.version) {
    return { status: 409 as const, error: 'The submitted form version is newer than the server copy' };
  }

  const schema = JSON.parse(formVersion.schema);
  const validation = validateResponseData(schema, input.data);
  if (!validation.ok) {
    return { status: 400 as const, error: 'Response data does not match the form schema', details: validation.errors };
  }

  return { status: 200 as const, error: '' };
}

// POST /api/responses (upsert single response)
router.post('/', requireAuth, (req, res) => {
  const parsed = responseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid response data', details: parsed.error.issues });
    return;
  }

  const r = parsed.data;
  const respondentId = req.user!.role === 'field_worker' ? req.user!.id : r.respondent_id;
  const validation = validateIncomingResponse({ ...r, respondent_id: respondentId }, req.user!);
  if (validation.status !== 200) {
    res.status(validation.status).json(validation);
    return;
  }

  const respondent = db.prepare('SELECT id FROM users WHERE id = ? AND org_id = ?').get(respondentId, req.user!.org_id);
  if (!respondent) {
    res.status(400).json({ error: 'Respondent does not belong to this organisation' });
    return;
  }

  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR REPLACE INTO responses (id, form_id, form_version, respondent_id, data, location, collected_at, synced_at, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    r.id,
    r.form_id,
    r.form_version,
    respondentId,
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
      const respondentId = req.user!.role === 'field_worker' ? req.user!.id : r.respondent_id;
      const validation = validateIncomingResponse({ ...r, respondent_id: respondentId }, req.user!);
      if (validation.status !== 200) {
        errors.push({ index, error: validation.error });
        return;
      }

      const respondent = db.prepare('SELECT id FROM users WHERE id = ? AND org_id = ?').get(respondentId, req.user!.org_id);
      if (!respondent) {
        errors.push({ index, error: 'Respondent does not belong to this organisation' });
        return;
      }

      insert.run(
        r.id,
        r.form_id,
        r.form_version,
        respondentId,
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

router.get('/summary', requireAuth, requireRole('admin', 'supervisor'), (req, res) => {
  const { form_id } = req.query;
  const formFilter = typeof form_id === 'string' ? form_id : null;

  const totals = db.prepare(`
    SELECT COUNT(*) AS total_responses
    FROM responses r
    JOIN forms f ON f.id = r.form_id
    WHERE f.org_id = ? AND (? IS NULL OR r.form_id = ?)
  `).get(req.user!.org_id, formFilter, formFilter) as any;

  const byForm = db.prepare(`
    SELECT
      f.id AS form_id,
      f.title,
      f.version,
      COUNT(r.id) AS response_count,
      MAX(r.collected_at) AS last_collected_at
    FROM forms f
    LEFT JOIN responses r ON r.form_id = f.id
    WHERE f.org_id = ? AND (? IS NULL OR f.id = ?)
    GROUP BY f.id
    ORDER BY response_count DESC, f.updated_at DESC
  `).all(req.user!.org_id, formFilter, formFilter);

  const byUser = db.prepare(`
    SELECT
      u.id AS respondent_id,
      u.full_name,
      u.username,
      COUNT(r.id) AS response_count,
      MAX(r.collected_at) AS last_collected_at
    FROM users u
    LEFT JOIN responses r ON r.respondent_id = u.id
    LEFT JOIN forms f ON f.id = r.form_id
    WHERE u.org_id = ? AND u.role = 'field_worker' AND (? IS NULL OR r.form_id = ?)
    GROUP BY u.id
    ORDER BY response_count DESC, u.full_name ASC
  `).all(req.user!.org_id, formFilter, formFilter);

  const recent = db.prepare(`
    SELECT
      r.*,
      f.title AS form_title,
      u.full_name AS respondent_name,
      u.username AS respondent_username
    FROM responses r
    JOIN forms f ON f.id = r.form_id
    JOIN users u ON u.id = r.respondent_id
    WHERE f.org_id = ? AND (? IS NULL OR r.form_id = ?)
    ORDER BY r.collected_at DESC
    LIMIT 10
  `).all(req.user!.org_id, formFilter, formFilter) as any[];

  res.json({
    total_responses: Number(totals.total_responses ?? 0),
    by_form: byForm.map((row: any) => ({
      form_id: row.form_id,
      title: row.title,
      version: Number(row.version),
      response_count: Number(row.response_count ?? 0),
      last_collected_at: row.last_collected_at ?? null,
    })),
    by_user: byUser.map((row: any) => ({
      respondent_id: row.respondent_id,
      full_name: row.full_name,
      username: row.username,
      response_count: Number(row.response_count ?? 0),
      last_collected_at: row.last_collected_at ?? null,
    })),
    recent: recent.map(parseResponse),
  });
});

// GET /api/responses (admin/supervisor: all; field_worker: own)
router.get('/', requireAuth, (req, res) => {
  const { form_id, respondent_id, limit } = req.query;
  const cappedLimit = Math.min(Number(limit) || 200, 1000);

  let rows: any[];
  if (req.user!.role === 'admin' || req.user!.role === 'supervisor') {
    rows = db.prepare(`
      SELECT
        r.*,
        f.title AS form_title,
        u.full_name AS respondent_name,
        u.username AS respondent_username
      FROM responses r
      JOIN forms f ON f.id = r.form_id
      JOIN users u ON u.id = r.respondent_id
      WHERE f.org_id = ?
        AND (? IS NULL OR r.form_id = ?)
        AND (? IS NULL OR r.respondent_id = ?)
      ORDER BY r.collected_at DESC
      LIMIT ?
    `).all(
      req.user!.org_id,
      form_id ?? null,
      form_id ?? null,
      respondent_id ?? null,
      respondent_id ?? null,
      cappedLimit
    ) as any[];
  } else {
    rows = db.prepare(`
      SELECT
        r.*,
        f.title AS form_title
      FROM responses r
      JOIN forms f ON f.id = r.form_id
      WHERE r.respondent_id = ?
        AND f.org_id = ?
        AND (? IS NULL OR r.form_id = ?)
      ORDER BY r.collected_at DESC
      LIMIT ?
    `).all(req.user!.id, req.user!.org_id, form_id ?? null, form_id ?? null, cappedLimit) as any[];
  }

  res.json(rows.map(parseResponse));
});

// GET /api/responses/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT
      r.*,
      f.org_id,
      u.full_name AS respondent_name,
      u.username AS respondent_username,
      f.title AS form_title
    FROM responses r
    JOIN forms f ON f.id = r.form_id
    JOIN users u ON u.id = r.respondent_id
    WHERE r.id = ?
  `).get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Response not found' });
    return;
  }
  if (row.org_id !== req.user!.org_id) {
    res.status(404).json({ error: 'Response not found' });
    return;
  }
  if (req.user!.role === 'field_worker' && row.respondent_id !== req.user!.id) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }
  res.json(parseResponse(row));
});

export default router;
