import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { deliverCredentials, type CredentialChannel } from './credentials.js';

export interface ManagedUser {
  id: string;
  org_id: string;
  full_name: string;
  username: string;
  role: 'admin' | 'supervisor' | 'field_worker';
  phone: string | null;
  delivery_channel: CredentialChannel;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateManagedUserInput {
  orgId: string;
  fullName: string;
  role: 'admin' | 'supervisor' | 'field_worker';
  username?: string;
  password?: string;
  phone?: string | null;
  deliveryChannel?: CredentialChannel;
}

function slugifyUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30) || 'user';
}

function generatePassword(): string {
  return `FS-${Math.random().toString(36).slice(2, 8)}${Math.floor(100 + Math.random() * 900)}`;
}

function getUniqueUsername(base: string): string {
  let username = base;
  let counter = 1;

  while (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    counter += 1;
    username = `${base}.${counter}`;
  }

  return username;
}

export function serializeUser(row: any): ManagedUser {
  return {
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
  };
}

export function getUserById(id: string, orgId?: string): ManagedUser | null {
  const row = orgId
    ? db.prepare('SELECT * FROM users WHERE id = ? AND org_id = ?').get(id, orgId)
    : db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return row ? serializeUser(row) : null;
}

export function createManagedUser(input: CreateManagedUserInput): { user: ManagedUser; generatedPassword: string } {
  const now = new Date().toISOString();
  const id = uuidv4();
  const usernameBase = slugifyUsername(input.username || input.fullName);
  const username = getUniqueUsername(usernameBase);
  const generatedPassword = input.password || generatePassword();
  const passwordHash = bcrypt.hashSync(generatedPassword, 10);
  const deliveryChannel = input.deliveryChannel || 'manual';

  db.prepare(`
    INSERT INTO users (
      id, org_id, full_name, username, password_hash, role, phone, delivery_channel, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    input.orgId,
    input.fullName,
    username,
    passwordHash,
    input.role,
    input.phone || null,
    deliveryChannel,
    now,
    now
  );

  const user = getUserById(id)!;
  return { user, generatedPassword };
}

export async function resetAndDeliverCredentials(userId: string, orgId: string) {
  const user = getUserById(userId, orgId);
  if (!user) {
    throw new Error('User not found');
  }

  const generatedPassword = generatePassword();
  const passwordHash = bcrypt.hashSync(generatedPassword, 10);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, userId);

  const delivery = await deliverCredentials({
    userId: user.id,
    fullName: user.full_name,
    username: user.username,
    password: generatedPassword,
    channel: user.delivery_channel,
    destination: user.phone,
  });

  return { user: getUserById(userId, orgId)!, generatedPassword, delivery };
}

export async function deliverInitialCredentials(user: ManagedUser, password: string) {
  return deliverCredentials({
    userId: user.id,
    fullName: user.full_name,
    username: user.username,
    password,
    channel: user.delivery_channel,
    destination: user.phone,
  });
}
