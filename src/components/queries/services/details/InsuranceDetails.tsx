'use client';



interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const COVERAGE_TYPES = ['Basic', 'Standard', 'Premium'];

export default function InsuranceDetails({ details, onChange }: Props) {
  const update = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Provider</label>
          <input
            type="text"
            className={inputClass}
            value={details.provider || ''}
            onChange={(e) => update('provider', e.target.value)}
            placeholder="Insurance provider name"
          />
        </div>
        <div>
          <label className={labelClass}>Coverage Type</label>
          <select
            className={inputClass}
            value={details.coverage_type || ''}
            onChange={(e) => update('coverage_type', e.target.value)}
          >
            <option value="">Select coverage type</option>
            {COVERAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Duration (Days)</label>
          <input
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={details.duration_days || ''}
            onChange={(e) =>
              update('duration_days', e.target.value ? Number(e.target.value) : '')
            }
            placeholder="Number of days"
          />
        </div>
        <div>
          <label className={labelClass}>Coverage Amount</label>
          <input
            type="text"
            className={inputClass}
            value={details.coverage_amount || ''}
            onChange={(e) => update('coverage_amount', e.target.value)}
            placeholder="e.g. $50,000"
          />
        </div>
      </div>
    </div>
  );
}
