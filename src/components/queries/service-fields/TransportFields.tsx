import CapitalizedInput from '@/components/shared/CapitalizedInput'

interface TransportFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
}

const SERVICE_TYPES = [
  'Airport Pickup', 'Airport Drop', 'City Transfer', 'Makkah-Madinah',
  'Full Package', 'Other',
]

export default function TransportFields({ values, onChange }: TransportFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Transport Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
          <select
            value={values.transport_type || ''}
            onChange={(e) => onChange('transport_type', e.target.value)}
            className="input"
          >
            <option value="">Select Type</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[
              { label: 'Sedan (1-3)', value: 'sedan' },
              { label: 'Van (4-7)', value: 'van' },
              { label: 'Bus (8+)', value: 'bus' },
              { label: 'Private', value: 'private' },
            ].map((v) => (
              <label key={v.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="transport_vehicle"
                  value={v.value}
                  checked={values.vehicle_type === v.value}
                  onChange={(e) => onChange('vehicle_type', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-1.5 text-sm text-gray-700">{v.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <CapitalizedInput
            type="text"
            value={values.from_location || ''}
            onValueChange={(val) => onChange('from_location', val)}
            className="input"
            placeholder="e.g. Jeddah Airport"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <CapitalizedInput
            type="text"
            value={values.to_location || ''}
            onValueChange={(val) => onChange('to_location', val)}
            className="input"
            placeholder="e.g. Hotel Dallah Taibah, Makkah"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={values.transport_datetime || ''}
            onChange={(e) => onChange('transport_datetime', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Trips</label>
          <input
            type="number"
            min="1"
            value={values.number_of_trips || ''}
            onChange={(e) => onChange('number_of_trips', e.target.value ? parseInt(e.target.value) : '')}
            className="input"
            placeholder="1"
          />
        </div>
      </div>
    </div>
  )
}
