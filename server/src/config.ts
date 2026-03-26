import fs from 'fs';
import os from 'os';
import path from 'path';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveDataDir(): string {
  if (process.env.FIELD_SURVEY_DATA_DIR) {
    return path.resolve(process.env.FIELD_SURVEY_DATA_DIR);
  }

  if (process.platform === 'win32' && process.env.PROGRAMDATA) {
    return path.join(process.env.PROGRAMDATA, 'FieldSurvey');
  }

  if (process.env.XDG_DATA_HOME) {
    return path.join(process.env.XDG_DATA_HOME, 'fieldsurvey');
  }

  return path.resolve(process.cwd(), 'data');
}

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: parsePort(process.env.PORT, 3000),
  maxPortAttempts: parsePort(process.env.MAX_PORT_ATTEMPTS, 10),
  dataDir: resolveDataDir(),
  uploadsDir: '',
  databasePath: '',
  publicServerUrl: process.env.PUBLIC_SERVER_URL || '',
  mobileServerUrl: process.env.MOBILE_SERVER_URL || process.env.PUBLIC_SERVER_URL || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  officeHostname: os.hostname(),
};

config.uploadsDir = path.join(config.dataDir, 'uploads');
config.databasePath = path.join(config.dataDir, 'survey.db');

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadsDir, { recursive: true });
