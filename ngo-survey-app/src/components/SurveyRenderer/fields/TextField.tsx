import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { TextField as TextFieldType, TextareaField } from '../../../types/form-schema';

interface Props {
  field: TextFieldType | TextareaField;
  register: UseFormRegister<Record<string, unknown>>;
  errors: FieldErrors;
}

export function TextField({ field, register, errors }: Props) {
  const error = errors[field.key];
  const isTextarea = field.type === 'textarea';

  const inputClasses = `w-full px-3 py-3 rounded-lg border text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
    error ? 'border-danger bg-red-50' : 'border-gray-300 bg-white'
  }`;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {isTextarea ? (
        <textarea
          {...register(field.key, { required: field.required ? 'This field is required' : false })}
          className={inputClasses}
          placeholder={field.placeholder}
          rows={4}
          maxLength={(field as TextareaField).maxLength}
        />
      ) : (
        <input
          type="text"
          {...register(field.key, { required: field.required ? 'This field is required' : false })}
          className={inputClasses}
          placeholder={field.placeholder}
          maxLength={(field as TextFieldType).maxLength}
        />
      )}
      {error && (
        <p className="text-xs text-danger">{error.message as string}</p>
      )}
    </div>
  );
}
