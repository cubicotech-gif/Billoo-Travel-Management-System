import { useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import { getVendorLedgerEntries, type VendorLedgerEntry } from '@/lib/api/vendors'

interface VendorRunningLedgerProps {
  vendorId: string
}

export default function VendorRunningLedger({ vendorId }: VendorRunningLedgerProps) {
  const [entries, setEntries] = useState<VendorLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getVendorLedgerEntries(vendorId)
      .then(setEntries)
      .catch(err => console.error('Error loading ledger:', err))
      .finally(() => setLoading(false))
  }, [vendorId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    )
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No ledger entries found</p>
  }

  let runningBalance = 0

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Owed (+)</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid (-)</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {entries.map((entry, i) => {
            runningBalance += entry.owed - entry.paid
            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {format(new Date(entry.date), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.ref}</td>
                <td className="px-4 py-3 text-gray-900">{entry.description}</td>
                <td className="px-4 py-3 text-gray-600">{entry.passengerName || '—'}</td>
                <td className="px-4 py-3 text-right text-red-600">
                  {entry.owed > 0 ? formatCurrency(entry.owed) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {entry.paid > 0 ? formatCurrency(entry.paid) : entry.paid < 0 ? `(${formatCurrency(Math.abs(entry.paid))})` : '—'}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${runningBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(Math.abs(runningBalance))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
