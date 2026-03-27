interface VisaFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
  totalPax?: number
}

const COUNTRIES = [
  'Saudi Arabia', 'UAE', 'Turkey', 'Malaysia', 'UK', 'USA', 'Canada',
  'Europe/Schengen', 'China', 'Thailand', 'Other',
]

const VISA_TYPES = [
  'Umrah Visa', 'Tourist Visa', 'Business Visa', 'Work Visa', 'Visit Visa', 'Student Visa', 'Other',
]

const NATIONALITIES = [
  'Pakistani', 'Indian', 'Bangladeshi', 'Afghan', 'Other',
]

export default function VisaFields({ values, onChange, totalPax }: VisaFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Visa Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select
            value={values.country || ''}
            onChange={(e) => onChange('country', e.target.value)}
            className="input"
          >
            <option value="">Select Country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
          <select
            value={values.visa_type || ''}
            onChange={(e) => onChange('visa_type', e.target.value)}
            className="input"
          >
            <option value="">Select Visa Type</option>
            {VISA_TYPES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <select
            value={values.nationality || ''}
            onChange={(e) => onChange('nationality', e.target.value)}
            className="input"
          >
            <option value="">Select Nationality</option>
            {NATIONALITIES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Visas</label>
          <input
            type="number"
            min="1"
            value={values.number_of_visas || totalPax || ''}
            onChange={(e) => onChange('number_of_visas', e.target.value ? parseInt(e.target.value) : '')}
            className="input"
            placeholder={totalPax ? String(totalPax) : '1'}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Processing Speed</label>
          <div className="flex items-center gap-4">
            {['Normal', 'Urgent'].map((speed) => (
              <label key={speed} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="visa_processing_speed"
                  value={speed.toLowerCase()}
                  checked={values.processing_speed === speed.toLowerCase()}
                  onChange={(e) => onChange('processing_speed', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{speed}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
