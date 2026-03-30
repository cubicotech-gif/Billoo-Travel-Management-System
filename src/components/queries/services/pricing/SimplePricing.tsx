'use client';

import type { SimplePricing as SimplePricingType } from '@/types/query';
import { formatCurrency } from '@/lib/formatCurrency';
import type { CurrencyCode } from '@/lib/formatCurrency';

interface Props {
  pricing: SimplePricingType;
  onChange: (p: SimplePricingType) => void;
  currency: string;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function SimplePricing({ pricing, onChange, currency }: Props) {
  const totalCost = pricing.unit_cost * pricing.quantity;
  const totalSelling = pricing.unit_selling * pricing.quantity;
  const profit = totalSelling - totalCost;

  const parseNum = (val: string) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const update = (field: keyof SimplePricingType, value: number) => {
    onChange({ ...pricing, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Unit Cost</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={pricing.unit_cost || ''}
            onChange={(e) => update('unit_cost', parseNum(e.target.value))}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Unit Selling</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={pricing.unit_selling || ''}
            onChange={(e) => update('unit_selling', parseNum(e.target.value))}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelClass}>Quantity</label>
          <input
            type="number"
            min={1}
            step={1}
            className={inputClass}
            value={pricing.quantity || ''}
            onChange={(e) => update('quantity', parseNum(e.target.value))}
            placeholder="1"
          />
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Cost</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(totalCost, currency as CurrencyCode)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Selling</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(totalSelling, currency as CurrencyCode)}
          </span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
          <span className="text-gray-600">Profit</span>
          <span
            className={`font-semibold ${
              profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {formatCurrency(profit, currency as CurrencyCode)}
          </span>
        </div>
      </div>
    </div>
  );
}
