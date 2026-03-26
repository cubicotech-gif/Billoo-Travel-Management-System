import { useState, useEffect } from 'react'
import { X, AlertCircle, DollarSign, Loader, ArrowRightLeft } from 'lucide-react'
import { createTransaction, updatePassengerCreditBalance } from '@/lib/api/finance'
import { fetchActivePassengers } from '@/lib/api/passengers'
import { fetchActiveVendors } from '@/lib/api/vendors'
import { logActivity } from '@/lib/api/activity'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'
import type {
  TransactionType, TransactionDirection, CurrencyCode,
  PassengerOption, VendorOption, InvoiceOption, PaymentMode,
} from '@/types/finance'
import { ALL_CURRENCIES } from '@/types/finance'

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
    original_currency: 'PKR' as CurrencyCode,
    original_amount: '',
    exchange_rate: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    passenger_id: defaultPassengerId || '',
    vendor_id: defaultVendorId || '',
    invoice_id: defaultInvoiceId || '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    payment_mode: 'specific' as PaymentMode,
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
  const isVendorPayment = formData.type === 'payment_to_vendor'
  const isForeignCurrency = formData.original_currency !== 'PKR'

  // PKR equivalent calculation
  const originalAmount = parseFloat(formData.original_amount) || 0
  const exchangeRate = parseFloat(formData.exchange_rate) || 0
  const pkrEquivalent = isForeignCurrency && exchangeRate > 0
    ? originalAmount * exchangeRate
    : originalAmount

  // For collective vendor payments, hide passenger/invoice selectors
  const showPassengerForVendor = isVendorPayment && formData.payment_mode === 'specific'
  const showInvoiceForVendor = isVendorPayment && formData.payment_mode === 'specific'

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

    if (originalAmount <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }
    if (isForeignCurrency && exchangeRate <= 0) {
      setError('Please enter a valid exchange rate for the selected currency')
      return
    }

    setSaving(true)
    try {
      await createTransaction({
        type: formData.type,
        direction,
        amount: pkrEquivalent,
        currency: 'PKR',
        payment_method: (formData.payment_method || null) as any,
        reference_number: formData.reference_number.trim() || null,
        passenger_id: (isVendorPayment && formData.payment_mode === 'collective')
          ? null
          : formData.passenger_id || null,
        vendor_id: formData.vendor_id || null,
        invoice_id: (isVendorPayment && formData.payment_mode === 'collective')
          ? null
          : formData.invoice_id || null,
        transaction_date: formData.transaction_date || new Date().toISOString(),
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        // ROE fields
        original_amount: isForeignCurrency ? originalAmount : null,
        original_currency: formData.original_currency,
        exchange_rate: isForeignCurrency ? exchangeRate : null,
        // Payment mode
        payment_mode: isVendorPayment ? formData.payment_mode : 'specific',
      })

      // Log activity
      const entityType = needsVendor ? 'vendor' : needsPassenger ? 'passenger' : 'transaction'
      const entityId = needsVendor ? formData.vendor_id : needsPassenger ? formData.passenger_id : null
      if (entityId) {
        const amountLabel = isForeignCurrency
          ? `${formData.original_currency} ${originalAmount.toLocaleString()} @ ${exchangeRate} = PKR ${pkrEquivalent.toLocaleString()}`
          : `PKR ${pkrEquivalent.toLocaleString()}`
        await logActivity({
          entity_type: entityType,
          entity_id: entityId,
          action: direction === 'in' ? 'payment_received' : 'payment_made',
          description: `${selectedType?.label}: ${amountLabel}${formData.reference_number ? ` (Ref: ${formData.reference_number})` : ''}`,
        })
      }

      // Update passenger credit balance if payment_received
      if (formData.type === 'payment_received' && formData.passenger_id) {
        await updatePassengerCreditBalance(formData.passenger_id)
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
                  onChange={e => setFormData({
                    ...formData,
                    type: e.target.value as TransactionType,
                    passenger_id: '', vendor_id: '', invoice_id: '',
                    payment_mode: 'specific',
                  })}
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

              {/* Payment Mode Toggle (for vendor payments only) */}
              {isVendorPayment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_mode: 'specific', passenger_id: '', invoice_id: '' })}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        formData.payment_mode === 'specific'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Specific Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_mode: 'collective', passenger_id: '', invoice_id: '' })}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        formData.payment_mode === 'collective'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Collective Payment
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.payment_mode === 'collective'
                      ? 'Lump sum payment to vendor — not linked to any specific passenger or invoice'
                      : 'Payment linked to a specific passenger and/or invoice'}
                  </p>
                </div>
              )}

              {/* Currency + Amount + ROE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CURRENCIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, original_currency: c, exchange_rate: '' })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        formData.original_currency === c
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount ({formData.original_currency}) *
                  </label>
                  <input
                    type="number" required step="0.01" min="0.01"
                    value={formData.original_amount}
                    onChange={e => setFormData({ ...formData, original_amount: e.target.value })}
                    className="input" placeholder="0.00"
                  />
                </div>

                {isForeignCurrency && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ROE (1 {formData.original_currency} = ? PKR) *
                    </label>
                    <input
                      type="number" required step="0.0001" min="0.0001"
                      value={formData.exchange_rate}
                      onChange={e => setFormData({ ...formData, exchange_rate: e.target.value })}
                      className="input" placeholder="e.g. 77.50"
                    />
                  </div>
                )}
              </div>

              {/* PKR Equivalent display */}
              {isForeignCurrency && originalAmount > 0 && exchangeRate > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-blue-900">
                      {formData.original_currency} {originalAmount.toLocaleString()} × {exchangeRate} =
                    </span>
                    <span className="ml-1 font-bold text-blue-900">
                      PKR {formatCurrency(pkrEquivalent).replace('Rs ', '')}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <select
                    value={formData.vendor_id}
                    onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Passenger selector for specific vendor payments */}
              {showPassengerForVendor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passenger (optional)</label>
                  <select
                    value={formData.passenger_id}
                    onChange={e => setFormData({ ...formData, passenger_id: e.target.value })}
                    className="input"
                  >
                    <option value="">No passenger link</option>
                    {passengers.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
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

              {/* Invoice selector for specific vendor payments */}
              {showInvoiceForVendor && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Invoice (optional)</label>
                  <select
                    value={formData.invoice_id}
                    onChange={e => setFormData({ ...formData, invoice_id: e.target.value })}
                    className="input"
                  >
                    <option value="">No invoice link</option>
                    {invoices.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.invoice_number} — PKR {i.amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
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
