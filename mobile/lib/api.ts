import type {
  AdminManagedUser,
  AuthResponse,
  CredentialsDelivery,
  ResponseSummary,
  SurveyForm,
  SurveyResponse,
  SurveyResponseRecord,
  User,
} from '../types';
import type { FormSchema } from '../types';

export function normalizeServerUrl(serverUrl: string): string {
  const trimmed = serverUrl.trim();
  if (!trimmed) return '';
  return (trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `http://${trimmed}`)
    .replace(/\/+$/, '');
}

async function request<T>(
  serverUrl: string,
  path: string,
  options?: { method?: string; body?: any; token?: string; timeout?: number }
): Promise<T> {
  const { method = 'GET', body, token, timeout = 10000 } = options || {};
  const normalizedServerUrl = normalizeServerUrl(serverUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${normalizedServerUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: {
    async ping(serverUrl: string): Promise<boolean> {
      try {
        await request(serverUrl, '/api/health', { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    },
  },

  auth: {
    async login(serverUrl: string, username: string, password: string): Promise<AuthResponse> {
      return request(serverUrl, '/api/auth/login', {
        method: 'POST',
        body: { username, password },
      });
    },

    async me(serverUrl: string, token: string): Promise<User> {
      return request(serverUrl, '/api/auth/me', { token });
    },
  },

  forms: {
    async list(serverUrl: string, token: string): Promise<SurveyForm[]> {
      return request(serverUrl, '/api/forms', { token });
    },

    async get(serverUrl: string, token: string, id: string): Promise<SurveyForm> {
      return request(serverUrl, '/api/forms/' + id, { token });
    },

    async create(serverUrl: string, token: string, input: {
      title: string;
      description?: string;
      status: 'draft' | 'published' | 'archived';
      schema: FormSchema;
    }): Promise<SurveyForm> {
      return request(serverUrl, '/api/forms', {
        method: 'POST',
        token,
        body: input,
      });
    },

    async update(serverUrl: string, token: string, id: string, input: {
      title: string;
      description?: string;
      status: 'draft' | 'published' | 'archived';
      schema: FormSchema;
    }): Promise<SurveyForm> {
      return request(serverUrl, `/api/forms/${id}`, {
        method: 'PUT',
        token,
        body: input,
      });
    },

    async archive(serverUrl: string, token: string, id: string): Promise<{ success: true }> {
      return request(serverUrl, `/api/forms/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  },

  responses: {
    async submit(serverUrl: string, token: string, response: SurveyResponse): Promise<{ id: string; synced_at: string }> {
      return request(serverUrl, '/api/responses', {
        method: 'POST',
        body: {
          id: response.id,
          form_id: response.form_id,
          form_version: response.form_version,
          respondent_id: response.respondent_id,
          data: response.data,
          location: response.location,
          collected_at: response.collected_at,
          device_id: response.device_id,
        },
        token,
        timeout: 30000,
      });
    },

    async submitBatch(serverUrl: string, token: string, responses: SurveyResponse[]): Promise<any> {
      return request(serverUrl, '/api/responses/batch', {
        method: 'POST',
        body: responses.map(r => ({
          id: r.id,
          form_id: r.form_id,
          form_version: r.form_version,
          respondent_id: r.respondent_id,
          data: r.data,
          location: r.location,
          collected_at: r.collected_at,
          device_id: r.device_id,
        })),
        token,
        timeout: 60000,
      });
    },

    async list(serverUrl: string, token: string, params: { formId?: string; respondentId?: string; limit?: number } = {}): Promise<SurveyResponseRecord[]> {
      const query = new URLSearchParams();
      if (params.formId) query.set('form_id', params.formId);
      if (params.respondentId) query.set('respondent_id', params.respondentId);
      if (params.limit) query.set('limit', String(params.limit));

      return request(
        serverUrl,
        `/api/responses${query.size ? `?${query.toString()}` : ''}`,
        { token }
      );
    },

    async summary(serverUrl: string, token: string, formId?: string): Promise<ResponseSummary> {
      const query = formId ? `?form_id=${encodeURIComponent(formId)}` : '';
      return request(serverUrl, `/api/responses/summary${query}`, { token });
    },
  },

  users: {
    async list(serverUrl: string, token: string): Promise<AdminManagedUser[]> {
      return request(serverUrl, '/api/users', { token });
    },

    async create(serverUrl: string, token: string, input: {
      full_name: string;
      username?: string;
      password?: string;
      role: 'admin' | 'supervisor' | 'field_worker';
      phone?: string;
      delivery_channel: 'sms' | 'whatsapp' | 'manual';
    }): Promise<{
      user: AdminManagedUser;
      generated_password: string;
      credential_delivery: CredentialsDelivery;
    }> {
      return request(serverUrl, '/api/users', {
        method: 'POST',
        token,
        body: input,
      });
    },

    async resendCredentials(serverUrl: string, token: string, id: string): Promise<{
      user: AdminManagedUser;
      generated_password: string;
      credential_delivery: CredentialsDelivery;
    }> {
      return request(serverUrl, `/api/users/${id}/resend-credentials`, {
        method: 'POST',
        token,
      });
    },
  },

  attachments: {
    async upload(
      serverUrl: string,
      token: string,
      id: string,
      responseId: string,
      fieldKey: string,
      fileUri: string
    ): Promise<void> {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('response_id', responseId);
      formData.append('field_key', fieldKey);
      formData.append('file', {
        uri: fileUri,
        type: 'image/jpeg',
        name: `${fieldKey}.jpg`,
      } as any);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch(`${serverUrl}/api/attachments`, {
          // FormData upload should not force JSON headers.
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    },
  },
};
