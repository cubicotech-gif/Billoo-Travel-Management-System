import { Trash2, ArrowRightLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import type { InvoiceItemInput, CurrencyCode } from '@/types/finance'
import { SERVICE_TYPES, ALL_CURRENCIES } from '@/types/finance'

interface InvoiceItemRowProps {
  item: InvoiceItemInput
  index: number
  vendors: { id: string; name: string }[]
  onChange: (index: number, field: keyof InvoiceItemInput, value: any) => void
  onRemove: (index: number) => void
  canRemove: boolean
  /** If set, the item inherits this currency (invoice-level ROE) */
  overrideCurrency?: CurrencyCode | null
  /** If set, the item inherits this exchange rate (invoice-level ROE) */
  overrideRate?: number | null
}

export default function InvoiceItemRow({
  item, index, vendors, onChange, onRemove, canRemove,
  overrideCurrency, overrideRate,
}: InvoiceItemRowProps) {
  const effectiveCurrency = overrideCurrency || (item.original_currency as CurrencyCode) || 'PKR'
  const effectiveRate = overrideRate || item.exchange_rate || 0
  const isForeign = effectiveCurrency !== 'PKR'

  // When foreign: user enters original prices, PKR auto-calculated
  const purchaseOriginal = item.purchase_price_original || 0
  const sellingOriginal = item.selling_price_original || 0
  const purchasePKR = isForeign && effectiveRate > 0 ? purchaseOriginal * effectiveRate : item.purchase_price
  const sellingPKR = isForeign && effectiveRate > 0 ? sellingOriginal * effectiveRate : item.selling_price
  const lineProfit = sellingPKR - purchasePKR

  // Helper to update both original and PKR values when foreign currency
  const handleOriginalPurchaseChange = (val: number) => {
    onChange(index, 'purchase_price_original', val)
    if (effectiveRate > 0) {
      onChange(index, 'purchase_price', val * effectiveRate)
    }
  }

  const handleOriginalSellingChange = (val: number) => {
    onChange(index, 'selling_price_original', val)
    if (effectiveRate > 0) {
      onChange(index, 'selling_price', val * effectiveRate)
      onChange(index, 'unit_price', val * effectiveRate)
    }
  }

  // When item-level currency changes
  const handleItemCurrencyChange = (currency: string) => {
    onChange(index, 'original_currency', currency === 'PKR' ? null : currency)
    if (currency === 'PKR') {
      onChange(index, 'exchange_rate', null)
      onChange(index, 'purchase_price_original', null)
      onChange(index, 'selling_price_original', null)
    }
  }

  // When item-level ROE changes
  const handleItemRateChange = (rate: number) => {
    onChange(index, 'exchange_rate', rate || null)
    // Recalculate PKR from originals
    if (rate > 0) {
      if (purchaseOriginal > 0) onChange(index, 'purchase_price', purchaseOriginal * rate)
      if (sellingOriginal > 0) {
        onChange(index, 'selling_price', sellingOriginal * rate)
        onChange(index, 'unit_price', sellingOriginal * rate)
      }
    }
  }

  const lineTotal = item.quantity * (isForeign ? sellingPKR : item.unit_price) * (1 + item.tax_percentage / 100)

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

        {/* Item-level currency (only if no invoice-level override) */}
        {!overrideCurrency && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
            <select
              value={effectiveCurrency}
              onChange={e => handleItemCurrencyChange(e.target.value)}
              className="input text-sm"
            >
              {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Item-level ROE (only if foreign & no invoice-level override) */}
        {isForeign && !overrideRate && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ROE (1 {effectiveCurrency} = PKR)
            </label>
            <input
              type="number" step="0.0001" min="0.0001"
              value={item.exchange_rate || ''}
              onChange={e => handleItemRateChange(parseFloat(e.target.value) || 0)}
              className="input text-sm" placeholder="e.g. 77.50"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
          <input
            type="number" min="1" step="1"
            value={item.quantity}
            onChange={e => onChange(index, 'quantity', parseInt(e.target.value) || 1)}
            className="input text-sm"
          />
        </div>
      </div>

      {/* Price inputs — adapt based on currency */}
      {isForeign && effectiveRate > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Purchase Price ({effectiveCurrency})
              </label>
              <input
                type="number" min="0" step="0.01"
                value={purchaseOriginal || ''}
                onChange={e => handleOriginalPurchaseChange(parseFloat(e.target.value) || 0)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Selling Price ({effectiveCurrency})
              </label>
              <input
                type="number" min="0" step="0.01"
                value={sellingOriginal || ''}
                onChange={e => handleOriginalSellingChange(parseFloat(e.target.value) || 0)}
                className="input text-sm"
              />
            </div>
          </div>
          {/* PKR Equivalents — display only */}
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <ArrowRightLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="text-xs text-blue-800 flex-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>Cost: <strong>{formatCurrency(purchasePKR)}</strong></span>
              <span>Selling: <strong>{formatCurrency(sellingPKR)}</strong></span>
              <span>Profit: <strong className={lineProfit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(lineProfit)}</strong></span>
              <span className="text-blue-500">@ {effectiveRate} ROE</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (Selling)</label>
            <input
              type="number" min="0" step="0.01"
              value={item.unit_price || ''}
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
              value={item.purchase_price || ''}
              onChange={e => onChange(index, 'purchase_price', parseFloat(e.target.value) || 0)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tax %</label>
            <input
              type="number" min="0" step="0.01"
              value={item.tax_percentage || ''}
              onChange={e => onChange(index, 'tax_percentage', parseFloat(e.target.value) || 0)}
              className="input text-sm"
            />
          </div>
        </div>
      )}

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
