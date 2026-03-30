'use client';

import type { FlightPricing as FlightPricingType } from '@/types/query';
import { formatCurrency } from '@/lib/formatCurrency';
import type { CurrencyCode } from '@/lib/formatCurrency';

interface Props {
  pricing: FlightPricingType;
  onChange: (p: FlightPricingType) => void;
  currency: string;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
type PaxType = 'adult' | 'child' | 'infant';

export default function FlightPricing({ pricing, onChange, currency }: Props) {
  const parseNum = (val: string) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const updatePax = (type: PaxType, field: 'cost' | 'selling' | 'count', value: number) => {
    onChange({
      ...pricing,
      [type]: { ...pricing[type], [field]: value },
    });
  };

  const paxTypes: { key: PaxType; label: string }[] = [
    { key: 'adult', label: 'Adult' },
    { key: 'child', label: 'Child' },
    { key: 'infant', label: 'Infant' },
  ];

  const totalCost = paxTypes.reduce(
    (sum, { key }) => sum + pricing[key].cost * pricing[key].count,
    0
  );
  const totalSelling = paxTypes.reduce(
    (sum, { key }) => sum + pricing[key].selling * pricing[key].count,
    0
  );
  const profit = totalSelling - totalCost;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-700">Type</th>
              <th className="pb-2 text-left font-medium text-gray-700">Count</th>
              <th className="pb-2 text-left font-medium text-gray-700">Cost / Pax</th>
              <th className="pb-2 text-left font-medium text-gray-700">Selling / Pax</th>
              <th className="pb-2 text-right font-medium text-gray-700">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paxTypes.map(({ key, label }) => {
              const row = pricing[key];
              const rowTotal = row.selling * row.count;
              return (
                <tr key={key}>
                  <td className="py-2 pr-2">
                    <span className="font-medium text-gray-700">{label}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={inputClass}
                      value={row.count || ''}
                      onChange={(e) => updatePax(key, 'count', parseNum(e.target.value))}
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={row.cost || ''}
                      onChange={(e) => updatePax(key, 'cost', parseNum(e.target.value))}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={row.selling || ''}
                      onChange={(e) => updatePax(key, 'selling', parseNum(e.target.value))}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="py-2 text-right text-gray-700">
                    {formatCurrency(rowTotal, currency as CurrencyCode)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
