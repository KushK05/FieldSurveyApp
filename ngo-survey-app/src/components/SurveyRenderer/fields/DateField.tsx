import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { DateField as DateFieldType } from '../../../types/form-schema';

interface Props {
  field: DateFieldType;
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors;
}

export function DateField({ field, register, errors }: Props) {
  const error = errors[field.key];

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        type="date"
        {...register(field.key, { required: field.required ? 'This field is required' : false })}
        className={`w-full px-3 py-3 rounded-lg border text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white ${
          error ? 'border-danger bg-red-50' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="text-xs text-danger">{error.message as string}</p>
      )}
    </div>
  );
}
