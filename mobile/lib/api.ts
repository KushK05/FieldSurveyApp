import type { User, SurveyForm, SurveyResponse } from '../types';

async function request<T>(
  serverUrl: string,
  path: string,
  options?: { method?: string; body?: any; token?: string; timeout?: number }
): Promise<T> {
  const { method = 'GET', body, token, timeout = 10000 } = options || {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${serverUrl}${path}`, {
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
    async login(serverUrl: string, username: string, password: string): Promise<{ token: string; user: User }> {
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
