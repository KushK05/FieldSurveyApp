import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../db.js';
import { signToken, requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(4),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'supervisor', 'field_worker']).default('field_worker'),
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
    'SELECT id, org_id, full_name, username, password_hash, role FROM users WHERE username = ?'
  ).get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = signToken({ id: user.id, org_id: user.org_id, role: user.role });

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
    'SELECT id, org_id, full_name, username, role, created_at FROM users WHERE id = ?'
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

  const { username, password, full_name, role } = parsed.data;

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (id, org_id, full_name, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.org_id, full_name, username, password_hash, role);

  res.status(201).json({
    id,
    org_id: req.user!.org_id,
    full_name,
    username,
    role,
  });
});

export default router;
