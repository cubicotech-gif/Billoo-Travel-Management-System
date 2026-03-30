interface Props {
  amount: number | undefined;
  type: 'total' | 'per_person' | undefined;
  onAmountChange: (val: number | undefined) => void;
  onTypeChange: (val: 'total' | 'per_person') => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function formatPKR(value: number | undefined): string {
  if (value === undefined || value === null) return '';
  return value.toLocaleString('en-PK');
}

export default function BudgetField({ amount, type, onAmountChange, onTypeChange }: Props) {
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '') {
      onAmountChange(undefined);
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 0) {
      onAmountChange(num);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Budget (PKR)</label>
        <input
          type="text"
          inputMode="numeric"
          value={amount !== undefined ? formatPKR(amount) : ''}
          onChange={handleAmountChange}
          placeholder="e.g. 250,000"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onTypeChange('total')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              type === 'total'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Total Budget
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('per_person')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              type === 'per_person'
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Per Person
          </button>
        </div>
      </div>
    </div>
  );
}
