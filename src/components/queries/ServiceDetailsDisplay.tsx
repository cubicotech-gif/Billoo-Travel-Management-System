import { format } from 'date-fns';

interface Props {
  type: string;
  details: any;
}

export default function ServiceDetailsDisplay({ type, details }: Props) {
  if (!details || Object.keys(details).length === 0) return null;

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const formatDateTime = (datetime: string) => {
    try {
      return format(new Date(datetime), 'MMM dd, yyyy HH:mm');
    } catch {
      return datetime;
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    try {
      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );
      return nights;
    } catch {
      return null;
    }
  };

  return (
    <div className="text-sm text-gray-600 mt-2 space-y-1">
      {type === 'Hotel' && (
        <>
          {details.hotel_name && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🏨</span>
              <span>{details.hotel_name}</span>
              {details.star_rating && <span className="text-yellow-500">{'⭐'.repeat(parseInt(details.star_rating))}</span>}
            </div>
          )}
          {details.room_type && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🛏️</span>
              <span>{details.room_type}</span>
              {details.rooms && <span>({details.rooms} room{details.rooms > 1 ? 's' : ''})</span>}
            </div>
          )}
          {details.meal_plan && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🍽️</span>
              <span>{details.meal_plan}</span>
            </div>
          )}
          {details.check_in && details.check_out && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📅</span>
              <span>
                {formatDate(details.check_in)} to {formatDate(details.check_out)}
                {(() => {
                  const nights = calculateNights(details.check_in, details.check_out);
                  return nights ? ` (${nights} night${nights > 1 ? 's' : ''})` : '';
                })()}
              </span>
            </div>
          )}
        </>
      )}

      {type === 'Flight' && (
        <>
          {details.airline && (
            <div className="flex items-center gap-2">
              <span className="font-medium">✈️</span>
              <span>{details.airline}</span>
              {details.flight_number && <span className="text-gray-500">({details.flight_number})</span>}
            </div>
          )}
          {details.from_city && details.to_city && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📍</span>
              <span>{details.from_city} → {details.to_city}</span>
            </div>
          )}
          {details.departure_date && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🛫</span>
              <span>Departure: {formatDateTime(details.departure_date)}</span>
            </div>
          )}
          {details.return_date && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🛬</span>
              <span>Return: {formatDateTime(details.return_date)}</span>
            </div>
          )}
          {details.class && (
            <div className="flex items-center gap-2">
              <span className="font-medium">💺</span>
              <span>{details.class}</span>
            </div>
          )}
          {details.baggage && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🧳</span>
              <span>{details.baggage}</span>
            </div>
          )}
        </>
      )}

      {type === 'Transport' && (
        <>
          {details.vehicle_type && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🚗</span>
              <span>{details.vehicle_type}</span>
            </div>
          )}
          {details.pickup_location && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📍</span>
              <span>
                {details.pickup_location}
                {details.dropoff_location && ` → ${details.dropoff_location}`}
              </span>
            </div>
          )}
          {details.pickup_datetime && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🕐</span>
              <span>Pickup: {formatDateTime(details.pickup_datetime)}</span>
            </div>
          )}
          {details.driver_info && (
            <div className="flex items-center gap-2">
              <span className="font-medium">👨‍✈️</span>
              <span>{details.driver_info}</span>
            </div>
          )}
        </>
      )}

      {type === 'Visa' && (
        <>
          {details.visa_type && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📄</span>
              <span>{details.visa_type}</span>
            </div>
          )}
          {details.nationality && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🌍</span>
              <span>{details.nationality}</span>
            </div>
          )}
          {details.processing_time && (
            <div className="flex items-center gap-2">
              <span className="font-medium">⏱️</span>
              <span>Processing: {details.processing_time}</span>
            </div>
          )}
          {details.validity && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📅</span>
              <span>Validity: {details.validity}</span>
            </div>
          )}
        </>
      )}

      {type === 'Activity' && (
        <>
          {details.activity_name && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🎯</span>
              <span>{details.activity_name}</span>
            </div>
          )}
          {details.location && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📍</span>
              <span>{details.location}</span>
            </div>
          )}
          {details.duration && (
            <div className="flex items-center gap-2">
              <span className="font-medium">⏱️</span>
              <span>{details.duration}</span>
            </div>
          )}
          {details.includes && (
            <div className="flex items-start gap-2">
              <span className="font-medium">✓</span>
              <span className="flex-1">{details.includes}</span>
            </div>
          )}
        </>
      )}

      {type === 'Guide' && (
        <>
          {details.guide_name && (
            <div className="flex items-center gap-2">
              <span className="font-medium">👨‍🏫</span>
              <span>{details.guide_name}</span>
            </div>
          )}
          {details.languages && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🗣️</span>
              <span>{details.languages}</span>
            </div>
          )}
          {details.duration && (
            <div className="flex items-center gap-2">
              <span className="font-medium">⏱️</span>
              <span>{details.duration}</span>
            </div>
          )}
          {details.meeting_point && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📍</span>
              <span>Meeting: {details.meeting_point}</span>
            </div>
          )}
        </>
      )}

      {type === 'Insurance' && (
        <>
          {details.insurance_type && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🛡️</span>
              <span>{details.insurance_type}</span>
            </div>
          )}
          {details.provider && (
            <div className="flex items-center gap-2">
              <span className="font-medium">🏢</span>
              <span>{details.provider}</span>
            </div>
          )}
          {details.coverage_amount && (
            <div className="flex items-center gap-2">
              <span className="font-medium">💰</span>
              <span>Coverage: {details.coverage_amount}</span>
            </div>
          )}
          {details.policy_number && (
            <div className="flex items-center gap-2">
              <span className="font-medium">📋</span>
              <span>Policy: {details.policy_number}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
