'use client';


interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const FLIGHT_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];

export default function FlightDetails({ details, onChange }: Props) {
  const update = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Airline</label>
          <input
            type="text"
            className={inputClass}
            value={details.airline || ''}
            onChange={(e) => update('airline', e.target.value)}
            placeholder="Enter airline name"
          />
        </div>
        <div>
          <label className={labelClass}>Flight Number</label>
          <input
            type="text"
            className={inputClass}
            value={details.flight_number || ''}
            onChange={(e) => update('flight_number', e.target.value)}
            placeholder="e.g. PK-301"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>From City</label>
          <input
            type="text"
            className={inputClass}
            value={details.from_city || ''}
            onChange={(e) => update('from_city', e.target.value)}
            placeholder="Departure city"
          />
        </div>
        <div>
          <label className={labelClass}>To City</label>
          <input
            type="text"
            className={inputClass}
            value={details.to_city || ''}
            onChange={(e) => update('to_city', e.target.value)}
            placeholder="Arrival city"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Departure Date & Time</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={details.departure_datetime || ''}
            onChange={(e) => update('departure_datetime', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Return Date & Time</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={details.return_datetime || ''}
            onChange={(e) => update('return_datetime', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Class</label>
          <select
            className={inputClass}
            value={details.class || ''}
            onChange={(e) => update('class', e.target.value)}
          >
            <option value="">Select class</option>
            {FLIGHT_CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>PNR</label>
          <input
            type="text"
            className={inputClass}
            value={details.pnr || ''}
            onChange={(e) => update('pnr', e.target.value)}
            placeholder="Booking reference"
          />
        </div>
        <div>
          <label className={labelClass}>Baggage</label>
          <input
            type="text"
            className={inputClass}
            value={details.baggage || ''}
            onChange={(e) => update('baggage', e.target.value)}
            placeholder="e.g. 30kg"
          />
        </div>
      </div>
    </div>
  );
}
