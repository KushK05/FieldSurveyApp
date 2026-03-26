import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { RadioField as RadioFieldType } from '../../../types/form-schema';

interface Props {
  field: RadioFieldType;
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors;
}

export function RadioField({ field, register, errors }: Props) {
  const error = errors[field.key];

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div className="space-y-2">
        {field.options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-colors"
          >
            <input
              type="radio"
              value={opt}
              {...register(field.key, { required: field.required ? 'Please select an option' : false })}
              className="w-4 h-4 text-primary accent-primary"
            />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="text-xs text-danger mt-1">{error.message as string}</p>
      )}
    </div>
  );
}
