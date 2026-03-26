import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createManagedUser,
  deliverInitialCredentials,
  resetAndDeliverCredentials,
} from '../lib/user-service.js';

const router = Router();

const userPayloadSchema = z.object({
  full_name: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'supervisor', 'field_worker']).default('field_worker'),
  phone: z.string().trim().min(6).optional(),
  delivery_channel: z.enum(['sms', 'whatsapp', 'manual']).default('manual'),
});

function getActiveAdminCount(orgId: string) {
  const row = db.prepare(
    "SELECT COUNT(*) AS count FROM users WHERE org_id = ? AND role = 'admin' AND is_active = 1"
  ).get(orgId) as { count?: number };

  return Number(row.count ?? 0);
}

router.get('/', requireAuth, requireRole('admin', 'supervisor'), (_req, res) => {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.org_id,
      u.full_name,
      u.username,
      u.role,
      u.phone,
      u.delivery_channel,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at,
      (
        SELECT json_object(
          'status', cd.status,
          'channel', cd.channel,
          'destination', cd.destination,
          'attempted_at', cd.attempted_at,
          'error', cd.error
        )
        FROM credential_deliveries cd
        WHERE cd.user_id = u.id
        ORDER BY cd.created_at DESC
        LIMIT 1
      ) AS latest_delivery
    FROM users u
    WHERE u.org_id = ?
    ORDER BY u.created_at DESC
  `).all(_req.user!.org_id) as any[];

  res.json(rows.map((row) => ({
    id: row.id,
    org_id: row.org_id,
    full_name: row.full_name,
    username: row.username,
    role: row.role,
    phone: row.phone ?? null,
    delivery_channel: row.delivery_channel ?? 'manual',
    is_active: Number(row.is_active ?? 1),
    last_login_at: row.last_login_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    latest_delivery: row.latest_delivery ? JSON.parse(row.latest_delivery) : null,
  })));
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const parsed = userPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid user data', details: parsed.error.issues });
    return;
  }

  const { full_name, username, password, role, phone, delivery_channel } = parsed.data;

  if (delivery_channel !== 'manual' && !phone) {
    res.status(400).json({ error: 'A phone number is required for SMS or WhatsApp delivery' });
    return;
  }

  try {
    const { user, generatedPassword } = createManagedUser({
      orgId: req.user!.org_id,
      fullName: full_name,
      username,
      password,
      role,
      phone,
      deliveryChannel: delivery_channel,
    });

    const delivery = await deliverInitialCredentials(user, generatedPassword);

    res.status(201).json({
      user,
      generated_password: generatedPassword,
      credential_delivery: delivery,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create user',
    });
  }
});

router.post('/:id/resend-credentials', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await resetAndDeliverCredentials(userId, req.user!.org_id);
    res.json({
      user: result.user,
      generated_password: result.generatedPassword,
      credential_delivery: result.delivery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resend credentials';
    res.status(message === 'User not found' ? 404 : 500).json({ error: message });
  }
});

router.patch('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = z.object({
    full_name: z.string().min(1).optional(),
    username: z.string().trim().min(3).max(50).optional(),
    role: z.enum(['admin', 'supervisor', 'field_worker']).optional(),
    phone: z.string().trim().min(6).nullable().optional(),
    delivery_channel: z.enum(['sms', 'whatsapp', 'manual']).optional(),
    is_active: z.boolean().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid user update', details: parsed.error.issues });
    return;
  }

  const existing = db.prepare('SELECT * FROM users WHERE id = ? AND org_id = ?').get(req.params.id, req.user!.org_id) as any;
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const nextUsername = parsed.data.username === undefined
    ? existing.username
    : parsed.data.username.trim().toLowerCase();

  if (nextUsername !== existing.username) {
    const usernameTaken = db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).get(nextUsername, req.params.id);

    if (usernameTaken) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
  }

  const next = {
    full_name: parsed.data.full_name ?? existing.full_name,
    username: nextUsername,
    role: parsed.data.role ?? existing.role,
    phone: parsed.data.phone === undefined ? existing.phone : parsed.data.phone,
    delivery_channel: parsed.data.delivery_channel ?? existing.delivery_channel ?? 'manual',
    is_active: parsed.data.is_active === undefined ? Number(existing.is_active ?? 1) : Number(parsed.data.is_active),
  };

  if (next.delivery_channel !== 'manual' && !next.phone) {
    res.status(400).json({ error: 'A phone number is required for SMS or WhatsApp delivery' });
    return;
  }

  const wouldRemoveLastAdmin = existing.role === 'admin'
    && Number(existing.is_active ?? 1) === 1
    && (next.role !== 'admin' || next.is_active !== 1)
    && getActiveAdminCount(req.user!.org_id) <= 1;

  if (wouldRemoveLastAdmin) {
    res.status(409).json({ error: 'At least one active admin account is required' });
    return;
  }

  db.prepare(`
    UPDATE users
    SET full_name = ?, username = ?, role = ?, phone = ?, delivery_channel = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.full_name,
    next.username,
    next.role,
    next.phone ?? null,
    next.delivery_channel,
    next.is_active,
    new Date().toISOString(),
    req.params.id
  );

  const updated = db.prepare(`
    SELECT id, org_id, full_name, username, role, phone, delivery_channel, is_active, last_login_at, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const existing = db.prepare(
    'SELECT id, org_id, role, is_active FROM users WHERE id = ? AND org_id = ?'
  ).get(req.params.id, req.user!.org_id) as any;

  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (existing.id === req.user!.id) {
    res.status(409).json({ error: 'You cannot delete your own account' });
    return;
  }

  if (existing.role === 'admin' && Number(existing.is_active ?? 1) === 1 && getActiveAdminCount(req.user!.org_id) <= 1) {
    res.status(409).json({ error: 'At least one active admin account is required' });
    return;
  }

  const formCountRow = db.prepare(
    'SELECT COUNT(*) AS count FROM forms WHERE created_by = ?'
  ).get(req.params.id) as { count?: number };
  const responseCountRow = db.prepare(
    'SELECT COUNT(*) AS count FROM responses WHERE respondent_id = ?'
  ).get(req.params.id) as { count?: number };

  const formCount = Number(formCountRow.count ?? 0);
  const responseCount = Number(responseCountRow.count ?? 0);

  if (formCount > 0 || responseCount > 0) {
    res.status(409).json({
      error: 'Cannot delete a user with existing forms or responses. Deactivate the account instead.',
    });
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
