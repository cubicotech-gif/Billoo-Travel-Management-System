import CapitalizedInput from '@/components/shared/CapitalizedInput';

interface Props {
  details: Record<string, any>;
  onChange: (details: Record<string, any>) => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const VISA_TYPES = ['Tourist', 'Business', 'Work', 'Student', 'Transit', 'Other'] as const;

export default function VisaFields({ details, onChange }: Props) {
  const visaCountry = details.visa_country ?? '';
  const visaType = details.visa_type ?? '';
  const numberOfVisas = details.number_of_visas ?? '';
  const nationality = details.nationality ?? '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visa Country</label>
          <CapitalizedInput
            value={visaCountry}
            onValueChange={val => onChange({ ...details, visa_country: val })}
            placeholder="e.g. Saudi Arabia"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
          <select
            value={visaType}
            onChange={e => onChange({ ...details, visa_type: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Select type</option>
            {VISA_TYPES.map(t => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Visas</label>
          <input
            type="number"
            min={1}
            value={numberOfVisas}
            onChange={e => onChange({ ...details, number_of_visas: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="e.g. 4"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <CapitalizedInput
            value={nationality}
            onValueChange={val => onChange({ ...details, nationality: val })}
            placeholder="e.g. Pakistani"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}
