import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CheckboxField as CheckboxFieldType } from '../../../types/form-schema';

interface Props {
  field: CheckboxFieldType;
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors;
}

export function CheckboxField({ field, register, errors }: Props) {
  const error = errors[field.key];

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 bg-white cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors">
        <input
          type="checkbox"
          {...register(field.key)}
          className="w-5 h-5 rounded text-primary accent-primary"
        />
        <span className="text-sm text-gray-700">{field.label}</span>
      </label>
      {error && (
        <p className="text-xs text-danger">{error.message as string}</p>
      )}
    </div>
  );
}
