'use client';



interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function OtherDetails({ details, onChange }: Props) {
  return (
    <div>
      <label className={labelClass}>Description</label>
      <textarea
        className={inputClass}
        rows={4}
        value={details.description || ''}
        onChange={(e) => onChange({ ...details, description: e.target.value })}
        placeholder="Describe the service details"
      />
    </div>
  );
}
