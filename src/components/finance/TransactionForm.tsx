import { useState, useEffect } from 'react'
import { X, AlertCircle, DollarSign, Loader } from 'lucide-react'
import { createTransaction } from '@/lib/api/finance'
import { fetchActivePassengers } from '@/lib/api/passengers'
import { fetchActiveVendors } from '@/lib/api/vendors'
import { logActivity } from '@/lib/api/activity'
import { supabase } from '@/lib/supabase'
import type {
  TransactionType, TransactionDirection, PassengerOption, VendorOption, InvoiceOption,
} from '@/types/finance'

interface TransactionFormProps {
  defaultType?: TransactionType
  defaultPassengerId?: string
  defaultVendorId?: string
  defaultInvoiceId?: string
  onSuccess: () => void
  onCancel: () => void
}

const TXN_TYPES: { value: TransactionType; label: string; direction: TransactionDirection }[] = [
  { value: 'payment_received', label: 'Payment Received (from client)', direction: 'in' },
  { value: 'payment_to_vendor', label: 'Payment to Vendor', direction: 'out' },
  { value: 'refund_to_client', label: 'Refund to Client', direction: 'out' },
  { value: 'refund_from_vendor', label: 'Refund from Vendor', direction: 'in' },
  { value: 'expense', label: 'Business Expense', direction: 'out' },
  { value: 'adjustment', label: 'Manual Adjustment', direction: 'in' },
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online Payment' },
  { value: 'other', label: 'Other' },
]

const CURRENCIES = ['PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP']

export default function TransactionForm({
  defaultType,
  defaultPassengerId,
  defaultVendorId,
  defaultInvoiceId,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [passengers, setPassengers] = useState<PassengerOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])

  const [formData, setFormData] = useState({
    type: defaultType || ('payment_received' as TransactionType),
    amount: '',
    currency: 'PKR',
    payment_method: 'bank_transfer',
    reference_number: '',
    passenger_id: defaultPassengerId || '',
    vendor_id: defaultVendorId || '',
    invoice_id: defaultInvoiceId || '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
  })

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    const [pData, vData, iRes] = await Promise.all([
      fetchActivePassengers(),
      fetchActiveVendors(),
      supabase.from('invoices').select('id, invoice_number, amount, paid_amount')
        .in('status', ['pending', 'partial', 'draft', 'sent'])
        .order('created_at', { ascending: false }),
    ])
    setPassengers(pData)
    setVendors(vData)
    setInvoices(iRes.data || [])
  }

  const selectedType = TXN_TYPES.find(t => t.value === formData.type)
  const direction = selectedType?.direction || 'in'
  const needsPassenger = ['payment_received', 'refund_to_client'].includes(formData.type)
  const needsVendor = ['payment_to_vendor', 'refund_from_vendor'].includes(formData.type)
  const needsInvoice = formData.type === 'payment_received'

  // Auto-suggest description based on type
  const getAutoDescription = () => {
    const typeName = selectedType?.label || ''
    if (needsPassenger && formData.passenger_id) {
      const p = passengers.find(p => p.id === formData.passenger_id)
      if (p) return `${typeName} - ${p.first_name} ${p.last_name}`
    }
    if (needsVendor && formData.vendor_id) {
      const v = vendors.find(v => v.id === formData.vendor_id)
      if (v) return `${typeName} - ${v.name}`
    }
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    setSaving(true)
    try {
      await createTransaction({
        type: formData.type,
        direction,
        amount,
        currency: formData.currency,
        payment_method: (formData.payment_method || null) as any,
        reference_number: formData.reference_number.trim() || null,
        passenger_id: formData.passenger_id || null,
        vendor_id: formData.vendor_id || null,
        invoice_id: formData.invoice_id || null,
        transaction_date: formData.transaction_date || new Date().toISOString(),
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
      })

      // Log activity
      const entityType = needsVendor ? 'vendor' : needsPassenger ? 'passenger' : 'transaction'
      const entityId = needsVendor ? formData.vendor_id : needsPassenger ? formData.passenger_id : null
      if (entityId) {
        await logActivity({
          entity_type: entityType,
          entity_id: entityId,
          action: direction === 'in' ? 'payment_received' : 'payment_made',
          description: `${selectedType?.label}: PKR ${amount.toLocaleString()}${formData.reference_number ? ` (Ref: ${formData.reference_number})` : ''}`,
        })
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error recording transaction:', err)
      setError(err.message || 'Failed to record transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-white mr-2" />
                  <h3 className="text-xl font-semibold text-white">Record Transaction</h3>
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
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType, passenger_id: '', vendor_id: '', invoice_id: '' })}
                  className="input"
                >
                  {TXN_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {direction === 'in' ? 'Money IN' : 'Money OUT'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number" required step="0.01" min="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="input" placeholder="0.00"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                    className="input"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date" required
                    value={formData.transaction_date}
                    onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                  className="input" placeholder="Cheque no., UTR, receipt no."
                />
              </div>

              {needsPassenger && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passenger</label>
                  <select
                    value={formData.passenger_id}
                    onChange={e => setFormData({ ...formData, passenger_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select passenger (optional)</option>
                    {passengers.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {needsVendor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <select
                    value={formData.vendor_id}
                    onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select vendor (optional)</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {needsInvoice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Invoice</label>
                  <select
                    value={formData.invoice_id}
                    onChange={e => setFormData({ ...formData, invoice_id: e.target.value })}
                    className="input"
                  >
                    <option value="">No invoice link</option>
                    {invoices.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.invoice_number} — Due: PKR {(i.amount - i.paid_amount).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Linking auto-updates invoice paid amount and status</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  placeholder={getAutoDescription() || 'Brief description of this transaction'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="input" placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn btn-secondary w-full sm:w-auto" disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={saving}>
                {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Recording...</> : 'Record Transaction'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
