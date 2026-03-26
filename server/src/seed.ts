import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { runMigrations } from './db.js';
import { buildFormDataTableName, createFormDataTable } from './lib/form-data-table.js';

runMigrations();

const ORG_ID = 'org-demo';
const ADMIN_ID = uuidv4();
const WORKER_ID = uuidv4();

// Create users
const insertUser = db.prepare(
  `INSERT OR IGNORE INTO users
    (id, org_id, full_name, username, password_hash, role, phone, delivery_channel, is_active, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
);

const now = new Date().toISOString();

const existingAdmin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!existingAdmin) {
  insertUser.run(ADMIN_ID, ORG_ID, 'Admin', 'admin', bcrypt.hashSync('admin123', 10), 'admin', '+910000000001', 'manual', now, now);
  console.log('Created admin user: admin / admin123');
} else {
  console.log('Admin user already exists');
}

const existingWorker = db.prepare("SELECT id FROM users WHERE username = 'worker1'").get();
if (!existingWorker) {
  insertUser.run(WORKER_ID, ORG_ID, 'Field Worker 1', 'worker1', bcrypt.hashSync('field123', 10), 'field_worker', '+910000000002', 'manual', now, now);
  console.log('Created field worker: worker1 / field123');
} else {
  console.log('Field worker already exists');
}

// Get admin ID for form creation
const admin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as any;

// Sample form schemas (same as web app)
const householdSchema = {
  fields: [
    { key: 'respondent_name', type: 'text', label: 'Name of respondent', required: true, placeholder: 'Enter full name' },
    { key: 'age_group', type: 'select', label: 'Age group', options: ['18-25', '26-35', '36-45', '46-60', '60+'], required: true },
    { key: 'water_source', type: 'radio', label: 'Primary water source', options: ['Tap', 'Well', 'River', 'Tanker', 'Other'] },
    { key: 'household_members', type: 'number', label: 'Number of household members', min: 1, max: 30 },
    { key: 'has_toilet', type: 'checkbox', label: 'Household has a toilet' },
    { key: 'issues', type: 'multi_select', label: 'Issues faced (select all that apply)', options: ['Water shortage', 'Sanitation', 'Electricity', 'Roads', 'Healthcare'] },
    { key: 'satisfaction', type: 'rating', label: 'Overall satisfaction with local services', max_stars: 5 },
    { key: 'photo_house', type: 'photo', label: 'Photo of dwelling', required: false },
    { key: 'notes', type: 'textarea', label: 'Additional observations', maxLength: 1000, placeholder: 'Any extra notes...' },
    { key: 'gps', type: 'location', label: 'GPS coordinates', auto_capture: true },
  ],
  settings: { allow_draft_save: true, require_gps: true, show_progress_bar: true },
};

const healthSchema = {
  fields: [
    { key: 'section_patient', type: 'section_header', label: 'Patient Information' },
    { key: 'patient_name', type: 'text', label: 'Patient name', required: true, placeholder: 'Full name' },
    { key: 'patient_age', type: 'number', label: 'Age', required: true, min: 0, max: 120 },
    { key: 'visit_date', type: 'date', label: 'Date of visit', required: true },
    { key: 'section_symptoms', type: 'section_header', label: 'Symptoms & Diagnosis' },
    { key: 'symptoms', type: 'multi_select', label: 'Symptoms reported', options: ['Fever', 'Cough', 'Diarrhea', 'Headache', 'Body pain', 'Skin rash', 'Other'] },
    { key: 'diagnosis', type: 'textarea', label: 'Preliminary diagnosis', placeholder: 'Describe findings...' },
    { key: 'severity', type: 'radio', label: 'Severity', options: ['Mild', 'Moderate', 'Severe'], required: true },
    { key: 'referred', type: 'checkbox', label: 'Referred to hospital' },
    { key: 'gps', type: 'location', label: 'Location', auto_capture: true },
  ],
  settings: { allow_draft_save: true, require_gps: false, show_progress_bar: true },
};

const insertForm = db.prepare(
  'INSERT OR IGNORE INTO forms (id, org_id, title, description, schema, data_table, version, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

const existingForms = db.prepare('SELECT COUNT(*) as count FROM forms').get() as any;
if (existingForms.count === 0) {
  const householdTable = buildFormDataTableName('form-household-survey');
  insertForm.run('form-household-survey', ORG_ID, 'Household Survey',
    'Baseline household assessment covering water, sanitation, and general living conditions.',
    JSON.stringify(householdSchema), householdTable, 1, 'published', admin.id, now, now);
  createFormDataTable(db, householdTable);
  console.log('Created form: Household Survey');

  const healthTable = buildFormDataTableName('form-health-checkup');
  insertForm.run('form-health-checkup', ORG_ID, 'Health Checkup',
    'Field health screening form for community health workers.',
    JSON.stringify(healthSchema), healthTable, 1, 'published', admin.id, now, now);
  createFormDataTable(db, healthTable);
  console.log('Created form: Health Checkup');
} else {
  console.log(`Forms already exist (${existingForms.count} found)`);
}

console.log('\nSeed complete!');
