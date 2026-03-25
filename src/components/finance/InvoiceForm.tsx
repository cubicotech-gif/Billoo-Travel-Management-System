import { useState, useEffect } from 'react'
import { X, AlertCircle, FileText, Loader, Plus } from 'lucide-react'
import { createInvoice, createInvoiceItems } from '@/lib/api/finance'
import { fetchActivePassengers } from '@/lib/api/passengers'
import { fetchActiveVendors } from '@/lib/api/vendors'
import { formatCurrency } from '@/lib/formatCurrency'
import { supabase } from '@/lib/supabase'
import InvoiceItemRow from './InvoiceItemRow'
import type { InvoiceItemInput, PassengerOption, VendorOption, InvoiceStatus } from '@/types/finance'
import { ALL_INVOICE_STATUSES } from '@/types/finance'

interface InvoiceFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const CURRENCIES = ['PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP']

const emptyItem = (): InvoiceItemInput => ({
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_percentage: 0,
  service_type: null,
  vendor_id: null,
  purchase_price: 0,
  selling_price: 0,
})

export default function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [passengers, setPassengers] = useState<PassengerOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [queryOptions, setQueryOptions] = useState<{ id: string; query_number: string; client_name: string }[]>([])

  const [formData, setFormData] = useState({
    status: 'pending' as InvoiceStatus,
    due_date: '',
    currency: 'PKR',
    passenger_id: '',
    query_id: '',
    notes: '',
  })

  const [items, setItems] = useState<InvoiceItemInput[]>([emptyItem()])

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    const [pData, vData, qRes] = await Promise.all([
      fetchActivePassengers(),
      fetchActiveVendors(),
      supabase.from('queries').select('id, query_number, client_name').order('created_at', { ascending: false }).limit(100),
    ])
    setPassengers(pData)
    setVendors(vData)
    setQueryOptions(qRes.data || [])
  }

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: any) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index))

  // Calculate totals
  const totalAmount = items.reduce((sum, item) =>
    sum + item.quantity * item.unit_price * (1 + item.tax_percentage / 100), 0)
  const totalCost = items.reduce((sum, item) => sum + item.purchase_price, 0)
  const totalProfit = totalAmount - totalCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate at least one item with description
    const validItems = items.filter(i => i.description.trim())
    if (validItems.length === 0) {
      setError('Please add at least one line item with a description')
      return
    }
    if (totalAmount <= 0) {
      setError('Invoice total must be greater than 0')
      return
    }

    setSaving(true)
    try {
      // Create invoice
      const invoice = await createInvoice({
        amount: totalAmount,
        paid_amount: 0,
        total_cost: totalCost,
        total_profit: totalProfit,
        currency: formData.currency,
        status: formData.status,
        due_date: formData.due_date || null,
        passenger_id: formData.passenger_id || null,
        query_id: formData.query_id || null,
        notes: formData.notes.trim() || null,
      })

      // Create line items
      await createInvoiceItems(invoice.id, validItems.map(item => ({
        ...item,
        selling_price: item.quantity * item.unit_price,
      })))

      onSuccess()
    } catch (err: any) {
      console.error('Error creating invoice:', err)
      setError(err.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-primary-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-white mr-2" />
                  <h3 className="text-xl font-semibold text-white">Create Invoice</h3>
                </div>
                <button type="button" onClick={onCancel} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="px-6 py-4 max-h-[calc(100vh-250px)] overflow-y-auto space-y-4">
              {/* Invoice details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passenger</label>
                  <select
                    value={formData.passenger_id}
                    onChange={e => setFormData({ ...formData, passenger_id: e.target.value })}
                    className="input"
                  >
                    <option value="">None</option>
                    {passengers.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Query</label>
                  <select
                    value={formData.query_id}
                    onChange={e => setFormData({ ...formData, query_id: e.target.value })}
                    className="input"
                  >
                    <option value="">None</option>
                    {queryOptions.map(q => (
                      <option key={q.id} value={q.id}>{q.query_number} — {q.client_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as InvoiceStatus })}
                    className="input"
                  >
                    {ALL_INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    className="input"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Line Items</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <InvoiceItemRow
                      key={idx}
                      item={item}
                      index={idx}
                      vendors={vendors}
                      onChange={handleItemChange}
                      onRemove={removeItem}
                      canRemove={items.length > 1}
                    />
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium text-gray-700">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600">Profit</span>
                  <span className={`font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalProfit)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
