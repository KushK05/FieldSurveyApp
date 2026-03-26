import type { SurveyForm } from '../types';
import type { FormSchema } from '../types/form-schema';
import { getAllForms, saveForms } from './db';

const sampleSchema: FormSchema = {
  fields: [
    {
      key: 'respondent_name',
      type: 'text',
      label: 'Name of respondent',
      required: true,
      placeholder: 'Enter full name',
    },
    {
      key: 'age_group',
      type: 'select',
      label: 'Age group',
      options: ['18-25', '26-35', '36-45', '46-60', '60+'],
      required: true,
    },
    {
      key: 'water_source',
      type: 'radio',
      label: 'Primary water source',
      options: ['Tap', 'Well', 'River', 'Tanker', 'Other'],
    },
    {
      key: 'household_members',
      type: 'number',
      label: 'Number of household members',
      min: 1,
      max: 30,
    },
    {
      key: 'has_toilet',
      type: 'checkbox',
      label: 'Household has a toilet',
    },
    {
      key: 'issues',
      type: 'multi_select',
      label: 'Issues faced (select all that apply)',
      options: ['Water shortage', 'Sanitation', 'Electricity', 'Roads', 'Healthcare'],
    },
    {
      key: 'satisfaction',
      type: 'rating',
      label: 'Overall satisfaction with local services',
      max_stars: 5,
    },
    {
      key: 'photo_house',
      type: 'photo',
      label: 'Photo of dwelling',
      required: false,
    },
    {
      key: 'notes',
      type: 'textarea',
      label: 'Additional observations',
      maxLength: 1000,
      placeholder: 'Any extra notes...',
    },
    {
      key: 'gps',
      type: 'location',
      label: 'GPS coordinates',
      auto_capture: true,
    },
  ],
  settings: {
    allow_draft_save: true,
    require_gps: true,
    show_progress_bar: true,
  },
};

const healthSchema: FormSchema = {
  fields: [
    {
      key: 'section_patient',
      type: 'section_header',
      label: 'Patient Information',
    },
    {
      key: 'patient_name',
      type: 'text',
      label: 'Patient name',
      required: true,
      placeholder: 'Full name',
    },
    {
      key: 'patient_age',
      type: 'number',
      label: 'Age',
      required: true,
      min: 0,
      max: 120,
    },
    {
      key: 'visit_date',
      type: 'date',
      label: 'Date of visit',
      required: true,
    },
    {
      key: 'section_symptoms',
      type: 'section_header',
      label: 'Symptoms & Diagnosis',
    },
    {
      key: 'symptoms',
      type: 'multi_select',
      label: 'Symptoms reported',
      options: ['Fever', 'Cough', 'Diarrhea', 'Headache', 'Body pain', 'Skin rash', 'Other'],
    },
    {
      key: 'diagnosis',
      type: 'textarea',
      label: 'Preliminary diagnosis',
      placeholder: 'Describe findings...',
    },
    {
      key: 'severity',
      type: 'radio',
      label: 'Severity',
      options: ['Mild', 'Moderate', 'Severe'],
      required: true,
    },
    {
      key: 'referred',
      type: 'checkbox',
      label: 'Referred to hospital',
    },
    {
      key: 'gps',
      type: 'location',
      label: 'Location',
      auto_capture: true,
    },
  ],
  settings: {
    allow_draft_save: true,
    require_gps: false,
    show_progress_bar: true,
  },
};

const sampleForms: SurveyForm[] = [
  {
    id: 'form-household-survey',
    org_id: 'org-demo',
    title: 'Household Survey',
    description: 'Baseline household assessment covering water, sanitation, and general living conditions.',
    schema: sampleSchema,
    version: 1,
    status: 'published',
    created_by: 'user-admin',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'form-health-checkup',
    org_id: 'org-demo',
    title: 'Health Checkup',
    description: 'Field health screening form for community health workers.',
    schema: healthSchema,
    version: 1,
    status: 'published',
    created_by: 'user-admin',
    created_at: '2026-02-01T08:00:00Z',
    updated_at: '2026-02-01T08:00:00Z',
  },
];

export async function seedDemoData(): Promise<void> {
  const existing = await getAllForms();
  if (existing.length === 0) {
    await saveForms(sampleForms);
  }
}
