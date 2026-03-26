import { z } from 'zod';

const fieldBaseSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
});

const textFieldSchema = fieldBaseSchema.extend({
  type: z.literal('text'),
  maxLength: z.number().int().positive().optional(),
});

const textareaFieldSchema = fieldBaseSchema.extend({
  type: z.literal('textarea'),
  maxLength: z.number().int().positive().optional(),
});

const numberFieldSchema = fieldBaseSchema.extend({
  type: z.literal('number'),
  min: z.number().optional(),
  max: z.number().optional(),
});

const selectFieldSchema = fieldBaseSchema.extend({
  type: z.literal('select'),
  options: z.array(z.string().min(1)).min(1),
});

const multiSelectFieldSchema = fieldBaseSchema.extend({
  type: z.literal('multi_select'),
  options: z.array(z.string().min(1)).min(1),
});

const radioFieldSchema = fieldBaseSchema.extend({
  type: z.literal('radio'),
  options: z.array(z.string().min(1)).min(1),
});

const checkboxFieldSchema = fieldBaseSchema.extend({
  type: z.literal('checkbox'),
});

const dateFieldSchema = fieldBaseSchema.extend({
  type: z.literal('date'),
});

const timeFieldSchema = fieldBaseSchema.extend({
  type: z.literal('time'),
});

const photoFieldSchema = fieldBaseSchema.extend({
  type: z.literal('photo'),
});

const locationFieldSchema = fieldBaseSchema.extend({
  type: z.literal('location'),
  auto_capture: z.boolean().optional(),
});

const signatureFieldSchema = fieldBaseSchema.extend({
  type: z.literal('signature'),
});

const ratingFieldSchema = fieldBaseSchema.extend({
  type: z.literal('rating'),
  max_stars: z.number().int().positive().max(10).optional(),
});

const sectionHeaderSchema = fieldBaseSchema.extend({
  type: z.literal('section_header'),
});

export const formFieldSchema = z.discriminatedUnion('type', [
  textFieldSchema,
  textareaFieldSchema,
  numberFieldSchema,
  selectFieldSchema,
  multiSelectFieldSchema,
  radioFieldSchema,
  checkboxFieldSchema,
  dateFieldSchema,
  timeFieldSchema,
  photoFieldSchema,
  locationFieldSchema,
  signatureFieldSchema,
  ratingFieldSchema,
  sectionHeaderSchema,
]);

export const formSchemaDefinitionSchema = z.object({
  fields: z.array(formFieldSchema).min(1),
  settings: z.object({
    allow_draft_save: z.boolean().optional(),
    require_gps: z.boolean().optional(),
    show_progress_bar: z.boolean().optional(),
  }).optional(),
});

export const formPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().trim().optional().transform((value) => value || undefined),
  schema: formSchemaDefinitionSchema,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export type FormSchemaDefinition = z.infer<typeof formSchemaDefinitionSchema>;

type ValidationResult = {
  ok: boolean;
  errors: string[];
};

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function isLocationValue(value: unknown): value is { lat: number; lng: number; accuracy?: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.lat === 'number' && typeof candidate.lng === 'number';
}

export function validateResponseData(
  schema: FormSchemaDefinition,
  data: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];

  for (const field of schema.fields) {
    if (field.type === 'section_header') {
      continue;
    }

    const value = data[field.key];

    if (field.required) {
      if (field.type === 'checkbox') {
        if (value !== true) {
          errors.push(`Field "${field.label}" must be checked.`);
          continue;
        }
      } else if (isEmptyValue(value)) {
        errors.push(`Field "${field.label}" is required.`);
        continue;
      }
    }

    if (isEmptyValue(value)) {
      continue;
    }

    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'photo':
      case 'signature':
      case 'date':
      case 'time':
        if (typeof value !== 'string') {
          errors.push(`Field "${field.label}" must be a string.`);
          continue;
        }
        if ('maxLength' in field && field.maxLength && value.length > field.maxLength) {
          errors.push(`Field "${field.label}" exceeds the maximum length.`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push(`Field "${field.label}" must be a number.`);
          continue;
        }
        if (field.min !== undefined && value < field.min) {
          errors.push(`Field "${field.label}" must be at least ${field.min}.`);
        }
        if (field.max !== undefined && value > field.max) {
          errors.push(`Field "${field.label}" must be at most ${field.max}.`);
        }
        break;

      case 'select':
      case 'radio':
        if (typeof value !== 'string' || !field.options.includes(value)) {
          errors.push(`Field "${field.label}" must be one of the configured options.`);
        }
        break;

      case 'multi_select':
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
          errors.push(`Field "${field.label}" must be a list of strings.`);
          continue;
        }
        if (value.some((item) => !field.options.includes(item))) {
          errors.push(`Field "${field.label}" contains invalid selections.`);
        }
        break;

      case 'checkbox':
        if (typeof value !== 'boolean') {
          errors.push(`Field "${field.label}" must be true or false.`);
        }
        break;

      case 'location':
        if (!isLocationValue(value)) {
          errors.push(`Field "${field.label}" must contain latitude and longitude.`);
        }
        break;

      case 'rating': {
        const max = field.max_stars ?? 5;
        if (typeof value !== 'number' || Number.isNaN(value) || value < 1 || value > max) {
          errors.push(`Field "${field.label}" must be a rating between 1 and ${max}.`);
        }
        break;
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
