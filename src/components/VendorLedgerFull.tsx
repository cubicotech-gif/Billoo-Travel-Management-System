import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  User,
  Download,
  Filter,
  Search,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  BarChart3
} from 'lucide-react'
import { Database } from '@/types/database'
import TransactionCard from './TransactionCard'
import ExportModal from './ExportModal'

type Vendor = Database['public']['Tables']['vendors']['Row']
type VendorTransaction = Database['public']['Tables']['vendor_transactions']['Row'] & {
  queries?: { query_number: string; client_name: string; destination: string }
  passengers?: { first_name: string; last_name: string }
}

interface VendorLedgerFullProps {
  vendor: Vendor
  onBack: () => void
  onRefresh: () => void
}

export default function VendorLedgerFull({ vendor, onBack }: VendorLedgerFullProps) {
  const [transactions, setTransactions] = useState<VendorTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<VendorTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)

  // Filter states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    serviceType: 'all',
    searchTerm: ''
  })

  // Summary calculations
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalPurchasePKR: 0,
    totalSellingPKR: 0,
    totalProfitPKR: 0,
    profitMargin: 0,
    paidAmount: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0,
    partialCount: 0
  })

  useEffect(() => {
    loadTransactions()
  }, [vendor.id])

  useEffect(() => {
    applyFilters()
  }, [transactions, filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          *,
          queries!inner(query_number, client_name, destination),
          passengers(first_name, last_name)
        `)
        .eq('vendor_id', vendor.id)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.transaction_date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => t.transaction_date <= filters.dateTo)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.payment_status === filters.status)
    }

    // Service type filter
    if (filters.serviceType !== 'all') {
      filtered = filtered.filter(t => t.service_type === filters.serviceType)
    }

    // Search filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.service_description.toLowerCase().includes(search) ||
        t.booking_reference?.toLowerCase().includes(search) ||
        t.queries?.query_number.toLowerCase().includes(search) ||
        t.queries?.client_name.toLowerCase().includes(search)
      )
    }

    setFilteredTransactions(filtered)
    calculateSummary(filtered)
  }

  const calculateSummary = (trans: VendorTransaction[]) => {
    const totalTransactions = trans.length
    const totalPurchasePKR = trans.reduce((sum, t) => sum + t.purchase_amount_pkr, 0)
    const totalSellingPKR = trans.reduce((sum, t) => sum + t.selling_amount_pkr, 0)
    const totalProfitPKR = trans.reduce((sum, t) => sum + t.profit_pkr, 0)
    const profitMargin = totalSellingPKR > 0 ? (totalProfitPKR / totalSellingPKR) * 100 : 0

    const paidTrans = trans.filter(t => t.payment_status === 'paid')
    const pendingTrans = trans.filter(t => t.payment_status === 'pending')
    const partialTrans = trans.filter(t => t.payment_status === 'partial')

    const paidAmount = paidTrans.reduce((sum, t) => sum + t.amount_paid, 0)
    const pendingAmount = pendingTrans.reduce((sum, t) => sum + t.purchase_amount_pkr, 0)

    setSummary({
      totalTransactions,
      totalPurchasePKR,
      totalSellingPKR,
      totalProfitPKR,
      profitMargin,
      paidAmount,
      pendingAmount,
      paidCount: paidTrans.length,
      pendingCount: pendingTrans.length,
      partialCount: partialTrans.length
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      serviceType: 'all',
      searchTerm: ''
    })
  }

  const serviceTypes = ['Hotel', 'Flight', 'Transport', 'Visa', 'Tour', 'Insurance', 'Other']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="btn btn-secondary"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to All Vendors
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {/* TODO: View Profile */}}
              className="btn btn-secondary"
            >
              <User className="w-5 h-5 mr-2" />
              View Profile
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="btn btn-primary"
            >
              <Download className="w-5 h-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-600">Type: {vendor.type}</span>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">Currency: PKR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Business */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600">Total Business</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(vendor.total_business)}</p>
          <p className="text-xs text-blue-600 mt-1">{summary.totalTransactions} bookings</p>
        </div>

        {/* Total Paid */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-600">Total Paid</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(vendor.total_paid)}</p>
          <p className="text-xs text-green-600 mt-1">{summary.paidCount} transactions</p>
        </div>

        {/* Pending Payment */}
        <div className="card bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-600">Pending</span>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(vendor.total_pending)}</p>
          <p className="text-xs text-red-600 mt-1">{summary.pendingCount} pending</p>
        </div>

        {/* Total Profit */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-600">Total Profit</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{formatCurrency(vendor.total_profit)}</p>
          <p className="text-xs text-purple-600 mt-1">From all bookings</p>
        </div>

        {/* Avg Margin */}
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-600">Avg Margin</span>
            <BarChart3 className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {vendor.total_business > 0
              ? ((vendor.total_profit / vendor.total_business) * 100).toFixed(1)
              : '0.0'
            }%
          </p>
          <p className="text-xs text-orange-600 mt-1">Profit margin</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="input"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="input"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overpaid">Overpaid</option>
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select
              value={filters.serviceType}
              onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}
              className="input"
            >
              <option value="all">All Types</option>
              {serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="input pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={clearFilters} className="btn btn-secondary btn-sm">
            Clear Filters
          </button>
          <div className="flex-1 text-right text-sm text-gray-600 self-center">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>

        {filteredTransactions.length === 0 ? (
          <div className="card text-center py-12">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No transactions found</p>
            <p className="text-sm text-gray-500">
              {filters.searchTerm || filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.serviceType !== 'all'
                ? 'Try adjusting your filters'
                : 'No transactions have been recorded for this vendor yet'}
            </p>
            {(filters.searchTerm || filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.serviceType !== 'all') && (
              <button onClick={clearFilters} className="btn btn-secondary mt-4">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onUpdate={loadTransactions}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {filteredTransactions.length > 0 && (
        <div className="card bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ledger Summary {filters.searchTerm || filters.dateFrom || filters.status !== 'all' ? '(Filtered Results)' : ''}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
              <p className="text-xl font-bold text-gray-900">{summary.totalTransactions}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Total Purchase (PKR)</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalPurchasePKR)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Total Selling (PKR)</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.totalSellingPKR)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Total Profit</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(summary.totalProfitPKR)}
                {summary.totalSellingPKR > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    ({summary.profitMargin.toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="border-t mt-4 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Payment Status:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Paid:</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(summary.paidAmount)} ({summary.paidCount} trans.)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending:</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(summary.pendingAmount)} ({summary.pendingCount} trans.)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Partial:</span>
                <span className="text-sm font-semibold text-orange-600">
                  {summary.partialCount} trans.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          transactions={filteredTransactions}
          vendorName={vendor.name}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}
