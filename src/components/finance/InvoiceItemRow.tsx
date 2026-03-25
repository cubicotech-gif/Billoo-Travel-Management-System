import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import type { InvoiceItemInput } from '@/types/finance'
import { SERVICE_TYPES } from '@/types/finance'

interface InvoiceItemRowProps {
  item: InvoiceItemInput
  index: number
  vendors: { id: string; name: string }[]
  onChange: (index: number, field: keyof InvoiceItemInput, value: any) => void
  onRemove: (index: number) => void
  canRemove: boolean
}

export default function InvoiceItemRow({
  item, index, vendors, onChange, onRemove, canRemove,
}: InvoiceItemRowProps) {
  const lineTotal = item.quantity * item.unit_price * (1 + item.tax_percentage / 100)
  const lineProfit = item.selling_price - item.purchase_price

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
          <input
            type="text" required
            value={item.description}
            onChange={e => onChange(index, 'description', e.target.value)}
            className="input text-sm" placeholder="Service description"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
          <select
            value={item.service_type || ''}
            onChange={e => onChange(index, 'service_type', e.target.value || null)}
            className="input text-sm"
          >
            <option value="">None</option>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
          <select
            value={item.vendor_id || ''}
            onChange={e => onChange(index, 'vendor_id', e.target.value || null)}
            className="input text-sm"
          >
            <option value="">None</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
          <input
            type="number" min="1" step="1"
            value={item.quantity}
            onChange={e => onChange(index, 'quantity', parseInt(e.target.value) || 1)}
            className="input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (Selling)</label>
          <input
            type="number" min="0" step="0.01"
            value={item.unit_price}
            onChange={e => {
              const val = parseFloat(e.target.value) || 0
              onChange(index, 'unit_price', val)
              onChange(index, 'selling_price', val * item.quantity)
            }}
            className="input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price (Cost)</label>
          <input
            type="number" min="0" step="0.01"
            value={item.purchase_price}
            onChange={e => onChange(index, 'purchase_price', parseFloat(e.target.value) || 0)}
            className="input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tax %</label>
          <input
            type="number" min="0" step="0.01"
            value={item.tax_percentage}
            onChange={e => onChange(index, 'tax_percentage', parseFloat(e.target.value) || 0)}
            className="input text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
        <span className="text-gray-500">
          Profit: <span className={lineProfit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {formatCurrency(lineProfit)}
          </span>
        </span>
        <span className="font-medium text-gray-900">
          Total: {formatCurrency(lineTotal)}
        </span>
      </div>
    </div>
  )
}
