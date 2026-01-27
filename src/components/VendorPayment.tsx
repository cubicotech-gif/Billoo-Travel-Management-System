import { useState } from 'react'
import { DollarSign, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface VendorPaymentProps {
  vendorId: string
  vendorName: string
  outstandingBalance: number
  onSuccess?: () => void
  onCancel?: () => void
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', icon: Banknote, color: 'text-green-600' },
  { value: 'Bank Transfer', label: 'Bank Transfer', icon: Building2, color: 'text-blue-600' },
  { value: 'Cheque', label: 'Cheque', icon: CreditCard, color: 'text-purple-600' },
  { value: 'UPI', label: 'UPI', icon: Smartphone, color: 'text-orange-600' },
  { value: 'Other', label: 'Other', icon: DollarSign, color: 'text-gray-600' },
] as const

export default function VendorPayment({
  vendorId,
  outstandingBalance,
  onSuccess,
  onCancel,
}: VendorPaymentProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'Bank Transfer',
    transaction_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const handleQuickAmount = (percentage: number) => {
    const amount = (outstandingBalance * percentage) / 100
    setFormData({ ...formData, amount: amount.toFixed(2) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(formData.amount)

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (amount > outstandingBalance) {
      const confirm = window.confirm(
        `Payment amount (₹${amount.toLocaleString('en-IN')}) exceeds outstanding balance (₹${outstandingBalance.toLocaleString('en-IN')}). Do you want to continue?`
      )
      if (!confirm) return
    }

    setSaving(true)

    try {
      // Record payment
      const { error: paymentError } = await supabase.from('payments').insert({
        vendor_id: vendorId,
        amount: amount,
        payment_method: formData.payment_method,
        transaction_id: formData.transaction_id || null,
        payment_date: formData.payment_date,
        notes: formData.notes || null,
      })

      if (paymentError) throw paymentError

      // Update vendor balance
      const newBalance = outstandingBalance - amount
      const { error: balanceError } = await supabase
        .from('vendors')
        .update({ balance: newBalance })
        .eq('id', vendorId)

      if (balanceError) throw balanceError

      // Log activity
      await supabase.from('activities').insert({
        entity_type: 'vendor',
        entity_id: vendorId,
        action: 'payment_received',
        description: `Payment of ₹${amount.toLocaleString('en-IN')} recorded via ${formData.payment_method}`,
      })

      // Reset form
      setFormData({
        amount: '',
        payment_method: 'Bank Transfer',
        transaction_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
      })

      alert('Payment recorded successfully!')

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error recording payment:', error)
      alert('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Outstanding Balance Banner */}
      <div
        className={`p-4 rounded-lg ${
          outstandingBalance > 0
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Outstanding Balance</p>
            <p
              className={`text-2xl font-bold ${
                outstandingBalance > 0 ? 'text-orange-900' : 'text-green-900'
              }`}
            >
              ₹{outstandingBalance.toLocaleString('en-IN')}
            </p>
          </div>
          {outstandingBalance > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickAmount(25)}
                className="px-3 py-1 text-xs bg-white border border-orange-300 rounded hover:bg-orange-50 transition-colors"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(50)}
                className="px-3 py-1 text-xs bg-white border border-orange-300 rounded hover:bg-orange-50 transition-colors"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => handleQuickAmount(100)}
                className="px-3 py-1 text-xs bg-white border border-orange-300 rounded hover:bg-orange-50 transition-colors font-medium"
              >
                Full
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Amount * (₹)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            required
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-medium"
          />
        </div>
        {formData.amount && parseFloat(formData.amount) > 0 && (
          <p className="mt-1 text-sm text-gray-500">
            Remaining balance after payment: ₹
            {Math.max(
              0,
              outstandingBalance - parseFloat(formData.amount)
            ).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon
            const isSelected = formData.payment_method === method.value
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: method.value })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon className={`h-6 w-6 ${isSelected ? 'text-primary-600' : method.color}`} />
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? 'text-primary-900' : 'text-gray-700'
                    }`}
                  >
                    {method.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Transaction ID/Reference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Transaction ID / Reference Number
        </label>
        <input
          type="text"
          value={formData.transaction_id}
          onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
          placeholder="Cheque no., UTR, or reference number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Payment Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Date *
        </label>
        <input
          type="date"
          required
          value={formData.payment_date}
          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Add any notes about this payment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? 'Recording Payment...' : 'Record Payment'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
