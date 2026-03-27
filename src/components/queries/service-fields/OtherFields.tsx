import CapitalizedInput from '@/components/shared/CapitalizedInput'

interface OtherFieldsProps {
  values: Record<string, any>
  onChange: (field: string, value: any) => void
}

export default function OtherFields({ values, onChange }: OtherFieldsProps) {
  return (
    <div className="mb-6 transition-all duration-300">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
        Service Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
      </h4>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <CapitalizedInput
          type="text"
          value={values.description || ''}
          onValueChange={(val) => onChange('description', val)}
          capitalizeMode="first"
          className="input"
          placeholder="Describe what the client needs"
        />
      </div>
    </div>
  )
}
