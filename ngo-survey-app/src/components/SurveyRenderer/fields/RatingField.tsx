import { useState } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { RatingField as RatingFieldType } from '../../../types/form-schema';

interface Props {
  field: RatingFieldType;
  setValue: UseFormSetValue<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
}

export function RatingField({ field, setValue, watch }: Props) {
  const maxStars = field.max_stars || 5;
  const currentValue = (watch(field.key) as number) || 0;
  const [hovering, setHovering] = useState(0);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <div className="flex gap-1">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovering(star)}
            onMouseLeave={() => setHovering(0)}
            onClick={() => setValue(field.key, star === currentValue ? 0 : star)}
            className="p-1 transition-transform active:scale-90"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill={star <= (hovering || currentValue) ? '#F59E0B' : 'none'}
              stroke={star <= (hovering || currentValue) ? '#F59E0B' : '#D1D5DB'}
              strokeWidth="2"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        ))}
      </div>
      {currentValue > 0 && (
        <p className="text-xs text-gray-500">{currentValue} of {maxStars} stars</p>
      )}
    </div>
  );
}
