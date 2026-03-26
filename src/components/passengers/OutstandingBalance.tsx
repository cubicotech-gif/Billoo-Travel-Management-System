import { AlertTriangle, CheckCircle, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'

interface OutstandingBalanceProps {
  totalBilled: number
  totalPaid: number
  creditBalance: number
}

export default function OutstandingBalance({ totalBilled, totalPaid, creditBalance }: OutstandingBalanceProps) {
  const outstanding = totalBilled - totalPaid
  const hasOutstanding = outstanding > 0
  const hasCredit = creditBalance > 0

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
      hasCredit
        ? 'bg-blue-100 text-blue-800'
        : hasOutstanding
          ? 'bg-red-100 text-red-800'
          : 'bg-green-100 text-green-800'
    }`}>
      {hasCredit ? (
        <>
          <Wallet className="w-4 h-4" />
          Credit: {formatCurrency(creditBalance)}
        </>
      ) : hasOutstanding ? (
        <>
          <AlertTriangle className="w-4 h-4" />
          Due: {formatCurrency(outstanding)}
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
          Settled
        </>
      )}
    </div>
  )
}
