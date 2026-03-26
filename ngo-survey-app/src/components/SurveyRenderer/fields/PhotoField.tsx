import { useRef, useState } from 'react';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { PhotoField as PhotoFieldType } from '../../../types/form-schema';
import { compressImage } from '../../../lib/compress';

interface Props {
  field: PhotoFieldType;
  setValue: UseFormSetValue<Record<string, unknown>>;
  watch: UseFormWatch<Record<string, unknown>>;
}

export function PhotoField({ field, setValue, watch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentValue = watch(field.key);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setPreview(url);
      setValue(field.key, compressed);
    } catch {
      // Fall back to original file
      const url = URL.createObjectURL(file);
      setPreview(url);
      setValue(field.key, file);
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = () => {
    setPreview(null);
    setValue(field.key, undefined);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {preview || currentValue ? (
        <div className="relative">
          {preview && (
            <img
              src={preview}
              alt="Captured"
              className="w-full h-48 object-cover rounded-lg border border-gray-200"
            />
          )}
          <button
            type="button"
            onClick={removePhoto}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="w-full px-3 py-8 rounded-lg border border-dashed border-gray-300 bg-white text-sm text-gray-500 flex flex-col items-center justify-center gap-2 active:bg-gray-50"
        >
          {loading ? (
            <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Take photo or choose file</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
