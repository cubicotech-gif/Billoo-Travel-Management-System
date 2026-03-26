import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader, ArrowRightLeft, Users, Layers } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { recordVendorPayment, getVendorPassengers } from '@/lib/api/vendors'
import type { PaymentMethod, CurrencyCode } from '@/types/finance'
import { ALL_CURRENCIES } from '@/types/finance'

interface RecordVendorPaymentModalProps {
  vendorId: string
  vendorName: string
  balanceDue: number
  onSuccess: () => void
  onCancel: () => void
}

interface VendorPassenger {
  id: string
  firstName: string
  lastName: string
  invoices: { id: string; invoiceNumber: string }[]
}

type PaymentMode = 'collective' | 'specific'

export default function RecordVendorPaymentModal({
  vendorId, vendorName, balanceDue, onSuccess, onCancel,
}: RecordVendorPaymentModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [passengers, setPassengers] = useState<VendorPassenger[]>([])

  // Mode
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('collective')

  // Form
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [description, setDescription] = useState('')

  // Specific mode
  const [passengerId, setPassengerId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')

  // ROE
  const [currency, setCurrency] = useState<CurrencyCode>('PKR')
  const [originalAmount, setOriginalAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')

  const isForeign = currency !== 'PKR'
  const rateNum = parseFloat(exchangeRate) || 0
  const originalNum = parseFloat(originalAmount) || 0
  const pkrAmount = isForeign && rateNum > 0 ? originalNum * rateNum : parseFloat(amount) || 0

  useEffect(() => {
    loadPassengers()
  }, [])

  const loadPassengers = async () => {
    try {
      const data = await getVendorPassengers(vendorId)
      setPassengers(data)
    } catch (err) {
      console.error('Error loading passengers:', err)
    }
  }

  useEffect(() => {
    if (isForeign && rateNum > 0 && originalNum > 0) {
      setAmount((originalNum * rateNum).toFixed(2))
    }
  }, [originalAmount, exchangeRate, currency])

  const handleQuickAmount = (pct: number) => {
    const val = (balanceDue * pct) / 100
    if (isForeign) return
    setAmount(val.toFixed(2))
  }

  const selectedPassenger = passengers.find(p => p.id === passengerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (pkrAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    if (isForeign && rateNum <= 0) {
      setError('Please enter a valid exchange rate')
      return
    }

    setSaving(true)
    try {
      await recordVendorPayment(vendorId, {
        amount: pkrAmount,
        paymentMethod,
        transactionDate,
        referenceNumber: referenceNumber || undefined,
        description: description || `Payment to ${vendorName}${paymentMode === 'collective' ? ' (collective)' : ''}`,
        paymentMode,
        passengerId: paymentMode === 'specific' && passengerId ? passengerId : null,
        invoiceId: paymentMode === 'specific' && invoiceId ? invoiceId : null,
        originalAmount: isForeign ? originalNum : null,
        originalCurrency: isForeign ? currency : null,
        exchangeRate: isForeign ? rateNum : null,
      })
      onSuccess()
    } catch (err: any) {
      console.error('Error recording vendor payment:', err)
      setError(err.message || 'Failed to record payment')
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
            <div className="bg-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Record Vendor Payment</h3>
                <button type="button" onClick={onCancel} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-purple-100 text-sm mt-1">To: {vendorName}</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="px-6 py-4 space-y-4">
              {/* Payment Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentMode('collective'); setPassengerId(''); setInvoiceId('') }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      paymentMode === 'collective'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Collective</p>
                      <p className="text-xs opacity-70">Lump sum payment</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('specific')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      paymentMode === 'specific'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Specific</p>
                      <p className="text-xs opacity-70">Linked to passenger</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Balance info */}
              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-sm text-orange-700">Balance Due</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-orange-700">{formatCurrency(balanceDue)}</span>
                  {balanceDue > 0 && !isForeign && (
                    <div className="flex gap-1 mt-1">
                      {[25, 50, 100].map(pct => (
                        <button key={pct} type="button" onClick={() => handleQuickAmount(pct)}
                          className="px-2 py-0.5 text-xs bg-white border border-orange-300 rounded hover:bg-orange-50">
                          {pct === 100 ? 'Full' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Specific mode: passenger & invoice selectors */}
              {paymentMode === 'specific' && (
                <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Passenger</label>
                    <select value={passengerId} onChange={e => { setPassengerId(e.target.value); setInvoiceId('') }} className="input text-sm">
                      <option value="">Select passenger (optional)</option>
                      {passengers.map(p => (
                        <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                      ))}
                    </select>
                  </div>
                  {selectedPassenger && selectedPassenger.invoices.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-1">Invoice</label>
                      <select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className="input text-sm">
                        <option value="">Select invoice (optional)</option>
                        {selectedPassenger.invoices.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Currency pills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CURRENCIES.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setCurrency(c)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        currency === c
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {c}
                    </button>
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
                        onChange={e => setOriginalAmount(e.target.value)}
                        className="input" placeholder="0.00" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ROE (1 {currency} = PKR)</label>
                      <input type="number" step="0.0001" min="0.0001" value={exchangeRate}
                        onChange={e => setExchangeRate(e.target.value)}
                        className="input" placeholder="e.g. 77.50" required />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR)</label>
                  <input type="number" step="0.01" min="0" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input" placeholder="0.00" required />
                </div>
              )}

              {/* Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)}
                    className="input" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input type="text" value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  className="input" placeholder="Cheque #, Receipt #, etc." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input" placeholder={`Payment to ${vendorName}`} />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary bg-purple-600 hover:bg-purple-700" disabled={saving}>
                {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Recording...</> : `Record Payment ${pkrAmount > 0 ? formatCurrency(pkrAmount) : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
