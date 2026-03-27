import CapitalizedInput from '@/components/shared/CapitalizedInput'

interface HajjFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
}

const currentYear = new Date().getFullYear()

export default function HajjFields({ values, onChange }: HajjFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Hajj Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hajj Year</label>
          <select
            value={values.hajj_year || ''}
            onChange={(e) => onChange('hajj_year', e.target.value)}
            className="input"
          >
            <option value="">Select Year</option>
            <option value={String(currentYear)}>{currentYear}</option>
            <option value={String(currentYear + 1)}>{currentYear + 1}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package Type</label>
          <div className="flex items-center gap-4 mt-2">
            {['Economy', 'Standard', 'Premium'].map((type) => (
              <label key={type} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hajj_package_type"
                  value={type.toLowerCase()}
                  checked={values.package_type === type.toLowerCase()}
                  onChange={(e) => onChange('package_type', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nights Split</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Makkah Nights</label>
              <input
                type="number"
                min="0"
                value={values.makkah_nights || ''}
                onChange={(e) => onChange('makkah_nights', e.target.value ? parseInt(e.target.value) : '')}
                className="input"
                placeholder="8"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Madinah Nights</label>
              <input
                type="number"
                min="0"
                value={values.madinah_nights || ''}
                onChange={(e) => onChange('madinah_nights', e.target.value ? parseInt(e.target.value) : '')}
                className="input"
                placeholder="6"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Preferences</label>
          <CapitalizedInput
            type="text"
            value={values.hotel_preferences || ''}
            onValueChange={(val) => onChange('hotel_preferences', val)}
            className="input"
            placeholder='e.g. "5-star near Haram"'
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes</label>
          <CapitalizedInput
            type="text"
            value={values.special_notes || ''}
            onValueChange={(val) => onChange('special_notes', val)}
            capitalizeMode="first"
            className="input"
            placeholder='e.g. "Elderly passenger, wheelchair needed"'
          />
        </div>
      </div>
    </div>
  )
}
