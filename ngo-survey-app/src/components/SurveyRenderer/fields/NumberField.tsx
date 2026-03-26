import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { NumberField as NumberFieldType } from '../../../types/form-schema';

interface Props {
  field: NumberFieldType;
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors;
}

export function NumberField({ field, register, errors }: Props) {
  const error = errors[field.key];

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        type="number"
        inputMode="numeric"
        {...register(field.key, {
          required: field.required ? 'This field is required' : false,
          valueAsNumber: true,
          min: field.min !== undefined ? { value: field.min, message: `Minimum is ${field.min}` } : undefined,
          max: field.max !== undefined ? { value: field.max, message: `Maximum is ${field.max}` } : undefined,
        })}
        className={`w-full px-3 py-3 rounded-lg border text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
          error ? 'border-danger bg-red-50' : 'border-gray-300 bg-white'
        }`}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
      />
      {error && (
        <p className="text-xs text-danger">{error.message as string}</p>
      )}
    </div>
  );
}
