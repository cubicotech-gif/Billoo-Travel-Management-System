import CapitalizedInput from '@/components/shared/CapitalizedInput'

interface LeisureFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
}

const TOUR_TYPES = [
  'City Tour', 'Adventure', 'Beach', 'Historical', 'Religious',
  'Honeymoon', 'Family', 'Other',
]

export default function LeisureFields({ values, onChange }: LeisureFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Tour Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tour Type</label>
          <select
            value={values.tour_type || ''}
            onChange={(e) => onChange('tour_type', e.target.value)}
            className="input"
          >
            <option value="">Select Tour Type</option>
            {TOUR_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
          <input
            type="number"
            min="1"
            value={values.tour_duration || ''}
            onChange={(e) => onChange('tour_duration', e.target.value ? parseInt(e.target.value) : '')}
            className="input"
            placeholder="7"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
          <CapitalizedInput
            type="text"
            value={values.interests || ''}
            onValueChange={(val) => onChange('interests', val)}
            capitalizeMode="first"
            className="input"
            placeholder="e.g. Museums, food, shopping, beaches"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation</label>
          <div className="flex items-center gap-4 mt-2">
            {[
              { label: 'Include Hotels', value: 'include' },
              { label: 'Not Needed', value: 'not_needed' },
            ].map((a) => (
              <label key={a.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="leisure_accommodation"
                  value={a.value}
                  checked={values.accommodation === a.value}
                  onChange={(e) => onChange('accommodation', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{a.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transport</label>
          <div className="flex items-center gap-4 mt-2">
            {[
              { label: 'Include Transport', value: 'include' },
              { label: 'Not Needed', value: 'not_needed' },
            ].map((t) => (
              <label key={t.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="leisure_transport"
                  value={t.value}
                  checked={values.transport === t.value}
                  onChange={(e) => onChange('transport', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
