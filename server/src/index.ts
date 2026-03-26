import express from 'express';
import cors from 'cors';
import os from 'os';
import { runMigrations } from './db.js';
import authRoutes from './routes/auth.js';
import formRoutes from './routes/forms.js';
import responseRoutes from './routes/responses.js';
import attachmentRoutes from './routes/attachments.js';

// Run database migrations
runMigrations();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/attachments', attachmentRoutes);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== FieldSurvey Server ===\n');
  console.log(`Server running on port ${PORT}\n`);
  console.log('Access URLs:');
  console.log(`  Local:    http://localhost:${PORT}`);

  // Print all network interfaces so admin knows the IP
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  Network:  http://${addr.address}:${PORT}  (${name})`);
      }
    }
  }

  console.log('\nField workers should enter the Network URL in their app.');
  console.log('Make sure this PC and the phones are on the same WiFi network.\n');
});
