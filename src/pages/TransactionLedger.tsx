import { useEffect, useState } from 'react'
import {
  Plus, Search, X, Filter, DollarSign, ArrowDownLeft, ArrowUpRight,
  FileText, Loader
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import { fetchTransactions } from '@/lib/api/finance'
import LedgerTable from '@/components/finance/LedgerTable'
import TransactionForm from '@/components/finance/TransactionForm'
import type { Transaction } from '@/types/finance'
import { TRANSACTION_TYPE_CONFIG } from '@/types/finance'

export default function TransactionLedger() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterDirection, setFilterDirection] = useState<'' | 'in' | 'out'>('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const data = await fetchTransactions(500)
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = transactions.filter(txn => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matches =
        txn.transaction_number?.toLowerCase().includes(term) ||
        txn.description?.toLowerCase().includes(term) ||
        txn.reference_number?.toLowerCase().includes(term) ||
        txn.passengers?.first_name?.toLowerCase().includes(term) ||
        txn.passengers?.last_name?.toLowerCase().includes(term) ||
        txn.vendors?.name?.toLowerCase().includes(term)
      if (!matches) return false
    }
    if (filterType && txn.type !== filterType) return false
    if (filterDirection && txn.direction !== filterDirection) return false
    if (filterDateFrom && txn.transaction_date < filterDateFrom) return false
    if (filterDateTo && txn.transaction_date > filterDateTo + 'T23:59:59') return false
    return true
  })

  const totalIn = filtered.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  const netBalance = totalIn - totalOut

  const hasActiveFilters = filterType || filterDirection || filterDateFrom || filterDateTo
  const clearFilters = () => { setFilterType(''); setFilterDirection(''); setFilterDateFrom(''); setFilterDateTo('') }

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
          <h1 className="text-2xl font-bold text-gray-900">Transaction Ledger</h1>
          <p className="mt-1 text-sm text-gray-600">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowRecordModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Record Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total In</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(totalIn)}</p>
            </div>
            <ArrowDownLeft className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Total Out</p>
              <p className="text-2xl font-bold text-red-900">{formatCurrency(totalOut)}</p>
            </div>
            <ArrowUpRight className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className={`card border ${netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Balance</p>
              <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>{formatCurrency(Math.abs(netBalance))}</p>
            </div>
            <DollarSign className={`w-8 h-8 ${netBalance >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by txn number, description, reference, passenger, vendor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'} flex items-center`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input text-sm">
                <option value="">All Types</option>
                {Object.entries(TRANSACTION_TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
              <select value={filterDirection} onChange={e => setFilterDirection(e.target.value as '' | 'in' | 'out')} className="input text-sm">
                <option value="">All</option>
                <option value="in">Money In</option>
                <option value="out">Money Out</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input text-sm" />
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-800">Clear all filters</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No transactions found</p>
          </div>
        ) : (
          <LedgerTable transactions={filtered} showBalance />
        )}
      </div>

      {/* Record Transaction Modal */}
      {showRecordModal && (
        <TransactionForm
          onSuccess={() => {
            setShowRecordModal(false)
            loadTransactions()
          }}
          onCancel={() => setShowRecordModal(false)}
        />
      )}
    </div>
  )
}
