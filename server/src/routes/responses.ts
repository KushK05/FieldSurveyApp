import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateResponseData } from '../lib/form-schema.js';
import { quoteIdentifier, resolveFormDataTableName } from '../lib/form-data-table.js';

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

type FormVersionRecord = {
  schema: string;
  status: string;
  version: number;
  org_id: string;
  data_table: string | null;
};

type FormTableRecord = {
  id: string;
  title: string;
  version: number;
  data_table: string | null;
};

type ResponseRow = {
  id: string;
  form_id: string;
  form_version: number;
  volunteer_id: string;
  data: string;
  location: string | null;
  collected_at: string;
  synced_at: string | null;
  device_id: string | null;
  created_at: string;
};

function parseResponse<T extends Record<string, unknown>>(row: T & { data: string; location: string | null }) {
  return {
    ...row,
    data: JSON.parse(row.data),
    location: row.location ? JSON.parse(row.location) : null,
  };
}

function getFormVersionRecord(formId: string, version: number) {
  return db.prepare(`
    SELECT fv.schema, f.status, f.version, f.org_id, f.data_table
    FROM form_versions fv
    JOIN forms f ON f.id = fv.form_id
    WHERE fv.form_id = ? AND fv.version = ?
  `).get(formId, version) as FormVersionRecord | undefined;
}

function getOrgForms(orgId: string, formId?: string | null): FormTableRecord[] {
  return db.prepare(`
    SELECT id, title, version, data_table
    FROM forms
    WHERE org_id = ?
      AND status != 'archived'
      AND (? IS NULL OR id = ?)
    ORDER BY updated_at DESC
  `).all(orgId, formId ?? null, formId ?? null) as FormTableRecord[];
}

function fetchRowsForForm(
  form: FormTableRecord,
  filters: { volunteerId?: string | null; limit?: number }
): Array<ResponseRow & { form_title: string }> {
  const tableName = resolveFormDataTableName(form);
  const query = `
    SELECT
      id,
      form_id,
      form_version,
      volunteer_id,
      data,
      location,
      collected_at,
      synced_at,
      device_id,
      created_at
    FROM ${quoteIdentifier(tableName)}
    WHERE (? IS NULL OR volunteer_id = ?)
    ORDER BY collected_at DESC
    LIMIT ?
  `;

  return db.prepare(query).all(
    filters.volunteerId ?? null,
    filters.volunteerId ?? null,
    filters.limit ?? 1000
  ).map((row: any) => ({ ...row, form_title: form.title })) as Array<ResponseRow & { form_title: string }>;
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

  return {
    status: 200 as const,
    error: '',
    tableName: resolveFormDataTableName({ id: input.form_id, data_table: formVersion.data_table }),
  };
}

function upsertResponseData(
  payload: z.infer<typeof responseSchema>,
  volunteerId: string,
  tableName: string,
  now: string
) {
  db.prepare(
    `INSERT OR REPLACE INTO ${quoteIdentifier(tableName)}
      (id, form_id, form_version, volunteer_id, data, location, collected_at, synced_at, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    payload.id,
    payload.form_id,
    payload.form_version,
    volunteerId,
    JSON.stringify(payload.data),
    payload.location ? JSON.stringify(payload.location) : null,
    payload.collected_at,
    now,
    payload.device_id || null,
    now,
  );

  // Keep lightweight index for legacy relations (attachments FK and response ownership checks).
  db.prepare(
    `INSERT OR REPLACE INTO responses
      (id, form_id, form_version, respondent_id, data, location, collected_at, synced_at, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    payload.id,
    payload.form_id,
    payload.form_version,
    volunteerId,
    '{}',
    null,
    payload.collected_at,
    now,
    payload.device_id || null,
    now,
  );
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
  upsertResponseData(r, respondentId, validation.tableName, now);

  res.status(201).json({ id: r.id, synced_at: now });
});

// POST /api/responses/batch (upsert multiple responses)
router.post('/batch', requireAuth, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Expected an array of responses' });
    return;
  }

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

      upsertResponseData(r, respondentId, validation.tableName, now);
      results.push({ id: r.id, synced_at: now });
    });
  });

  insertMany();

  res.status(201).json({ synced: results, errors });
});

router.get('/summary', requireAuth, requireRole('admin', 'supervisor'), (req, res) => {
  const { form_id } = req.query;
  const formFilter = typeof form_id === 'string' ? form_id : null;
  const forms = getOrgForms(req.user!.org_id, formFilter);

  let totalResponses = 0;
  const byForm = forms.map((form) => {
    const tableName = resolveFormDataTableName(form);
    const stats = db.prepare(`
      SELECT COUNT(*) AS response_count, MAX(collected_at) AS last_collected_at
      FROM ${quoteIdentifier(tableName)}
    `).get() as { response_count?: number; last_collected_at?: string | null };

    const count = Number(stats.response_count ?? 0);
    totalResponses += count;

    return {
      form_id: form.id,
      title: form.title,
      version: Number(form.version),
      response_count: count,
      last_collected_at: stats.last_collected_at ?? null,
    };
  });

  const users = db.prepare(`
    SELECT id, full_name, username
    FROM users
    WHERE org_id = ? AND role = 'field_worker'
    ORDER BY full_name ASC
  `).all(req.user!.org_id) as Array<{ id: string; full_name: string; username: string }>;

  const byUserCounter = new Map<string, { response_count: number; last_collected_at: string | null }>();
  for (const user of users) {
    byUserCounter.set(user.id, { response_count: 0, last_collected_at: null });
  }

  for (const form of forms) {
    const tableName = resolveFormDataTableName(form);
    const rows = db.prepare(`
      SELECT volunteer_id, COUNT(*) AS response_count, MAX(collected_at) AS last_collected_at
      FROM ${quoteIdentifier(tableName)}
      GROUP BY volunteer_id
    `).all() as Array<{ volunteer_id: string; response_count?: number; last_collected_at?: string | null }>;

    for (const row of rows) {
      const existing = byUserCounter.get(row.volunteer_id);
      if (!existing) continue;

      const nextCount = Number(row.response_count ?? 0);
      const nextLast = row.last_collected_at ?? null;
      existing.response_count += nextCount;
      if (!existing.last_collected_at || (nextLast && nextLast > existing.last_collected_at)) {
        existing.last_collected_at = nextLast;
      }
    }
  }

  const byUser = users.map((user) => {
    const stats = byUserCounter.get(user.id) ?? { response_count: 0, last_collected_at: null };
    return {
      respondent_id: user.id,
      full_name: user.full_name,
      username: user.username,
      response_count: Number(stats.response_count),
      last_collected_at: stats.last_collected_at,
    };
  }).sort((a, b) => b.response_count - a.response_count || a.full_name.localeCompare(b.full_name));

  const userLookup = new Map(users.map((user) => [user.id, user] as const));
  const recentRows: Array<ResponseRow & { form_title: string }> = [];
  for (const form of forms) {
    const tableName = resolveFormDataTableName(form);
    const rows = db.prepare(`
      SELECT id, form_id, form_version, volunteer_id, data, location, collected_at, synced_at, device_id, created_at
      FROM ${quoteIdentifier(tableName)}
      ORDER BY collected_at DESC
      LIMIT 10
    `).all() as ResponseRow[];
    rows.forEach((row) => recentRows.push({ ...row, form_title: form.title }));
  }

  const recent = recentRows
    .sort((a, b) => b.collected_at.localeCompare(a.collected_at))
    .slice(0, 10)
    .map((row) => {
      const volunteer = userLookup.get(row.volunteer_id);
      return parseResponse({
        ...row,
        respondent_id: row.volunteer_id,
        respondent_name: volunteer?.full_name ?? null,
        respondent_username: volunteer?.username ?? null,
      });
    });

  res.json({
    total_responses: totalResponses,
    by_form: byForm,
    by_user: byUser,
    recent,
  });
});

// GET /api/responses (admin/supervisor: all; field_worker: own)
router.get('/', requireAuth, (req, res) => {
  const { form_id, respondent_id, limit } = req.query;
  const cappedLimit = Math.min(Number(limit) || 200, 1000);
  const formFilter = typeof form_id === 'string' ? form_id : null;
  const respondentFilter = typeof respondent_id === 'string' ? respondent_id : null;

  const forms = getOrgForms(req.user!.org_id, formFilter);
  const volunteerFilter = req.user!.role === 'field_worker' ? req.user!.id : respondentFilter;

  const allRows: Array<ResponseRow & { form_title: string }> = [];
  for (const form of forms) {
    const rows = fetchRowsForForm(form, { volunteerId: volunteerFilter, limit: cappedLimit });
    allRows.push(...rows);
  }

  allRows.sort((a, b) => b.collected_at.localeCompare(a.collected_at));
  const limitedRows = allRows.slice(0, cappedLimit);

  if (req.user!.role === 'admin' || req.user!.role === 'supervisor') {
    const userIds = Array.from(new Set(limitedRows.map((row) => row.volunteer_id)));
    const users = userIds.length
      ? db.prepare(`SELECT id, full_name, username FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`).all(...userIds) as Array<{ id: string; full_name: string; username: string }>
      : [];
    const userLookup = new Map(users.map((user) => [user.id, user] as const));

    res.json(limitedRows.map((row) => {
      const volunteer = userLookup.get(row.volunteer_id);
      return parseResponse({
        ...row,
        respondent_id: row.volunteer_id,
        respondent_name: volunteer?.full_name ?? null,
        respondent_username: volunteer?.username ?? null,
      });
    }));
    return;
  }

  res.json(limitedRows.map((row) => parseResponse({
    ...row,
    respondent_id: row.volunteer_id,
  })));
});

// GET /api/responses/:id
router.get('/:id', requireAuth, (req, res) => {
  const indexRow = db.prepare(`
    SELECT r.id, r.form_id, r.respondent_id, f.org_id, f.title AS form_title, f.data_table
    FROM responses r
    JOIN forms f ON f.id = r.form_id
    WHERE r.id = ?
  `).get(req.params.id) as {
    id: string;
    form_id: string;
    respondent_id: string;
    org_id: string;
    form_title: string;
    data_table: string | null;
  } | undefined;

  if (!indexRow || indexRow.org_id !== req.user!.org_id) {
    res.status(404).json({ error: 'Response not found' });
    return;
  }

  if (req.user!.role === 'field_worker' && indexRow.respondent_id !== req.user!.id) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  const tableName = resolveFormDataTableName({ id: indexRow.form_id, data_table: indexRow.data_table });
  const row = db.prepare(`
    SELECT id, form_id, form_version, volunteer_id, data, location, collected_at, synced_at, device_id, created_at
    FROM ${quoteIdentifier(tableName)}
    WHERE id = ?
  `).get(req.params.id) as ResponseRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Response not found' });
    return;
  }

  const volunteer = db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(row.volunteer_id) as { full_name: string; username: string } | undefined;
  res.json(parseResponse({
    ...row,
    form_title: indexRow.form_title,
    respondent_id: row.volunteer_id,
    respondent_name: volunteer?.full_name ?? null,
    respondent_username: volunteer?.username ?? null,
  }));
});

export default router;
