import { Calendar } from 'lucide-react';

interface Props {
  departureDate: string;
  returnDate: string;
  onDepartureDateChange: (val: string) => void;
  onReturnDateChange: (val: string) => void;
  tentative: boolean;
  onTentativeChange: (val: boolean) => void;
}

function calculateDuration(departure: string, returnDate: string): string | null {
  if (!departure || !returnDate) return null;
  const dep = new Date(departure);
  const ret = new Date(returnDate);
  const diffMs = ret.getTime() - dep.getTime();
  if (diffMs < 0) return null;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const nights = days;
  if (days === 0) return 'Same day';
  return `${days} day${days !== 1 ? 's' : ''} / ${nights} night${nights !== 1 ? 's' : ''}`;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

export default function DateRangePicker({
  departureDate,
  returnDate,
  onDepartureDateChange,
  onReturnDateChange,
  tentative,
  onTentativeChange,
}: Props) {
  const duration = calculateDuration(departureDate, returnDate);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
          <input
            type="date"
            value={departureDate}
            onChange={e => onDepartureDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
          <input
            type="date"
            value={returnDate}
            onChange={e => onReturnDateChange(e.target.value)}
            min={departureDate || undefined}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={tentative}
            onChange={e => onTentativeChange(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Dates are tentative
        </label>

        {duration && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {duration}
          </div>
        )}
      </div>
    </div>
  );
}
