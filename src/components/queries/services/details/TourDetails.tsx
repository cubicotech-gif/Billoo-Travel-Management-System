'use client';



interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const TOUR_TYPES = ['Sightseeing', 'Adventure', 'Beach', 'Cultural', 'Shopping', 'Mixed'];

export default function TourDetails({ details, onChange }: Props) {
  const update = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tour Name</label>
          <input
            type="text"
            className={inputClass}
            value={details.tour_name || ''}
            onChange={(e) => update('tour_name', e.target.value)}
            placeholder="Enter tour name"
          />
        </div>
        <div>
          <label className={labelClass}>Tour Type</label>
          <select
            className={inputClass}
            value={details.tour_type || ''}
            onChange={(e) => update('tour_type', e.target.value)}
          >
            <option value="">Select tour type</option>
            {TOUR_TYPES.map((type) => (
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
      </div>

      <div>
        <label className={labelClass}>Includes</label>
        <textarea
          className={inputClass}
          rows={3}
          value={details.includes || ''}
          onChange={(e) => update('includes', e.target.value)}
          placeholder="What is included in the tour (e.g. meals, transport, guide, tickets)"
        />
      </div>
    </div>
  );
}
