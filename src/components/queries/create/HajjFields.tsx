import TextAreaWithCleanup from '../shared/TextAreaWithCleanup';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const PACKAGE_TYPES = ['Economy', 'Standard', 'Premium', 'VIP'] as const;

export default function HajjFields({ details, onChange }: Props) {
  const currentYear = new Date().getFullYear();
  const hajjYear = details.hajj_year ?? '';
  const packageType = details.package_type ?? '';
  const hotelPreferences = details.hotel_preferences ?? '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hajj Year</label>
          <select
            value={hajjYear}
            onChange={e => onChange({ ...details, hajj_year: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            className={inputClass}
          >
            <option value="">Select year</option>
            {[currentYear, currentYear + 1, currentYear + 2].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Package Type</label>
          <select
            value={packageType}
            onChange={e => onChange({ ...details, package_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select type</option>
            {PACKAGE_TYPES.map(t => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <TextAreaWithCleanup
        label="Hotel Preferences"
        value={hotelPreferences}
        onChange={val => onChange({ ...details, hotel_preferences: val })}
        placeholder="e.g. Near Haram, specific star rating..."
        rows={2}
      />
    </div>
  );
}
