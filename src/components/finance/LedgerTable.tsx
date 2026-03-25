import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Transaction } from '@/types/finance'
import { PAYMENT_METHOD_LABELS } from '@/types/finance'

interface LedgerTableProps {
  transactions: Transaction[]
  showBalance?: boolean
  compact?: boolean
}

export default function LedgerTable({ transactions, showBalance = true, compact = false }: LedgerTableProps) {
  // Calculate running balance (chronological order)
  const balanceMap = new Map<string, number>()
  if (showBalance) {
    const sorted = [...transactions].sort((a, b) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )
    let balance = 0
    sorted.forEach(txn => {
      balance += txn.direction === 'in' ? txn.amount : -txn.amount
      balanceMap.set(txn.id, balance)
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            {!compact && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Txn #</th>}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            {!compact && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>}
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">In</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Out</th>
            {showBalance && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map(txn => (
            <tr key={txn.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 text-gray-400 mr-1" />
                  {format(new Date(txn.transaction_date), compact ? 'MMM d' : 'MMM d, yyyy')}
                </div>
              </td>
              {!compact && (
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{txn.transaction_number}</td>
              )}
              <td className="px-4 py-3">
                <StatusBadge status={txn.type} type="transaction" />
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                {txn.description || '—'}
                {txn.payment_method && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({PAYMENT_METHOD_LABELS[txn.payment_method] || txn.payment_method})
                  </span>
                )}
              </td>
              {!compact && (
                <td className="px-4 py-3 text-sm">
                  {txn.passengers && (
                    <Link to={`/passengers/${txn.passenger_id}`} className="text-primary-600 hover:text-primary-800">
                      {txn.passengers.first_name} {txn.passengers.last_name}
                    </Link>
                  )}
                  {txn.vendors && (
                    <Link to={`/vendors/${txn.vendor_id}`} className="text-purple-600 hover:text-purple-800">
                      {txn.vendors.name}
                    </Link>
                  )}
                  {!txn.passengers && !txn.vendors && <span className="text-gray-400">—</span>}
                </td>
              )}
              <td className="px-4 py-3 text-sm text-right font-medium">
                {txn.direction === 'in' ? (
                  <span className="text-green-600">{formatCurrency(txn.amount)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium">
                {txn.direction === 'out' ? (
                  <span className="text-red-600">{formatCurrency(txn.amount)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              {showBalance && (
                <td className="px-4 py-3 text-sm text-right font-medium">
                  <span className={(balanceMap.get(txn.id) || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}>
                    {formatCurrency(Math.abs(balanceMap.get(txn.id) || 0))}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
