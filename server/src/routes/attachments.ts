import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const responseId = req.body.response_id || 'unknown';
    const dir = path.join(UPLOADS_DIR, responseId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/attachments
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const { response_id, field_key } = req.body;
  if (!response_id || !field_key) {
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'response_id and field_key are required' });
    return;
  }

  const id = req.body.id || uuidv4();
  const relativePath = path.relative(UPLOADS_DIR, req.file.path);

  db.prepare(
    'INSERT OR REPLACE INTO attachments (id, response_id, field_key, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, response_id, field_key, relativePath, req.file.mimetype, req.file.size);

  res.status(201).json({
    id,
    response_id,
    field_key,
    file_path: relativePath,
    file_type: req.file.mimetype,
    file_size: req.file.size,
  });
});

// GET /api/attachments/:id
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Attachment not found' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, row.file_path);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  res.type(row.file_type).sendFile(filePath);
});

// GET /api/attachments?response_id=X
router.get('/', requireAuth, (req, res) => {
  const { response_id } = req.query;
  if (!response_id) {
    res.status(400).json({ error: 'response_id query parameter is required' });
    return;
  }

  const rows = db.prepare('SELECT * FROM attachments WHERE response_id = ?').all(response_id as string);
  res.json(rows);
});

export default router;
