import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { signToken, requireAuth, requireRole } from '../middleware/auth.js';
import { createManagedUser, deliverInitialCredentials } from '../lib/user-service.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).optional(),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'supervisor', 'field_worker']).default('field_worker'),
  phone: z.string().trim().min(6).optional(),
  delivery_channel: z.enum(['sms', 'whatsapp', 'manual']).default('manual'),
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const { username, password } = parsed.data;

  const user = db.prepare(
    'SELECT id, org_id, full_name, username, password_hash, role, is_active FROM users WHERE username = ?'
  ).get(username) as any;

  if (user && Number(user.is_active ?? 1) !== 1) {
    res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
    return;
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), new Date().toISOString(), user.id);

  const token = signToken({ id: user.id, org_id: user.org_id, role: user.role, username: user.username });

  res.json({
    token,
    user: {
      id: user.id,
      org_id: user.org_id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, org_id, full_name, username, role, phone, delivery_channel, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.user!.id) as any;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// POST /api/auth/register (admin only)
router.post('/register', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
    return;
  }

  const { username, password, full_name, role, phone, delivery_channel } = parsed.data;

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

    deliverInitialCredentials(user, generatedPassword)
      .then((delivery) => {
        res.status(201).json({
          user,
          generated_password: generatedPassword,
          credential_delivery: delivery,
        });
      })
      .catch((error) => {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to send credentials',
        });
      });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create user',
    });
  }
});

export default router;
