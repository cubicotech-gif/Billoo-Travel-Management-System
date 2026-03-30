import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import TextAreaWithCleanup from '../shared/TextAreaWithCleanup';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
  departureDate: string;
  returnDate: string;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function UmrahFields({ details, onChange, departureDate, returnDate }: Props) {
  const packageNights = details.package_nights ?? '';
  const cityOrder = details.city_order ?? 'makkah_first';
  const makkahNights = details.makkah_nights ?? '';
  const madinahNights = details.madinah_nights ?? '';
  const hotelPreferences = details.hotel_preferences ?? '';

  // Auto-calculate package_nights when dates change
  useEffect(() => {
    if (departureDate && returnDate) {
      const nights = daysBetween(departureDate, returnDate);
      if (nights > 0 && nights !== details.package_nights) {
        onChange({ ...details, package_nights: nights });
      }
    }
  }, [departureDate, returnDate]);

  const handlePackageNightsChange = (val: string) => {
    const nights = val === '' ? undefined : parseInt(val, 10);
    onChange({ ...details, package_nights: nights || undefined });
  };

  const handleMakkahNightsChange = (val: string) => {
    const nights = val === '' ? undefined : parseInt(val, 10);
    onChange({ ...details, makkah_nights: nights || undefined });
  };

  const handleMadinahNightsChange = (val: string) => {
    const nights = val === '' ? undefined : parseInt(val, 10);
    onChange({ ...details, madinah_nights: nights || undefined });
  };

  const makkahNum = typeof makkahNights === 'number' ? makkahNights : 0;
  const madinahNum = typeof madinahNights === 'number' ? madinahNights : 0;
  const packageNum = typeof packageNights === 'number' ? packageNights : 0;
  const nightsMismatch = makkahNum > 0 && madinahNum > 0 && packageNum > 0 && (makkahNum + madinahNum) !== packageNum;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package Nights</label>
          <input
            type="number"
            min={1}
            value={packageNights}
            onChange={e => handlePackageNightsChange(e.target.value)}
            placeholder="e.g. 14"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City Order</label>
          <select
            value={cityOrder}
            onChange={e => onChange({ ...details, city_order: e.target.value })}
            className={inputClass}
          >
            <option value="makkah_first">Makkah First</option>
            <option value="madinah_first">Madinah First</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Makkah Nights</label>
          <input
            type="number"
            min={0}
            value={makkahNights}
            onChange={e => handleMakkahNightsChange(e.target.value)}
            placeholder="e.g. 8"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Madinah Nights</label>
          <input
            type="number"
            min={0}
            value={madinahNights}
            onChange={e => handleMadinahNightsChange(e.target.value)}
            placeholder="e.g. 6"
            className={inputClass}
          />
        </div>
      </div>

      {nightsMismatch && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Makkah ({makkahNum}) + Madinah ({madinahNum}) = {makkahNum + madinahNum} nights, but package is {packageNum} nights
        </div>
      )}

      <TextAreaWithCleanup
        label="Hotel Preferences"
        value={hotelPreferences}
        onChange={val => onChange({ ...details, hotel_preferences: val })}
        placeholder="e.g. 5-star in Makkah, 4-star in Madinah, near Haram..."
        rows={2}
      />
    </div>
  );
}
