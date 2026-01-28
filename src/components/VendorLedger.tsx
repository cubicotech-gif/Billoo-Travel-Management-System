import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface LedgerEntry {
  id: string
  date: string
  type: 'purchase' | 'payment'
  description: string
  debit: number // Amount owed to vendor (purchases)
  credit: number // Amount paid to vendor (payments)
  balance: number
  reference?: string
  query_number?: string
}

interface VendorLedgerProps {
  vendorId: string
  vendorName: string
  onBalanceUpdate?: (balance: number) => void
}

export default function VendorLedger({
  vendorId,
  vendorName,
  onBalanceUpdate,
}: VendorLedgerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalPayments: 0,
    currentBalance: 0,
    transactionCount: 0,
  })

  useEffect(() => {
    loadLedgerEntries()
  }, [vendorId])

  const loadLedgerEntries = async () => {
    try {
      // Fetch purchases from query_services (where vendor name matches)
      const { data: services, error: servicesError } = await supabase
        .from('query_services')
        .select(`
          id,
          query_id,
          type,
          description,
          vendor,
          cost_price,
          service_date,
          created_at,
          queries:query_id (
            query_number
          )
        `)
        .ilike('vendor', vendorName)
        .order('created_at', { ascending: false })

      if (servicesError) throw servicesError

      // Fetch payments to this vendor
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('payment_date', { ascending: false })

      if (paymentsError) throw paymentsError

      // Combine and process entries
      const allEntries: LedgerEntry[] = [] as LedgerEntry[]

      // Add purchases as debit entries
      const servicesList: any[] = services || []
      servicesList.forEach((service: any) => {
        allEntries.push({
          id: service.id,
          date: service.service_date || service.created_at,
          type: 'purchase',
          description: `${service.type} - ${service.description}`,
          debit: service.cost_price || 0,
          credit: 0,
          balance: 0, // Will calculate running balance
          query_number: service.queries?.query_number || 'N/A',
        })
      })

      // Add payments as credit entries
      const paymentsList: any[] = payments || []
      paymentsList.forEach((payment: any) => {
        allEntries.push({
          id: payment.id,
          date: payment.payment_date,
          type: 'payment',
          description: `Payment via ${payment.payment_method}${payment.notes ? ` - ${payment.notes}` : ''}`,
          debit: 0,
          credit: payment.amount,
          balance: 0, // Will calculate running balance
          reference: payment.transaction_id || undefined,
        })
      })

      // Sort by date (oldest first for balance calculation)
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculate running balance
      let runningBalance = 0
      allEntries.forEach((entry: LedgerEntry) => {
        runningBalance += entry.debit - entry.credit
        entry.balance = runningBalance
      })

      // Reverse to show newest first
      allEntries.reverse()

      setEntries(allEntries)

      // Calculate summary
      const totalPurchases = allEntries
        .filter((e) => e.type === 'purchase')
        .reduce((sum, e) => sum + e.debit, 0)

      const totalPayments = allEntries
        .filter((e) => e.type === 'payment')
        .reduce((sum, e) => sum + e.credit, 0)

      const currentBalance = totalPurchases - totalPayments

      setSummary({
        totalPurchases,
        totalPayments,
        currentBalance,
        transactionCount: allEntries.length,
      })

      if (onBalanceUpdate) {
        onBalanceUpdate(currentBalance)
      }
    } catch (error) {
      console.error('Error loading vendor ledger:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Total Purchases</p>
              <p className="text-2xl font-bold text-red-900">
                ₹{summary.totalPurchases.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {entries.filter((e) => e.type === 'purchase').length} transactions
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Total Payments</p>
              <p className="text-2xl font-bold text-green-900">
                ₹{summary.totalPayments.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {entries.filter((e) => e.type === 'payment').length} transactions
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div
          className={`bg-gradient-to-r p-4 rounded-lg ${
            summary.currentBalance > 0
              ? 'from-orange-50 to-orange-100'
              : 'from-gray-50 to-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-sm font-medium ${
                  summary.currentBalance > 0 ? 'text-orange-600' : 'text-gray-600'
                }`}
              >
                Outstanding Balance
              </p>
              <p
                className={`text-2xl font-bold ${
                  summary.currentBalance > 0 ? 'text-orange-900' : 'text-gray-900'
                }`}
              >
                ₹{summary.currentBalance.toLocaleString('en-IN')}
              </p>
              <p
                className={`text-xs mt-1 ${
                  summary.currentBalance > 0 ? 'text-orange-600' : 'text-gray-600'
                }`}
              >
                {summary.currentBalance > 0 ? 'Amount due' : 'Fully paid'}
              </p>
            </div>
            <DollarSign
              className={`h-8 w-8 ${
                summary.currentBalance > 0 ? 'text-orange-600' : 'text-gray-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h4>

        {entries.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 ${
                        entry.type === 'purchase' ? 'bg-red-50/30' : 'bg-green-50/30'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span>{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            entry.type === 'purchase'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {entry.type === 'purchase' ? (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Purchase
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 mr-1" />
                              Payment
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{entry.description}</p>
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                            {entry.query_number && <span>Query #{entry.query_number}</span>}
                            {entry.reference && (
                              <>
                                <span>•</span>
                                <span>Ref: {entry.reference}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {entry.debit > 0 ? (
                          <span className="font-medium text-red-600">
                            ₹{entry.debit.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {entry.credit > 0 ? (
                          <span className="font-medium text-green-600">
                            ₹{entry.credit.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                        <span
                          className={
                            entry.balance > 0 ? 'text-orange-600' : 'text-gray-900'
                          }
                        >
                          ₹{Math.abs(entry.balance).toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
