import CapitalizedInput from '@/components/shared/CapitalizedInput';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const FLIGHT_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'] as const;
const TRIP_TYPES = [
  { value: 'one_way', label: 'One Way' },
  { value: 'return', label: 'Return' },
  { value: 'multi_city', label: 'Multi-city' },
] as const;

export default function FlightFields({ details, onChange }: Props) {
  const fromCity = details.from_city ?? '';
  const toCity = details.to_city ?? '';
  const flightClass = details.flight_class ?? '';
  const tripType = details.trip_type ?? '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From City</label>
          <CapitalizedInput
            value={fromCity}
            onValueChange={val => onChange({ ...details, from_city: val })}
            placeholder="e.g. Karachi"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To City</label>
          <CapitalizedInput
            value={toCity}
            onValueChange={val => onChange({ ...details, to_city: val })}
            placeholder="e.g. Jeddah"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Flight Class</label>
          <select
            value={flightClass}
            onChange={e => onChange({ ...details, flight_class: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select class</option>
            {FLIGHT_CLASSES.map(c => (
              <option key={c} value={c.toLowerCase().replace(' ', '_')}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
          <select
            value={tripType}
            onChange={e => onChange({ ...details, trip_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select type</option>
            {TRIP_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
