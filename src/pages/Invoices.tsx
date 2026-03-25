import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, FileText, Calendar, DollarSign, X, Filter,
  Loader, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import { fetchInvoices } from '@/lib/api/finance'
import StatusBadge from '@/components/shared/StatusBadge'
import InvoiceForm from '@/components/finance/InvoiceForm'
import type { Invoice } from '@/types/finance'
import { ALL_INVOICE_STATUSES } from '@/types/finance'

export default function Invoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const data = await fetchInvoices()
      setInvoices(data)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(inv => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matches =
        inv.invoice_number.toLowerCase().includes(term) ||
        inv.passengers?.first_name?.toLowerCase().includes(term) ||
        inv.passengers?.last_name?.toLowerCase().includes(term) ||
        inv.queries?.query_number?.toLowerCase().includes(term) ||
        inv.queries?.client_name?.toLowerCase().includes(term)
      if (!matches) return false
    }
    if (filterStatus && inv.status !== filterStatus) return false
    return true
  })

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0)
  const totalPending = totalAmount - totalPaid
  const totalProfit = filteredInvoices.reduce((sum, inv) => sum + (inv.total_profit || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-600">{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg"><FileText className="w-6 h-6 text-blue-600" /></div>
            <div className="ml-4">
              <p className="text-sm text-blue-700">Total Billed</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div>
            <div className="ml-4">
              <p className="text-sm text-green-700">Received</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg"><DollarSign className="w-6 h-6 text-red-600" /></div>
            <div className="ml-4">
              <p className="text-sm text-red-700">Pending</p>
              <p className="text-xl font-bold text-red-900">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="card bg-purple-50 border border-purple-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg"><TrendingUp className="w-6 h-6 text-purple-600" /></div>
            <div className="ml-4">
              <p className="text-sm text-purple-700">Total Profit</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(totalProfit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by invoice #, passenger, query..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${filterStatus ? 'btn-primary' : 'btn-secondary'} flex items-center`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Status
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !filterStatus ? 'bg-primary-100 text-primary-800 border-primary-300' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >All</button>
            {ALL_INVOICE_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                  filterStatus === s ? 'bg-primary-100 text-primary-800 border-primary-300' : 'bg-white text-gray-600 border-gray-300'
                }`}
              >{s}</button>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="card overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client / Query</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map(inv => {
                  const balance = inv.amount - inv.paid_amount
                  const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid' && inv.status !== 'cancelled'
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/finance/invoices/${inv.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium text-primary-600 hover:text-primary-800">{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {inv.passengers && (
                          <span className="text-gray-900 font-medium">
                            {inv.passengers.first_name} {inv.passengers.last_name}
                          </span>
                        )}
                        {inv.queries && (
                          <span className="block text-xs text-gray-500">
                            {inv.queries.query_number}
                          </span>
                        )}
                        {!inv.passengers && !inv.queries && <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-700">{formatCurrency(inv.paid_amount)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balance)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className={(inv.total_profit || 0) >= 0 ? 'text-purple-700' : 'text-red-600'}>
                          {formatCurrency(inv.total_profit || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={isOverdue ? 'overdue' : inv.status} type="invoice" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {inv.due_date ? (
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                            {format(new Date(inv.due_date), 'MMM d, yyyy')}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <InvoiceForm
          onSuccess={() => {
            setShowModal(false)
            loadInvoices()
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
