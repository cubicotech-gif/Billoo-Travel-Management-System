import CapitalizedInput from '@/components/shared/CapitalizedInput'

interface HotelFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
}

const CITIES = [
  'Makkah', 'Madinah', 'Jeddah', 'Dubai', 'Istanbul', 'Kuala Lumpur', 'Other',
]

const ROOM_TYPES = ['Single', 'Double', 'Triple', 'Quad', 'Suite', 'Family Room']

export default function HotelFields({ values, onChange }: HotelFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Hotel Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          {values.hotel_city === 'Other' ? (
            <CapitalizedInput
              type="text"
              value={values.hotel_city_custom || ''}
              onValueChange={(val) => onChange('hotel_city_custom', val)}
              className="input"
              placeholder="Enter city name"
              autoFocus
            />
          ) : (
            <select
              value={values.hotel_city || ''}
              onChange={(e) => onChange('hotel_city', e.target.value)}
              className="input"
            >
              <option value="">Select City</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
          <div className="flex items-center gap-3 mt-2">
            {['3', '4', '5', 'any'].map((star) => (
              <label key={star} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hotel_star_rating"
                  value={star}
                  checked={values.star_rating === star}
                  onChange={(e) => onChange('star_rating', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-1.5 text-sm text-gray-700">{star === 'any' ? 'Any' : `${star}\u2605`}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
          <input
            type="date"
            value={values.check_in || ''}
            onChange={(e) => onChange('check_in', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
          <input
            type="date"
            value={values.check_out || ''}
            min={values.check_in || ''}
            onChange={(e) => onChange('check_out', e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
          <select
            value={values.room_type || ''}
            onChange={(e) => onChange('room_type', e.target.value)}
            className="input"
          >
            <option value="">Select Room Type</option>
            {ROOM_TYPES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms</label>
          <input
            type="number"
            min="1"
            value={values.number_of_rooms || ''}
            onChange={(e) => onChange('number_of_rooms', e.target.value ? parseInt(e.target.value) || 1 : '')}
            className="input"
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meal Plan</label>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[
              { label: 'Room Only', value: 'room_only' },
              { label: 'Breakfast', value: 'breakfast' },
              { label: 'Half Board', value: 'half_board' },
              { label: 'Full Board', value: 'full_board' },
            ].map((m) => (
              <label key={m.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hotel_meal_plan"
                  value={m.value}
                  checked={values.meal_plan === m.value}
                  onChange={(e) => onChange('meal_plan', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-1.5 text-sm text-gray-700">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Distance from Haram</label>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[
              { label: 'Walking', value: 'walking' },
              { label: 'Shuttle', value: 'shuttle' },
              { label: 'Any', value: 'any' },
            ].map((d) => (
              <label key={d.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="hotel_distance"
                  value={d.value}
                  checked={values.haram_distance === d.value}
                  onChange={(e) => onChange('haram_distance', e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-1.5 text-sm text-gray-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Preference</label>
          <CapitalizedInput
            type="text"
            value={values.hotel_preference || ''}
            onValueChange={(val) => onChange('hotel_preference', val)}
            className="input"
            placeholder="Specific hotel name, e.g. Hilton Suites Makkah"
          />
        </div>
      </div>
    </div>
  )
}
