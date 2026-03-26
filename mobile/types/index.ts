import type { FormSchema } from './form-schema';

export type { FormSchema, FormField, FieldType, FormSettings } from './form-schema';

export type UserRole = 'admin' | 'supervisor' | 'field_worker';

export interface User {
  id: string;
  org_id: string;
  full_name: string;
  username?: string;
  role: UserRole;
  phone?: string | null;
  delivery_channel?: 'sms' | 'whatsapp' | 'manual';
  is_active?: number;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type FormStatus = 'draft' | 'published' | 'archived';

export interface SurveyForm {
  id: string;
  org_id: string;
  title: string;
  description?: string;
  schema: FormSchema;
  version: number;
  status: FormStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  response_count?: number;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SurveyResponse {
  id: string;
  form_id: string;
  form_version: number;
  respondent_id: string;
  data: Record<string, unknown>;
  location?: { lat: number; lng: number; accuracy: number } | null;
  collected_at: string;
  synced_at?: string | null;
  device_id?: string;
  sync_status: SyncStatus;
}

export interface Attachment {
  id: string;
  response_id: string;
  field_key: string;
  file_uri: string;
  file_type: string;
  file_size: number;
  sync_status: SyncStatus;
}

export interface SyncQueueItem {
  id: string;
  type: 'response' | 'attachment';
  reference_id: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  last_attempt: number | null;
  created_at: number;
  error?: string;
}

export interface CredentialsDelivery {
  id?: string;
  channel?: 'sms' | 'whatsapp' | 'manual';
  destination?: string | null;
  status: 'pending' | 'sent' | 'logged' | 'failed' | 'manual';
  attempted_at?: string | null;
  error?: string | null;
}

export interface AdminManagedUser extends User {
  latest_delivery?: CredentialsDelivery | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SurveyResponseRecord extends SurveyResponse {
  form_title?: string;
  respondent_name?: string;
  respondent_username?: string;
  created_at?: string;
}

export interface ResponseSummary {
  total_responses: number;
  by_form: Array<{
    form_id: string;
    title: string;
    version: number;
    response_count: number;
    last_collected_at: string | null;
  }>;
  by_user: Array<{
    respondent_id: string;
    full_name: string;
    username?: string;
    response_count: number;
    last_collected_at: string | null;
  }>;
  recent: SurveyResponseRecord[];
}
