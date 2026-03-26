export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'photo'
  | 'location'
  | 'signature'
  | 'rating'
  | 'section_header';

export interface FormFieldBase {
  key: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
}

export interface TextField extends FormFieldBase {
  type: 'text';
  maxLength?: number;
}

export interface TextareaField extends FormFieldBase {
  type: 'textarea';
  maxLength?: number;
}

export interface NumberField extends FormFieldBase {
  type: 'number';
  min?: number;
  max?: number;
}

export interface SelectField extends FormFieldBase {
  type: 'select';
  options: string[];
}

export interface MultiSelectField extends FormFieldBase {
  type: 'multi_select';
  options: string[];
}

export interface RadioField extends FormFieldBase {
  type: 'radio';
  options: string[];
}

export interface CheckboxField extends FormFieldBase {
  type: 'checkbox';
}

export interface DateField extends FormFieldBase {
  type: 'date';
}

export interface TimeField extends FormFieldBase {
  type: 'time';
}

export interface PhotoField extends FormFieldBase {
  type: 'photo';
}

export interface LocationField extends FormFieldBase {
  type: 'location';
  auto_capture?: boolean;
}

export interface SignatureField extends FormFieldBase {
  type: 'signature';
}

export interface RatingField extends FormFieldBase {
  type: 'rating';
  max_stars?: number;
}

export interface SectionHeaderField extends FormFieldBase {
  type: 'section_header';
}

export type FormField =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | MultiSelectField
  | RadioField
  | CheckboxField
  | DateField
  | TimeField
  | PhotoField
  | LocationField
  | SignatureField
  | RatingField
  | SectionHeaderField;

export interface FormSettings {
  allow_draft_save?: boolean;
  require_gps?: boolean;
  show_progress_bar?: boolean;
}

export interface FormSchema {
  fields: FormField[];
  settings?: FormSettings;
}
