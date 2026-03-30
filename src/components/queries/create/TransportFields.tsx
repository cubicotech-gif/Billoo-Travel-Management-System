import CapitalizedInput from '@/components/shared/CapitalizedInput';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const TRANSPORT_TYPES = [
  { value: 'airport_transfer', label: 'Airport Transfer' },
  { value: 'city_transfer', label: 'City Transfer' },
  { value: 'intercity', label: 'Intercity' },
  { value: 'full_day', label: 'Full Day' },
  { value: 'ziyarat_tour', label: 'Ziyarat Tour' },
] as const;

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Bus', 'GMC'] as const;

export default function TransportFields({ details, onChange }: Props) {
  const transportType = details.transport_type ?? '';
  const pickupLocation = details.pickup_location ?? '';
  const dropLocation = details.drop_location ?? '';
  const vehicleType = details.vehicle_type ?? '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transport Type</label>
          <select
            value={transportType}
            onChange={e => onChange({ ...details, transport_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select type</option>
            {TRANSPORT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
          <select
            value={vehicleType}
            onChange={e => onChange({ ...details, vehicle_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select vehicle</option>
            {VEHICLE_TYPES.map(v => (
              <option key={v} value={v.toLowerCase()}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
          <CapitalizedInput
            value={pickupLocation}
            onValueChange={val => onChange({ ...details, pickup_location: val })}
            placeholder="e.g. Jeddah Airport"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Drop Location</label>
          <CapitalizedInput
            value={dropLocation}
            onValueChange={val => onChange({ ...details, drop_location: val })}
            placeholder="e.g. Makkah Hotel"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
