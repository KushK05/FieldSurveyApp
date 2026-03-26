import { useEffect } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { LocationField as LocationFieldType } from '../../../types/form-schema';
import { useGPS } from '../../../hooks/useGPS';

interface Props {
  field: LocationFieldType;
  setValue: UseFormSetValue<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
}

export function LocationField({ field, setValue, watch }: Props) {
  const { position, loading, error, capture } = useGPS();
  const currentValue = watch(field.key) as { lat: number; lng: number; accuracy: number } | undefined;

  useEffect(() => {
    if (field.auto_capture && !currentValue) {
      capture();
    }
  }, [field.auto_capture, capture, currentValue]);

  useEffect(() => {
    if (position) {
      setValue(field.key, position);
    }
  }, [position, field.key, setValue]);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>

      {currentValue ? (
        <div className="px-3 py-3 rounded-lg border border-green-200 bg-green-50 text-sm">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Location captured
          </div>
          <p className="text-xs text-green-600">
            {currentValue.lat.toFixed(6)}, {currentValue.lng.toFixed(6)}
            {currentValue.accuracy && ` (${Math.round(currentValue.accuracy)}m accuracy)`}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={loading}
          className="w-full px-3 py-3 rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-600 flex items-center justify-center gap-2 active:bg-gray-50 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
              </svg>
              Getting location...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Capture GPS location
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
