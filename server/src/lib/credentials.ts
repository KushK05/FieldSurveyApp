import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { config } from '../config.js';

export type CredentialChannel = 'sms' | 'whatsapp' | 'manual';

type DeliveryResult = {
  id: string;
  status: 'pending' | 'sent' | 'logged' | 'failed' | 'manual';
  provider: string;
  attempted_at: string | null;
  destination: string | null;
  error: string | null;
};

interface DeliverCredentialsInput {
  userId: string;
  fullName: string;
  username: string;
  password: string;
  channel: CredentialChannel;
  destination?: string | null;
}

function buildCredentialMessage(input: DeliverCredentialsInput): string {
  const appName = process.env.FIELD_APP_NAME || 'FieldSurvey';
  const serverHint = config.mobileServerUrl || config.publicServerUrl || 'the server address provided by your admin';

  return [
    `Hello ${input.fullName},`,
    `Your ${appName} account is ready.`,
    `Username: ${input.username}`,
    `Password: ${input.password}`,
    `Server: ${serverHint}`,
    'Open the mobile app and sign in to start collecting data.',
  ].join('\n');
}

function insertDeliveryLog(result: DeliveryResult, input: DeliverCredentialsInput) {
  db.prepare(`
    INSERT INTO credential_deliveries
      (id, user_id, channel, destination, status, provider, provider_response, error, created_at, attempted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.id,
    input.userId,
    input.channel,
    input.destination || null,
    result.status,
    result.provider,
    null,
    result.error,
    new Date().toISOString(),
    result.attempted_at
  );
}

export async function deliverCredentials(input: DeliverCredentialsInput): Promise<DeliveryResult> {
  const attemptedAt = new Date().toISOString();
  const destination = input.destination?.trim() || null;
  const message = buildCredentialMessage(input);
  const id = uuidv4();

  if (input.channel === 'manual' || !destination) {
    const result: DeliveryResult = {
      id,
      status: 'manual',
      provider: 'manual',
      attempted_at: null,
      destination,
      error: null,
    };
    insertDeliveryLog(result, input);
    return result;
  }

  const genericWebhook = process.env.CREDENTIAL_WEBHOOK_URL;
  const channelWebhook = input.channel === 'whatsapp'
    ? process.env.WHATSAPP_WEBHOOK_URL || genericWebhook
    : process.env.SMS_WEBHOOK_URL || genericWebhook;

  if (!channelWebhook) {
    console.log(`[credential-delivery:${input.channel}] to=${destination}\n${message}\n`);
    const result: DeliveryResult = {
      id,
      status: 'logged',
      provider: 'console',
      attempted_at: attemptedAt,
      destination,
      error: null,
    };
    insertDeliveryLog(result, input);
    return result;
  }

  try {
    const response = await fetch(channelWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: input.channel,
        to: destination,
        message,
        user: {
          id: input.userId,
          full_name: input.fullName,
          username: input.username,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Provider returned HTTP ${response.status}`);
    }

    const result: DeliveryResult = {
      id,
      status: 'sent',
      provider: 'webhook',
      attempted_at: attemptedAt,
      destination,
      error: null,
    };
    insertDeliveryLog(result, input);
    return result;
  } catch (error) {
    const result: DeliveryResult = {
      id,
      status: 'failed',
      provider: 'webhook',
      attempted_at: attemptedAt,
      destination,
      error: error instanceof Error ? error.message : 'Credential delivery failed',
    };
    insertDeliveryLog(result, input);
    return result;
  }
}
