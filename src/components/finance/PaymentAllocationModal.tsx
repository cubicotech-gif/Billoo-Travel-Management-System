import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader, ArrowRightLeft, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  getPassengerPendingInvoices,
  allocatePaymentToInvoices,
  type PaymentAllocation,
} from '@/lib/api/finance'
import type { PaymentMethod, CurrencyCode } from '@/types/finance'
import { ALL_CURRENCIES } from '@/types/finance'

interface PaymentAllocationModalProps {
  passengerId: string
  passengerName: string
  onSuccess: () => void
  onCancel: () => void
}

interface PendingInvoice {
  id: string
  invoice_number: string
  amount: number
  paid_amount: number
  pending: number
  status: string
  due_date: string | null
}

export default function PaymentAllocationModal({
  passengerId, passengerName, onSuccess, onCancel,
}: PaymentAllocationModalProps) {
  const [invoices, setInvoices] = useState<PendingInvoice[]>([])
  const [allocations, setAllocations] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Payment fields
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])

  // ROE
  const [currency, setCurrency] = useState<CurrencyCode>('PKR')
  const [originalAmount, setOriginalAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')

  const isForeign = currency !== 'PKR'
  const rateNum = parseFloat(exchangeRate) || 0
  const originalNum = parseFloat(originalAmount) || 0
  const pkrTotal = isForeign && rateNum > 0 ? originalNum * rateNum : parseFloat(totalAmount) || 0

  useEffect(() => {
    getPassengerPendingInvoices(passengerId)
      .then(data => {
        setInvoices(data)
        // Auto-allocate: fill all invoices to their pending amounts
        const allocs: Record<string, string> = {}
        data.forEach(inv => { allocs[inv.id] = '' })
        setAllocations(allocs)
      })
      .catch(err => console.error('Error loading invoices:', err))
      .finally(() => setLoading(false))
  }, [passengerId])

  // Auto-calculate PKR when foreign currency
  useEffect(() => {
    if (isForeign && rateNum > 0 && originalNum > 0) {
      setTotalAmount((originalNum * rateNum).toFixed(2))
    }
  }, [originalAmount, exchangeRate, currency])

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const unallocated = pkrTotal - totalAllocated
  const totalPending = invoices.reduce((s, inv) => s + inv.pending, 0)

  const autoAllocate = () => {
    let remaining = pkrTotal
    const newAllocs: Record<string, string> = {}
    for (const inv of invoices) {
      if (remaining <= 0) { newAllocs[inv.id] = ''; continue }
      const alloc = Math.min(remaining, inv.pending)
      newAllocs[inv.id] = alloc.toFixed(2)
      remaining -= alloc
    }
    setAllocations(newAllocs)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (pkrTotal <= 0) { setError('Payment amount must be greater than 0'); return }
    if (isForeign && rateNum <= 0) { setError('Please enter a valid exchange rate'); return }
    if (totalAllocated > pkrTotal) { setError('Allocated amount exceeds total payment'); return }

    const allocationsList: PaymentAllocation[] = Object.entries(allocations)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([invoiceId, v]) => ({ invoiceId, amount: parseFloat(v) }))

    if (allocationsList.length === 0 && invoices.length > 0) {
      setError('Please allocate the payment to at least one invoice, or the full amount will go to credit')
    }

    setSaving(true)
    try {
      await allocatePaymentToInvoices(passengerId, pkrTotal, allocationsList, {
        paymentMethod,
        transactionDate,
        referenceNumber: referenceNumber || undefined,
        description: description || `Payment from ${passengerName}`,
        originalAmount: isForeign ? originalNum : null,
        originalCurrency: isForeign ? currency : null,
        exchangeRate: isForeign ? rateNum : null,
      })
      onSuccess()
    } catch (err: any) {
      console.error('Error allocating payment:', err)
      setError(err.message || 'Failed to allocate payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-green-600 px-6 py-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Record Payment</h3>
                <button type="button" onClick={onCancel} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-green-100 text-sm mt-1">From: {passengerName}</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="px-6 py-4 space-y-4">
              {/* Currency pills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CURRENCIES.map(c => (
                    <button key={c} type="button" onClick={() => setCurrency(c)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        currency === c ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-800">PKR Equivalent: <strong>{formatCurrency(pkrTotal)}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Payment (PKR)</label>
                  <input type="number" step="0.01" min="0" value={totalAmount}
                    onChange={e => setTotalAmount(e.target.value)}
                    className="input" placeholder="0.00" required />
                  {totalPending > 0 && (
                    <p className="text-xs text-gray-500 mt-1">Total pending: {formatCurrency(totalPending)}</p>
                  )}
                </div>
              )}

              {/* Payment method & date */}
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
                  <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className="input" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                  className="input" placeholder="Cheque #, Receipt #, etc." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  className="input" placeholder={`Payment from ${passengerName}`} />
              </div>

              {/* Invoice Allocation */}
              {!loading && invoices.length > 0 && pkrTotal > 0 && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-t-lg">
                    <h4 className="text-sm font-semibold text-gray-900">Allocate to Invoices</h4>
                    <button type="button" onClick={autoAllocate}
                      className="text-xs font-medium text-green-600 hover:text-green-700">
                      Auto-Allocate
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {invoices.map(inv => (
                      <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                          <p className="text-xs text-gray-500">Due: {formatCurrency(inv.pending)}</p>
                        </div>
                        <div className="w-32">
                          <input
                            type="number" step="0.01" min="0" max={inv.pending}
                            value={allocations[inv.id] || ''}
                            onChange={e => setAllocations({ ...allocations, [inv.id]: e.target.value })}
                            className="input text-sm text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex items-center justify-between">
                    <span className="text-xs text-gray-500">Allocated: {formatCurrency(totalAllocated)}</span>
                    {unallocated > 0.01 ? (
                      <span className="text-xs font-medium text-orange-600">
                        {formatCurrency(unallocated)} goes to credit balance
                      </span>
                    ) : unallocated < -0.01 ? (
                      <span className="text-xs font-medium text-red-600">
                        Over-allocated by {formatCurrency(Math.abs(unallocated))}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Fully allocated
                      </span>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-4">
                  <Loader className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sticky bottom-0">
              <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary bg-green-600 hover:bg-green-700" disabled={saving}>
                {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : `Record ${pkrTotal > 0 ? formatCurrency(pkrTotal) : 'Payment'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
