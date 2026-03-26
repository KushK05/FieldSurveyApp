import express from 'express';
import cors from 'cors';
import os from 'os';
import { runMigrations } from './db.js';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import formRoutes from './routes/forms.js';
import responseRoutes from './routes/responses.js';
import attachmentRoutes from './routes/attachments.js';
import userRoutes from './routes/users.js';

// Run database migrations
runMigrations();

const app = express();
const requestedPort = config.port;
const hasExplicitPort = typeof process.env.PORT === 'string' && process.env.PORT.length > 0;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/attachments', attachmentRoutes);

function logServerStart(port: number) {
  console.log('\n=== FieldSurvey Server ===\n');
  console.log(`Server running on port ${port}\n`);
  console.log(`Data directory: ${config.dataDir}`);
  console.log(`SQLite DB:      ${config.databasePath}`);
  console.log(`Uploads:        ${config.uploadsDir}\n`);
  console.log('Access URLs:');
  console.log(`  Local:    http://localhost:${port}`);
  console.log(`  Hostname: http://${config.officeHostname}:${port}`);

  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  Network:  http://${addr.address}:${port}  (${name})`);
      }
    }
  }

  console.log('\nField workers should enter the Network URL in their app.');
  console.log('Make sure Windows Firewall allows Node.js on Private networks.');
  console.log('Make sure this PC and the phones are on the same WiFi network.\n');
}

function startServer(port: number, attemptsRemaining = config.maxPortAttempts): void {
  const server = app.listen(port, config.host);

  server.once('listening', () => {
    logServerStart(port);
  });

  server.once('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && !hasExplicitPort && attemptsRemaining > 0) {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      startServer(nextPort, attemptsRemaining - 1);
      return;
    }

    if (error.code === 'EADDRINUSE' && hasExplicitPort) {
      console.error(`Port ${port} is already in use. Set a different PORT value and try again.`);
    } else {
      console.error('Server failed to start:', error);
    }

    process.exit(1);
  });
}

startServer(requestedPort);
