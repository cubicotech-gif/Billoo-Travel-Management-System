import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import type { FinancialSummary } from '@/types/finance'

interface FinanceSummaryCardsProps {
  summary: FinancialSummary
  section?: 'revenue' | 'vendor' | 'all'
}

export default function FinanceSummaryCards({ summary, section = 'all' }: FinanceSummaryCardsProps) {
  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      {(section === 'all' || section === 'revenue') && (
        <div>
          {section === 'all' && (
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <ArrowDownLeft className="w-5 h-5 mr-2 text-green-600" />
              Revenue (Money In from Clients)
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-700">Total Billed</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div className="card bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-700">Received</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalReceived)}</p>
              <p className="text-xs text-green-600 mt-1">
                {summary.totalRevenue > 0
                  ? `${((summary.totalReceived / summary.totalRevenue) * 100).toFixed(0)}% collected`
                  : '—'}
              </p>
            </div>
            <div className={`card border ${summary.totalPending > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-sm font-medium ${summary.totalPending > 0 ? 'text-red-700' : 'text-gray-700'}`}>Receivable</p>
              <p className={`text-2xl font-bold ${summary.totalPending > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                {formatCurrency(summary.totalPending)}
              </p>
            </div>
            <div className="card bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Total Profit</p>
                  <p className="text-2xl font-bold text-purple-900">{formatCurrency(summary.totalProfit)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {summary.totalRevenue > 0
                  ? `${((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}% margin`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Payables Cards */}
      {(section === 'all' || section === 'vendor') && (
        <div>
          {section === 'all' && (
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <ArrowUpRight className="w-5 h-5 mr-2 text-red-600" />
              Vendor Payables (Money Out to Vendors)
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-700">Total Payable</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.totalVendorPayable)}</p>
            </div>
            <div className="card bg-green-50 border border-green-200">
              <p className="text-sm font-medium text-green-700">Paid to Vendors</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalVendorPaid)}</p>
            </div>
            <div className={`card border ${summary.totalVendorPending > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-sm font-medium ${summary.totalVendorPending > 0 ? 'text-orange-700' : 'text-gray-700'}`}>Outstanding</p>
              <p className={`text-2xl font-bold ${summary.totalVendorPending > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
                {formatCurrency(summary.totalVendorPending)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
