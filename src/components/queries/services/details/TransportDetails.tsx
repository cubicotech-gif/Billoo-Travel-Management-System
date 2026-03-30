'use client';


interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const TRANSPORT_TYPES = [
  'Airport Transfer',
  'City Transfer',
  'Intercity',
  'Full Day',
  'Ziyarat Tour',
];
const VEHICLE_TYPES = ['Sedan', 'SUV', 'Van', 'Bus', 'GMC'];

export default function TransportDetails({ details, onChange }: Props) {
  const update = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Transport Type</label>
          <select
            className={inputClass}
            value={details.transport_type || ''}
            onChange={(e) => update('transport_type', e.target.value)}
          >
            <option value="">Select transport type</option>
            {TRANSPORT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Vehicle Type</label>
          <select
            className={inputClass}
            value={details.vehicle_type || ''}
            onChange={(e) => update('vehicle_type', e.target.value)}
          >
            <option value="">Select vehicle type</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Pickup Location</label>
          <input
            type="text"
            className={inputClass}
            value={details.pickup_location || ''}
            onChange={(e) => update('pickup_location', e.target.value)}
            placeholder="Enter pickup location"
          />
        </div>
        <div>
          <label className={labelClass}>Drop Location</label>
          <input
            type="text"
            className={inputClass}
            value={details.drop_location || ''}
            onChange={(e) => update('drop_location', e.target.value)}
            placeholder="Enter drop location"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date & Time</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={details.datetime || ''}
            onChange={(e) => update('datetime', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
