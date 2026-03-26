import type { SectionHeaderField } from '../../../types/form-schema';

interface Props {
  field: SectionHeaderField;
}

export function SectionHeader({ field }: Props) {
  return (
    <div className="pt-4 pb-1">
      <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">
        {field.label}
      </h3>
    </div>
  );
}
