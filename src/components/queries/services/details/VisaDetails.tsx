'use client';


interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const VISA_TYPES = ['Tourist', 'Business', 'Work', 'Student', 'Transit', 'Other'];

export default function VisaDetails({ details, onChange }: Props) {
  const update = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Visa Type</label>
          <select
            className={inputClass}
            value={details.visa_type || ''}
            onChange={(e) => update('visa_type', e.target.value)}
          >
            <option value="">Select visa type</option>
            {VISA_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <input
            type="text"
            className={inputClass}
            value={details.country || ''}
            onChange={(e) => update('country', e.target.value)}
            placeholder="Enter country"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nationality</label>
          <input
            type="text"
            className={inputClass}
            value={details.nationality || ''}
            onChange={(e) => update('nationality', e.target.value)}
            placeholder="Enter nationality"
          />
        </div>
        <div>
          <label className={labelClass}>Processing Time</label>
          <input
            type="text"
            className={inputClass}
            value={details.processing_time || ''}
            onChange={(e) => update('processing_time', e.target.value)}
            placeholder="e.g. 5-7 working days"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Visa Count</label>
          <input
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={details.visa_count || ''}
            onChange={(e) =>
              update('visa_count', e.target.value ? Number(e.target.value) : '')
            }
            placeholder="Number of visas"
          />
        </div>
      </div>
    </div>
  );
}
