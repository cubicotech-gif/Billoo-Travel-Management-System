import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Copy, Check, Calculator, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SUPPORTED_CURRENCIES, type CurrencyCode, convertToPKR } from '@/lib/formatCurrency'

interface CalcItem {
  id: string
  service_type: string
  description: string
  cost_per_unit: number
  selling_per_unit: number
  quantity: number
  per_pax: boolean
}

interface Props {
  queryId: string
  passengers?: number
  defaultCurrency?: CurrencyCode
  onClose: () => void
  onAddToQuery?: (items: CalcItem[], currency: CurrencyCode, roe: number) => void
}

const SERVICE_TYPES = ['Hotel', 'Flight', 'Transport', 'Visa', 'Insurance', 'Activity', 'Guide', 'Other']

const STORAGE_KEY = 'billoo_package_calculator'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

export default function PackageCalculator({ queryId, passengers = 1, defaultCurrency = 'SAR', onClose, onAddToQuery }: Props) {
  const [paxCount, setPaxCount] = useState(passengers)
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency)
  const [roe, setRoe] = useState(0)
  const [items, setItems] = useState<CalcItem[]>([])
  const [copied, setCopied] = useState(false)
  const [addingToQuery, setAddingToQuery] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.items) setItems(data.items)
        if (data.currency) setCurrency(data.currency)
        if (data.roe) setRoe(data.roe)
        if (data.paxCount) setPaxCount(data.paxCount)
      }
    } catch { /* ignore */ }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, currency, roe, paxCount }))
  }, [items, currency, roe, paxCount])

  const isPKR = currency === 'PKR'

  const addItem = () => {
    setItems([...items, {
      id: generateId(),
      service_type: 'Hotel',
      description: '',
      cost_per_unit: 0,
      selling_per_unit: 0,
      quantity: 1,
      per_pax: false,
    }])
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const clearAll = () => {
    if (confirm('Clear all items?')) {
      setItems([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Calculations
  const getItemTotal = (item: CalcItem, type: 'cost' | 'selling') => {
    const price = type === 'cost' ? item.cost_per_unit : item.selling_per_unit
    const mult = item.per_pax ? paxCount : 1
    return price * item.quantity * mult
  }

  const totalCost = items.reduce((sum, item) => sum + getItemTotal(item, 'cost'), 0)
  const totalSelling = items.reduce((sum, item) => sum + getItemTotal(item, 'selling'), 0)
  const totalProfit = totalSelling - totalCost
  const margin = totalSelling > 0 ? (totalProfit / totalSelling) * 100 : 0

  const effectiveRoe = isPKR ? 1 : roe
  const totalCostPkr = isPKR ? totalCost : convertToPKR(totalCost, effectiveRoe)
  const totalSellingPkr = isPKR ? totalSelling : convertToPKR(totalSelling, effectiveRoe)
  const totalProfitPkr = totalSellingPkr - totalCostPkr

  const costPerPax = paxCount > 0 ? totalCost / paxCount : 0
  const sellingPerPax = paxCount > 0 ? totalSelling / paxCount : 0

  const copySummary = () => {
    let text = `Package Estimate - ${paxCount} Passenger${paxCount > 1 ? 's' : ''}\n\n`
    items.forEach(item => {
      const total = getItemTotal(item, 'selling')
      text += `${item.service_type}: ${item.description || 'N/A'}`
      if (item.quantity > 1 || item.per_pax) {
        text += ` x ${item.quantity}${item.per_pax ? ` x ${paxCount} pax` : ''}`
      }
      text += ` — ${total.toLocaleString()} ${currency}\n`
    })
    text += `\nTotal: ${totalSelling.toLocaleString()} ${currency}`
    if (!isPKR && roe > 0) {
      text += ` (Rs ${totalSellingPkr.toLocaleString()} @ ROE ${roe})`
    }
    text += `\nPer Person: ${sellingPerPax.toLocaleString()} ${currency}`
    if (!isPKR && roe > 0) {
      const pkrPerPax = paxCount > 0 ? totalSellingPkr / paxCount : 0
      text += ` (Rs ${Math.round(pkrPerPax).toLocaleString()})`
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleAddToQuery = async () => {
    if (items.length === 0) return
    setAddingToQuery(true)

    try {
      const rate = isPKR ? 1 : roe
      for (const item of items) {
        const qty = item.per_pax ? item.quantity * paxCount : item.quantity
        const costPkr = isPKR ? item.cost_per_unit : convertToPKR(item.cost_per_unit, rate)
        const sellingPkr = isPKR ? item.selling_per_unit : convertToPKR(item.selling_per_unit, rate)

        await supabase.from('query_services').insert({
          query_id: queryId,
          service_type: item.service_type,
          service_description: item.description || item.service_type,
          quantity: qty,
          cost_price: item.cost_per_unit,
          selling_price: item.selling_per_unit,
          currency: currency,
          exchange_rate: rate,
          cost_price_pkr: costPkr,
          selling_price_pkr: sellingPkr,
          profit_pkr: sellingPkr - costPkr,
          booking_status: 'pending',
          delivery_status: 'not_started',
        })
      }

      alert(`${items.length} service${items.length > 1 ? 's' : ''} added to query`)
      setItems([])
      localStorage.removeItem(STORAGE_KEY)
      onAddToQuery?.(items, currency, roe)
      onClose()
    } catch (err: any) {
      alert('Failed to add services: ' + err.message)
    } finally {
      setAddingToQuery(false)
    }
  }

  const curSymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || currency

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Package Cost Calculator
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Passengers:</label>
            <input type="number" value={paxCount} onChange={e => setPaxCount(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 border rounded text-center text-sm" min="1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Currency:</label>
            <div className="flex gap-1">
              {SUPPORTED_CURRENCIES.map(c => (
                <button key={c.code} onClick={() => setCurrency(c.code as CurrencyCode)}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    currency === c.code ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
                  }`}>{c.code}</button>
              ))}
            </div>
          </div>
          {!isPKR && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">ROE:</label>
              <input type="number" value={roe || ''} onChange={e => setRoe(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 border rounded text-sm" step="0.01" placeholder="1 → PKR" />
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Calculator className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items yet. Click "Add Item" to start calculating.</p>
            </div>
          )}

          {items.map(item => {
            const sellTotal = getItemTotal(item, 'selling')
            return (
              <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <select value={item.service_type} onChange={e => updateItem(item.id, 'service_type', e.target.value)}
                    className="px-2 py-1 border rounded text-sm font-medium">
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm" placeholder="Description..." />
                  <button onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 items-center text-sm">
                  <div>
                    <label className="text-xs text-gray-500">Cost/unit</label>
                    <input type="number" value={item.cost_per_unit || ''} onChange={e => updateItem(item.id, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border rounded text-sm" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Sell/unit</label>
                    <input type="number" value={item.selling_per_unit || ''} onChange={e => updateItem(item.id, 'selling_per_unit', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border rounded text-sm" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Qty</label>
                    <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border rounded text-sm" min="1" />
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="checkbox" checked={item.per_pax} onChange={e => updateItem(item.id, 'per_pax', e.target.checked)}
                      className="rounded border-gray-300" id={`pax-${item.id}`} />
                    <label htmlFor={`pax-${item.id}`} className="text-xs text-gray-600">Per pax</label>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="font-semibold text-sm">{sellTotal.toLocaleString()} {curSymbol}</div>
                  </div>
                </div>
              </div>
            )
          })}

          <button onClick={addItem}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-1 transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div className="border-t bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <table className="w-full">
                  <thead><tr><th className="text-left text-xs text-gray-500 pb-1"></th>
                    <th className="text-right text-xs text-gray-500 pb-1">{currency}</th>
                    {!isPKR && roe > 0 && <th className="text-right text-xs text-gray-500 pb-1">PKR</th>}
                  </tr></thead>
                  <tbody>
                    <tr><td className="text-gray-600">Total Cost:</td>
                      <td className="text-right font-medium">{totalCost.toLocaleString()}</td>
                      {!isPKR && roe > 0 && <td className="text-right font-medium">{totalCostPkr.toLocaleString()}</td>}</tr>
                    <tr><td className="text-gray-600">Total Selling:</td>
                      <td className="text-right font-medium">{totalSelling.toLocaleString()}</td>
                      {!isPKR && roe > 0 && <td className="text-right font-medium">{totalSellingPkr.toLocaleString()}</td>}</tr>
                    <tr className="border-t"><td className="text-green-700 font-medium pt-1">Total Profit:</td>
                      <td className={`text-right font-bold pt-1 ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{totalProfit.toLocaleString()}</td>
                      {!isPKR && roe > 0 && <td className={`text-right font-bold pt-1 ${totalProfitPkr >= 0 ? 'text-green-700' : 'text-red-700'}`}>{totalProfitPkr.toLocaleString()}</td>}</tr>
                    <tr><td className="text-gray-500 text-xs">Margin:</td>
                      <td className="text-right text-xs text-gray-500" colSpan={!isPKR && roe > 0 ? 2 : 1}>{margin.toFixed(1)}%</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Per Passenger ({paxCount})</div>
                <div className="text-sm">Cost: {costPerPax.toLocaleString()} {curSymbol}</div>
                <div className="text-sm">Selling: {sellingPerPax.toLocaleString()} {curSymbol}</div>
                {!isPKR && roe > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    = Rs {Math.round(paxCount > 0 ? totalSellingPkr / paxCount : 0).toLocaleString()} per pax
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t">
          <button onClick={copySummary} disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
          <button onClick={handleAddToQuery} disabled={items.length === 0 || addingToQuery}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <Package className="w-4 h-4" />
            {addingToQuery ? 'Adding...' : 'Add All to Query'}
          </button>
          <button onClick={clearAll} disabled={items.length === 0}
            className="ml-auto text-sm text-gray-500 hover:text-red-600 disabled:opacity-50">
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}
