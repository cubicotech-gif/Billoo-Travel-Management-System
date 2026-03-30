import CapitalizedInput from '@/components/shared/CapitalizedInput';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const TOUR_TYPES = ['Sightseeing', 'Adventure', 'Beach', 'Cultural', 'Shopping', 'Mixed'] as const;

export default function LeisureFields({ details, onChange }: Props) {
  const destinationCountry = details.destination_country ?? '';
  const destinationCity = details.destination_city ?? '';
  const tourType = details.tour_type ?? '';
  const durationDays = details.duration_days ?? '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country</label>
          <CapitalizedInput
            value={destinationCountry}
            onValueChange={val => onChange({ ...details, destination_country: val })}
            placeholder="e.g. Turkey"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination City</label>
          <CapitalizedInput
            value={destinationCity}
            onValueChange={val => onChange({ ...details, destination_city: val })}
            placeholder="e.g. Istanbul"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tour Type</label>
          <select
            value={tourType}
            onChange={e => onChange({ ...details, tour_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select type</option>
            {TOUR_TYPES.map(t => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
          <input
            type="number"
            min={1}
            value={durationDays}
            onChange={e => onChange({ ...details, duration_days: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="e.g. 7"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
