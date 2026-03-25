import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, ArrowDownLeft, ArrowUpRight,
  FileText, Building2, AlertTriangle, Loader,
  ChevronRight, BookOpen, BarChart3
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  fetchFinancialSummary, fetchMonthlyRevenue,
  fetchRecentTransactions, fetchTopVendorBalances,
} from '@/lib/api/finance'
import FinanceSummaryCards from '@/components/finance/FinanceSummaryCards'
import TransactionForm from '@/components/finance/TransactionForm'
import type { FinancialSummary, MonthlyRevenue, Transaction } from '@/types/finance'

interface TopVendorBalance {
  id: string
  name: string
  total_pending: number
  total_business: number
}

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0, totalReceived: 0, totalPending: 0, totalProfit: 0,
    totalVendorPayable: 0, totalVendorPaid: 0, totalVendorPending: 0, overdueInvoices: 0,
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [topVendors, setTopVendors] = useState<TopVendorBalance[]>([])
  const [showRecordModal, setShowRecordModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [summaryData, monthly, txns, vendors] = await Promise.all([
        fetchFinancialSummary(),
        fetchMonthlyRevenue(6),
        fetchRecentTransactions(10),
        fetchTopVendorBalances(10),
      ])

      setSummary(summaryData)
      setMonthlyRevenue(monthly)
      setRecentTransactions(txns)
      setTopVendors(vendors)
    } catch (error) {
      console.error('Error loading financial dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
          <p className="mt-1 text-sm text-gray-600">Unified view of all money movement</p>
        </div>
        <button onClick={() => setShowRecordModal(true)} className="btn btn-primary">
          <DollarSign className="w-5 h-5 mr-2" />
          Record Transaction
        </button>
      </div>

      {/* Overdue Warning */}
      {summary.overdueInvoices > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">{summary.overdueInvoices} Overdue Invoice{summary.overdueInvoices > 1 ? 's' : ''}</p>
            <p className="text-sm text-red-700">You have invoices past their due date that need attention.</p>
          </div>
          <Link to="/finance/invoices" className="btn btn-secondary btn-sm">View Invoices</Link>
        </div>
      )}

      {/* Summary Cards */}
      <FinanceSummaryCards summary={summary} />

      {/* Monthly Revenue Chart */}
      {monthlyRevenue.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue & Collections</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Section: Recent Txns + Top Vendor Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <Link to="/finance/transactions" className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No transactions recorded yet</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map(txn => (
                <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    txn.direction === 'in' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {txn.direction === 'in'
                      ? <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      : <ArrowUpRight className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {txn.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {txn.description || txn.transaction_number}
                      {txn.passengers && ` — ${txn.passengers.first_name} ${txn.passengers.last_name}`}
                      {txn.vendors && ` — ${txn.vendors.name}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${txn.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {txn.direction === 'in' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(txn.transaction_date), 'MMM d')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendor Balances */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Vendor Balances</h3>
            <Link to="/vendors" className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {topVendors.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">All vendors settled</p>
          ) : (
            <div className="space-y-3">
              {topVendors.map(vendor => (
                <Link
                  key={vendor.id}
                  to={`/vendors/${vendor.id}`}
                  className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{vendor.name}</p>
                    <p className="text-xs text-gray-500">
                      Total: {formatCurrency(vendor.total_business)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(vendor.total_pending)}</p>
                    <p className="text-xs text-gray-400">pending</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Link to="/finance/transactions" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Transactions</p>
            <p className="text-sm text-gray-500">Full ledger</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="/finance/invoices" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Invoices</p>
            <p className="text-sm text-gray-500">Client invoices</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="/vendors" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Vendors</p>
            <p className="text-sm text-gray-500">Payments & balances</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="/finance/reports" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Reports</p>
            <p className="text-sm text-gray-500">P&L, aging, etc.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
      </div>

      {/* Record Transaction Modal */}
      {showRecordModal && (
        <TransactionForm
          onSuccess={() => {
            setShowRecordModal(false)
            loadDashboardData()
          }}
          onCancel={() => setShowRecordModal(false)}
        />
      )}
    </div>
  )
}
