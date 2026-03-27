import CapitalizedInput from '@/components/shared/CapitalizedInput'

interface FlightFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
}

const CITIES_FROM = [
  'Karachi', 'Lahore', 'Islamabad', 'Peshawar', 'Multan', 'Faisalabad', 'Quetta', 'Other',
]

const CITIES_TO = [
  'Jeddah', 'Madinah', 'Riyadh', 'Dubai', 'Istanbul', 'Kuala Lumpur', 'London', 'Other',
]

export default function FlightFields({ values, onChange }: FlightFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Flight Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          {values.from_city === 'Other' ? (
            <CapitalizedInput
              type="text"
              value={values.from_city_custom || ''}
              onValueChange={(val) => onChange('from_city_custom', val)}
              className="input"
              placeholder="Enter city name"
              autoFocus
            />
          ) : (
            <select
              value={values.from_city || ''}
              onChange={(e) => onChange('from_city', e.target.value)}
              className="input"
            >
              <option value="">Select City</option>
              {CITIES_FROM.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          {values.to_city === 'Other' ? (
            <CapitalizedInput
              type="text"
              value={values.to_city_custom || ''}
              onValueChange={(val) => onChange('to_city_custom', val)}
              className="input"
              placeholder="Enter city name"
              autoFocus
            />
          ) : (
            <select
              value={values.to_city || ''}
              onChange={(e) => onChange('to_city', e.target.value)}
              className="input"
            >
              <option value="">Select City</option>
              {CITIES_TO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
          <div className="flex items-center gap-4 mt-2">
            {[{ label: 'One Way', value: 'one_way' }, { label: 'Round Trip', value: 'round_trip' }].map((t) => (
              <label key={t.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="flight_trip_type"
                  value={t.value}
                  checked={values.trip_type === t.value}
                  onChange={(e) => onChange('trip_type', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <div className="flex items-center gap-4 mt-2">
            {['Economy', 'Business', 'First'].map((cls) => (
              <label key={cls} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="flight_class"
                  value={cls.toLowerCase()}
                  checked={values.flight_class === cls.toLowerCase()}
                  onChange={(e) => onChange('flight_class', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{cls}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Airline</label>
          <CapitalizedInput
            type="text"
            value={values.preferred_airline || ''}
            onValueChange={(val) => onChange('preferred_airline', val)}
            className="input"
            placeholder="e.g. PIA, Saudia, Emirates"
          />
        </div>
      </div>
    </div>
  )
}
