import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import type { FormSchema, FormField as FormFieldDef } from '../../types/form-schema';
import { TextField } from './fields/TextField';
import { NumberField } from './fields/NumberField';
import { SelectField } from './fields/SelectField';
import { RadioField } from './fields/RadioField';
import { CheckboxField } from './fields/CheckboxField';
import { MultiSelectField } from './fields/MultiSelectField';
import { DateField } from './fields/DateField';
import { LocationField } from './fields/LocationField';
import { PhotoField } from './fields/PhotoField';
import { RatingField } from './fields/RatingField';
import { SectionHeader } from './fields/SectionHeader';

interface SurveyRendererProps {
  schema: FormSchema;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onSaveDraft?: (data: Record<string, unknown>) => void;
}

export function SurveyRenderer({ schema, defaultValues, onSubmit, onSaveDraft }: SurveyRendererProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({
    defaultValues: defaultValues || {},
  });

  const fillableFields = useMemo(
    () => schema.fields.filter((f) => f.type !== 'section_header'),
    [schema.fields]
  );

  const watchAll = watch();
  const filledCount = useMemo(() => {
    return fillableFields.filter((f) => {
      const val = watchAll[f.key];
      if (val === undefined || val === null || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }).length;
  }, [fillableFields, watchAll]);

  const progress = fillableFields.length > 0
    ? Math.round((filledCount / fillableFields.length) * 100)
    : 0;

  const renderField = (field: FormFieldDef) => {
    switch (field.type) {
      case 'text':
      case 'textarea':
        return <TextField key={field.key} field={field} register={register} errors={errors} />;
      case 'number':
        return <NumberField key={field.key} field={field} register={register} errors={errors} />;
      case 'select':
        return <SelectField key={field.key} field={field} register={register} errors={errors} />;
      case 'radio':
        return <RadioField key={field.key} field={field} register={register} errors={errors} />;
      case 'checkbox':
        return <CheckboxField key={field.key} field={field} register={register} errors={errors} />;
      case 'multi_select':
        return <MultiSelectField key={field.key} field={field} register={register} errors={errors} />;
      case 'date':
        return <DateField key={field.key} field={field} register={register} errors={errors} />;
      case 'time':
        return <DateField key={field.key} field={{ ...field, type: 'date' }} register={register} errors={errors} />;
      case 'location':
        return <LocationField key={field.key} field={field} setValue={setValue} watch={watch} />;
      case 'photo':
        return <PhotoField key={field.key} field={field} setValue={setValue} watch={watch} />;
      case 'rating':
        return <RatingField key={field.key} field={field} setValue={setValue} watch={watch} />;
      case 'section_header':
        return <SectionHeader key={field.key} field={field} />;
      default:
        return null;
    }
  };

  return (
    <div className="pb-4">
      {/* Progress bar */}
      {schema.settings?.show_progress_bar && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Progress</span>
            <span className="text-xs font-semibold text-primary">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-5">
        {schema.fields.map(renderField)}

        <div className="flex gap-3 pt-4">
          {onSaveDraft && schema.settings?.allow_draft_save && (
            <button
              type="button"
              onClick={() => onSaveDraft(getValues())}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-medium text-sm active:bg-gray-50 transition-colors"
            >
              Save Draft
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm active:bg-primary-dark disabled:opacity-50 transition-colors shadow-md"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </button>
        </div>
      </form>
    </div>
  );
}
