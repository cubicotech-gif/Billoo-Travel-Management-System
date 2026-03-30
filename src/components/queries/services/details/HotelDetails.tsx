'use client';


interface Props {
  details: Record<string, any>;
  onChange: (d: Record<string, any>) => void;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family'];
const MEAL_PLANS = ['Room Only', 'Breakfast', 'Half Board', 'Full Board'];
const STAR_RATINGS = [1, 2, 3, 4, 5];

export default function HotelDetails({ details, onChange }: Props) {
  const update = (field: string, value: any) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Hotel Name</label>
          <input
            type="text"
            className={inputClass}
            value={details.hotel_name || ''}
            onChange={(e) => update('hotel_name', e.target.value)}
            placeholder="Enter hotel name"
          />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input
            type="text"
            className={inputClass}
            value={details.city || ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Enter city"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Check-in Date</label>
          <input
            type="date"
            className={inputClass}
            value={details.check_in || ''}
            onChange={(e) => update('check_in', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Check-out Date</label>
          <input
            type="date"
            className={inputClass}
            value={details.check_out || ''}
            onChange={(e) => update('check_out', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Room Type</label>
          <select
            className={inputClass}
            value={details.room_type || ''}
            onChange={(e) => update('room_type', e.target.value)}
          >
            <option value="">Select room type</option>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Meal Plan</label>
          <select
            className={inputClass}
            value={details.meal_plan || ''}
            onChange={(e) => update('meal_plan', e.target.value)}
          >
            <option value="">Select meal plan</option>
            {MEAL_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Star Rating</label>
          <select
            className={inputClass}
            value={details.star_rating || ''}
            onChange={(e) => update('star_rating', e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select rating</option>
            {STAR_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {rating} Star{rating > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Distance from Haram</label>
          <input
            type="text"
            className={inputClass}
            value={details.distance_from_haram || ''}
            onChange={(e) => update('distance_from_haram', e.target.value)}
            placeholder="e.g. 500m, 2km"
          />
        </div>
      </div>
    </div>
  );
}
