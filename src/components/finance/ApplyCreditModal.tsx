import { useState } from 'react'
import { X, AlertCircle, Loader, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { applyPassengerCredit } from '@/lib/api/finance'

interface ApplyCreditModalProps {
  passengerId: string
  passengerName: string
  creditBalance: number
  invoiceId: string
  invoiceNumber: string
  invoiceBalance: number
  onSuccess: () => void
  onCancel: () => void
}

export default function ApplyCreditModal({
  passengerName, creditBalance,
  invoiceId, invoiceNumber, invoiceBalance,
  passengerId, onSuccess, onCancel,
}: ApplyCreditModalProps) {
  const maxApply = Math.min(creditBalance, invoiceBalance)
  const [amount, setAmount] = useState(maxApply.toFixed(2))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const amtNum = parseFloat(amount) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (amtNum <= 0) { setError('Amount must be greater than 0'); return }
    if (amtNum > creditBalance) { setError(`Cannot apply more than credit balance (${formatCurrency(creditBalance)})`); return }
    if (amtNum > invoiceBalance) { setError(`Cannot apply more than invoice balance (${formatCurrency(invoiceBalance)})`); return }

    setSaving(true)
    try {
      await applyPassengerCredit(passengerId, invoiceId, amtNum)
      onSuccess()
    } catch (err: any) {
      console.error('Error applying credit:', err)
      setError(err.message || 'Failed to apply credit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-white" />
                  <h3 className="text-xl font-semibold text-white">Apply Credit</h3>
                </div>
                <button type="button" onClick={onCancel} className="text-white hover:text-gray-200">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">{passengerName}</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-xs text-blue-700">Credit Balance</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(creditBalance)}</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <p className="text-xs text-orange-700">Invoice Due</p>
                  <p className="text-lg font-bold text-orange-900">{formatCurrency(invoiceBalance)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Apply credit to <strong>{invoiceNumber}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Apply (PKR)</label>
                <input
                  type="number" step="0.01" min="0.01" max={maxApply}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="input" required
                />
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setAmount(maxApply.toFixed(2))}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                    Max ({formatCurrency(maxApply)})
                  </button>
                  {invoiceBalance < creditBalance && (
                    <button type="button" onClick={() => setAmount(invoiceBalance.toFixed(2))}
                      className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
                      Full Invoice
                    </button>
                  )}
                </div>
              </div>

              {amtNum > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  After applying: Credit balance will be <strong>{formatCurrency(creditBalance - amtNum)}</strong>,
                  invoice due will be <strong>{formatCurrency(invoiceBalance - amtNum)}</strong>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary bg-blue-600 hover:bg-blue-700" disabled={saving}>
                {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Applying...</> : `Apply ${formatCurrency(amtNum)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
