import Database from 'better-sqlite3';

const baseUrl = process.env.FIELD_BASE_URL || 'http://127.0.0.1:3001';
const rand = Math.random().toString(36).slice(2, 8);

const formPayload = {
  title: `QA Test Form ${rand}`,
  description: 'Random form created during end-to-end backend verification.',
  status: 'published',
  schema: {
    fields: [
      { key: 'beneficiary_name', type: 'text', label: 'Beneficiary Name', required: true },
      { key: 'household_size', type: 'number', label: 'Household Size', required: true, min: 1, max: 20 },
      { key: 'priority', type: 'select', label: 'Priority', required: true, options: ['low', 'medium', 'high'] },
      { key: 'notes', type: 'textarea', label: 'Notes' },
      { key: 'gps', type: 'location', label: 'GPS', required: true, auto_capture: false },
    ],
    settings: {
      allow_draft_save: true,
      require_gps: true,
      show_progress_bar: true,
    },
  },
};

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

const adminLogin = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
});

const createdForm = await request('/api/forms', {
  method: 'POST',
  headers: { Authorization: `Bearer ${adminLogin.token}` },
  body: JSON.stringify(formPayload),
});

const workerLogin = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'worker1', password: 'field123' }),
});

const responsePayload = {
  id: crypto.randomUUID(),
  form_id: createdForm.id,
  form_version: createdForm.version,
  respondent_id: workerLogin.user.id,
  data: {
    beneficiary_name: 'Ravi Kumar',
    household_size: 5,
    priority: 'high',
    notes: 'Visited during office test run.',
    gps: { lat: 28.6139, lng: 77.209, accuracy: 8 },
  },
  location: { lat: 28.6139, lng: 77.209, accuracy: 8 },
  collected_at: new Date().toISOString(),
  device_id: 'qa-test-device',
};

const submitted = await request('/api/responses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${workerLogin.token}` },
  body: JSON.stringify(responsePayload),
});

const adminResponses = await request(`/api/responses?form_id=${createdForm.id}&limit=5`, {
  headers: { Authorization: `Bearer ${adminLogin.token}` },
});

const summary = await request(`/api/responses/summary?form_id=${createdForm.id}`, {
  headers: { Authorization: `Bearer ${adminLogin.token}` },
});

const db = new Database('./data/survey.db', { readonly: true });
const formRow = db.prepare(
  'SELECT id, title, version, status, created_at FROM forms WHERE id = ?'
).get(createdForm.id);
const responseRow = db.prepare(
  'SELECT id, form_id, form_version, respondent_id, collected_at, synced_at, device_id FROM responses WHERE id = ?'
).get(responsePayload.id);
const responseDataRow = db.prepare(
  'SELECT data, location FROM responses WHERE id = ?'
).get(responsePayload.id);

console.log(JSON.stringify({
  admin_user: adminLogin.user,
  worker_user: workerLogin.user,
  created_form: createdForm,
  submitted_response: submitted,
  api_responses: adminResponses,
  api_summary: summary,
  db_form_row: formRow,
  db_response_row: responseRow,
  db_response_payload: {
    data: JSON.parse(responseDataRow.data),
    location: JSON.parse(responseDataRow.location),
  },
}, null, 2));
