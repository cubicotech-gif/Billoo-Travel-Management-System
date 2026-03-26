import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader, ArrowRightLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { recordVendorRefund, getVendorPassengers } from '@/lib/api/vendors'
import type { PaymentMethod, CurrencyCode } from '@/types/finance'
import { ALL_CURRENCIES } from '@/types/finance'

interface RecordVendorRefundModalProps {
  vendorId: string
  vendorName: string
  onSuccess: () => void
  onCancel: () => void
}

export default function RecordVendorRefundModal({
  vendorId, vendorName, onSuccess, onCancel,
}: RecordVendorRefundModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [passengers, setPassengers] = useState<{ id: string; firstName: string; lastName: string }[]>([])

  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [reason, setReason] = useState('')
  const [passengerId, setPassengerId] = useState('')

  // ROE
  const [currency, setCurrency] = useState<CurrencyCode>('PKR')
  const [originalAmount, setOriginalAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')

  const isForeign = currency !== 'PKR'
  const rateNum = parseFloat(exchangeRate) || 0
  const originalNum = parseFloat(originalAmount) || 0
  const pkrAmount = isForeign && rateNum > 0 ? originalNum * rateNum : parseFloat(amount) || 0

  useEffect(() => {
    getVendorPassengers(vendorId).then(setPassengers).catch(() => {})
  }, [])

  useEffect(() => {
    if (isForeign && rateNum > 0 && originalNum > 0) {
      setAmount((originalNum * rateNum).toFixed(2))
    }
  }, [originalAmount, exchangeRate, currency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (pkrAmount <= 0) {
      setError('Refund amount must be greater than 0')
      return
    }
    if (isForeign && rateNum <= 0) {
      setError('Please enter a valid exchange rate')
      return
    }

    setSaving(true)
    try {
      await recordVendorRefund(vendorId, {
        amount: pkrAmount,
        paymentMethod,
        transactionDate,
        referenceNumber: referenceNumber || undefined,
        description: reason || `Refund from ${vendorName}`,
        passengerId: passengerId || null,
        originalAmount: isForeign ? originalNum : null,
        originalCurrency: isForeign ? currency : null,
        exchangeRate: isForeign ? rateNum : null,
      })
      onSuccess()
    } catch (err: any) {
      console.error('Error recording vendor refund:', err)
      setError(err.message || 'Failed to record refund')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Record Vendor Refund</h3>
                <button type="button" onClick={onCancel} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">From: {vendorName}</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="px-6 py-4 space-y-4">
              {/* Linked Passenger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Passenger</label>
                <select value={passengerId} onChange={e => setPassengerId(e.target.value)} className="input">
                  <option value="">None (general refund)</option>
                  {passengers.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CURRENCIES.map(c => (
                    <button key={c} type="button" onClick={() => setCurrency(c)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        currency === c ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              {isForeign ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency})</label>
                      <input type="number" step="0.01" min="0" value={originalAmount}
                        onChange={e => setOriginalAmount(e.target.value)} className="input" placeholder="0.00" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ROE (1 {currency} = PKR)</label>
                      <input type="number" step="0.0001" min="0.0001" value={exchangeRate}
                        onChange={e => setExchangeRate(e.target.value)} className="input" placeholder="e.g. 77.50" required />
                    </div>
                  </div>
                  {rateNum > 0 && originalNum > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <ArrowRightLeft className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm text-blue-800">PKR Equivalent: <strong>{formatCurrency(pkrAmount)}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (PKR)</label>
                  <input type="number" step="0.01" min="0" value={amount}
                    onChange={e => setAmount(e.target.value)} className="input" placeholder="0.00" required />
                </div>
              )}

              {/* Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)} className="input" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input type="text" value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)} className="input" placeholder="Optional" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
                <textarea rows={2} value={reason}
                  onChange={e => setReason(e.target.value)} className="input" placeholder="Reason for refund..." />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}>
                {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : `Record Refund ${pkrAmount > 0 ? formatCurrency(pkrAmount) : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
