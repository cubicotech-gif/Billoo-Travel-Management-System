import CapitalizedInput from '@/components/shared/CapitalizedInput';
import { Star } from 'lucide-react';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family'] as const;

export default function HotelFields({ details, onChange }: Props) {
  const city = details.city ?? '';
  const checkIn = details.check_in ?? '';
  const checkOut = details.check_out ?? '';
  const roomType = details.room_type ?? '';
  const numberOfRooms = details.number_of_rooms ?? '';
  const starRating = details.star_rating ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
        <CapitalizedInput
          value={city}
          onValueChange={val => onChange({ ...details, city: val })}
          placeholder="e.g. Makkah"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
          <input
            type="date"
            value={checkIn}
            onChange={e => onChange({ ...details, check_in: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
          <input
            type="date"
            value={checkOut}
            onChange={e => onChange({ ...details, check_out: e.target.value })}
            min={checkIn || undefined}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
          <select
            value={roomType}
            onChange={e => onChange({ ...details, room_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select type</option>
            {ROOM_TYPES.map(t => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms</label>
          <input
            type="number"
            min={1}
            value={numberOfRooms}
            onChange={e => onChange({ ...details, number_of_rooms: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="e.g. 2"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Star Rating</label>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => onChange({ ...details, star_rating: star === starRating ? 0 : star })}
                className="p-0.5"
              >
                <Star
                  className={`w-5 h-5 transition-colors ${
                    star <= starRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
