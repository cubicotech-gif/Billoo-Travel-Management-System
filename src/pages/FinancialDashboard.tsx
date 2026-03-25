import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  DollarSign, TrendingUp, ArrowDownLeft, ArrowUpRight,
  FileText, Building2, AlertTriangle, Loader,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import RecordTransaction from '@/components/RecordTransaction'

interface FinancialSummary {
  totalRevenue: number
  totalReceived: number
  totalPending: number
  totalProfit: number
  totalVendorPayable: number
  totalVendorPaid: number
  totalVendorPending: number
  overdueInvoices: number
}

interface RecentTransaction {
  id: string
  transaction_number: string
  transaction_date: string
  type: string
  direction: 'in' | 'out'
  amount: number
  description: string | null
  passengers?: any
  vendors?: any
}

interface TopVendorBalance {
  id: string
  name: string
  total_pending: number
  total_business: number
}

const TYPE_LABELS: Record<string, string> = {
  payment_received: 'Payment Received',
  payment_to_vendor: 'Payment to Vendor',
  refund_to_client: 'Refund to Client',
  refund_from_vendor: 'Refund from Vendor',
  expense: 'Expense',
  adjustment: 'Adjustment',
}

export default function FinancialDashboard() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0, totalReceived: 0, totalPending: 0, totalProfit: 0,
    totalVendorPayable: 0, totalVendorPaid: 0, totalVendorPending: 0, overdueInvoices: 0,
  })
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [topVendors, setTopVendors] = useState<TopVendorBalance[]>([])
  const [showRecordModal, setShowRecordModal] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [invoicesRes, vendorsRes, txnRes, overdueRes] = await Promise.all([
        supabase.from('invoices').select('amount, paid_amount, total_cost, total_profit, status'),
        supabase.from('vendors').select('id, name, total_business, total_paid, total_pending').eq('is_active', true).eq('is_deleted', false).order('total_pending', { ascending: false }).limit(10),
        supabase.from('transactions').select('id, transaction_number, transaction_date, type, direction, amount, description, passengers:passenger_id (first_name, last_name), vendors:vendor_id (name)').order('transaction_date', { ascending: false }).limit(10),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['pending', 'partial', 'sent']).lt('due_date', new Date().toISOString().split('T')[0]),
      ])

      const invoices = invoicesRes.data || []
      const vendors = vendorsRes.data || []

      const totalRevenue = invoices.reduce((s, i) => s + i.amount, 0)
      const totalReceived = invoices.reduce((s, i) => s + i.paid_amount, 0)
      const totalProfit = invoices.reduce((s, i) => s + (i.total_profit || 0), 0)
      const totalVendorPayable = vendors.reduce((s, v) => s + v.total_business, 0)
      const totalVendorPaid = vendors.reduce((s, v) => s + v.total_paid, 0)
      const totalVendorPending = vendors.reduce((s, v) => s + v.total_pending, 0)

      setSummary({
        totalRevenue,
        totalReceived,
        totalPending: totalRevenue - totalReceived,
        totalProfit,
        totalVendorPayable,
        totalVendorPaid,
        totalVendorPending,
        overdueInvoices: overdueRes.count || 0,
      })

      setTopVendors(vendors.filter(v => v.total_pending > 0))
      setRecentTransactions(txnRes.data || [])
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
          <Link to="/invoices" className="btn btn-secondary btn-sm">View Invoices</Link>
        </div>
      )}

      {/* Revenue Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <ArrowDownLeft className="w-5 h-5 mr-2 text-green-600" />
          Revenue (Money In from Clients)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-700">Total Billed</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="card bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-700">Received</p>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totalReceived)}</p>
            <p className="text-xs text-green-600 mt-1">
              {summary.totalRevenue > 0 ? `${((summary.totalReceived / summary.totalRevenue) * 100).toFixed(0)}% collected` : '—'}
            </p>
          </div>
          <div className={`card border ${summary.totalPending > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-sm font-medium ${summary.totalPending > 0 ? 'text-red-700' : 'text-gray-700'}`}>Receivable</p>
            <p className={`text-2xl font-bold ${summary.totalPending > 0 ? 'text-red-900' : 'text-gray-900'}`}>{formatCurrency(summary.totalPending)}</p>
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
              {summary.totalRevenue > 0 ? `${((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)}% margin` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Vendor Payables Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <ArrowUpRight className="w-5 h-5 mr-2 text-red-600" />
          Vendor Payables (Money Out to Vendors)
        </h2>
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
            <p className={`text-sm font-medium ${summary.totalVendorPending > 0 ? 'text-orange-700' : 'text-gray-700'}`}>Outstanding to Vendors</p>
            <p className={`text-2xl font-bold ${summary.totalVendorPending > 0 ? 'text-orange-900' : 'text-gray-900'}`}>{formatCurrency(summary.totalVendorPending)}</p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Txns + Top Vendor Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <Link to="/transactions" className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
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
                      {TYPE_LABELS[txn.type] || txn.type}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/transactions" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Transaction Ledger</p>
            <p className="text-sm text-gray-500">View all transactions</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="/invoices" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Invoices</p>
            <p className="text-sm text-gray-500">Manage client invoices</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
        <Link to="/vendors" className="card hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Vendor Accounts</p>
            <p className="text-sm text-gray-500">Vendor payments & balances</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
      </div>

      {/* Record Transaction Modal */}
      {showRecordModal && (
        <RecordTransaction
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
