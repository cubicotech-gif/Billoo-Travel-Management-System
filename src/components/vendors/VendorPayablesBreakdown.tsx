import { useEffect, useState } from 'react'
import { Loader, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/formatCurrency'
import { getVendorPayablesBreakdown, type VendorPayablesPassenger } from '@/lib/api/vendors'

interface VendorPayablesBreakdownProps {
  vendorId: string
}

export default function VendorPayablesBreakdown({ vendorId }: VendorPayablesBreakdownProps) {
  const [passengers, setPassengers] = useState<VendorPayablesPassenger[]>([])
  const [specificPayments, setSpecificPayments] = useState(0)
  const [collectivePayments, setCollectivePayments] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    getVendorPayablesBreakdown(vendorId)
      .then(data => {
        setPassengers(data.passengers)
        setSpecificPayments(data.specificPayments)
        setCollectivePayments(data.collectivePayments)
        setTotalPaid(data.totalPaid)
      })
      .catch(err => console.error('Error loading payables:', err))
      .finally(() => setLoading(false))
  }, [vendorId])

  const toggleExpand = (pid: string) => {
    const next = new Set(expanded)
    if (next.has(pid)) next.delete(pid)
    else next.add(pid)
    setExpanded(next)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    )
  }

  const totalOwed = passengers.reduce((s, p) => s + p.totalOwed, 0)

  return (
    <div className="space-y-4">
      {/* Payment summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <p className="text-xs text-blue-700">Specific Payments</p>
          <p className="text-lg font-bold text-blue-900">{formatCurrency(specificPayments)}</p>
        </div>
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-xs text-gray-600">Collective Payments</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(collectivePayments)}</p>
        </div>
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-xs text-green-700">Total Paid</p>
          <p className="text-lg font-bold text-green-900">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {passengers.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No payable items found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Services</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {passengers.map(p => {
                const isExpanded = expanded.has(p.passengerId)
                return (
                  <tr key={p.passengerId} className="group">
                    <td className="px-4 py-3" colSpan={3}>
                      {/* Passenger row */}
                      <button
                        onClick={() => toggleExpand(p.passengerId)}
                        className="w-full flex items-center justify-between hover:bg-gray-50 -mx-4 px-4 py-1 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <Link
                            to={`/passengers/${p.passengerId}`}
                            onClick={e => e.stopPropagation()}
                            className="font-medium text-purple-600 hover:text-purple-800"
                          >
                            {p.passengerName}
                          </Link>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className="text-xs text-gray-500">{p.services.length} service{p.services.length !== 1 ? 's' : ''}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(p.totalOwed)}</span>
                        </div>
                      </button>

                      {/* Expanded services */}
                      {isExpanded && (
                        <div className="mt-2 ml-6 space-y-1">
                          {p.services.map((svc, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 pl-4 border-l-2 border-purple-200 text-xs text-gray-600">
                              <div>
                                <span className="font-medium text-gray-700">{svc.serviceType}</span>
                                <span className="ml-2">{svc.description}</span>
                                {svc.invoiceNumber && <span className="ml-2 text-gray-400">({svc.invoiceNumber})</span>}
                              </div>
                              <span className="font-medium text-gray-900">{formatCurrency(svc.purchasePrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(totalOwed)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
