import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  Plus, Search, FileText, Calendar, DollarSign, X, Filter,
  AlertCircle, Loader, TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoice_number: string
  query_id: string | null
  passenger_id: string | null
  amount: number
  paid_amount: number
  total_cost: number
  total_profit: number
  currency: string
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  queries?: any
  passengers?: any
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

const ALL_STATUSES = ['draft', 'sent', 'pending', 'partial', 'paid', 'overdue', 'cancelled']

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Passenger & query options for create form
  const [passengerOptions, setPassengerOptions] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [queryOptions, setQueryOptions] = useState<{ id: string; query_number: string; client_name: string }[]>([])

  const [formData, setFormData] = useState({
    amount: '',
    paid_amount: '0',
    total_cost: '0',
    status: 'pending' as string,
    due_date: '',
    currency: 'PKR',
    passenger_id: '',
    query_id: '',
    notes: '',
  })

  useEffect(() => {
    loadInvoices()
    loadOptions()
  }, [])

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          queries:query_id (query_number, client_name),
          passengers:passenger_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOptions = async () => {
    const [pRes, qRes] = await Promise.all([
      supabase.from('passengers').select('id, first_name, last_name').eq('status', 'active').order('first_name'),
      supabase.from('queries').select('id, query_number, client_name').order('created_at', { ascending: false }).limit(100),
    ])
    setPassengerOptions(pRes.data || [])
    setQueryOptions(qRes.data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setSaving(true)
    try {
      const totalCost = parseFloat(formData.total_cost) || 0
      const totalProfit = amount - totalCost

      const { error: insertErr } = await supabase.from('invoices').insert({
        amount,
        paid_amount: parseFloat(formData.paid_amount) || 0,
        total_cost: totalCost,
        total_profit: totalProfit,
        currency: formData.currency,
        status: formData.status,
        due_date: formData.due_date || null,
        passenger_id: formData.passenger_id || null,
        query_id: formData.query_id || null,
        notes: formData.notes.trim() || null,
      })

      if (insertErr) throw insertErr

      setShowModal(false)
      setFormData({
        amount: '', paid_amount: '0', total_cost: '0', status: 'pending',
        due_date: '', currency: 'PKR', passenger_id: '', query_id: '', notes: '',
      })
      loadInvoices()
    } catch (err: any) {
      console.error('Error creating invoice:', err)
      setError(err.message || 'Failed to create invoice')
    } finally {
      setSaving(false)
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
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
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
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {inv.passengers && (
                          <Link to={`/passengers/${inv.passenger_id}`} className="text-primary-600 hover:text-primary-800 font-medium">
                            {inv.passengers.first_name} {inv.passengers.last_name}
                          </Link>
                        )}
                        {inv.queries && (
                          <Link to={`/queries/${inv.query_id}`} className="block text-xs text-gray-500 hover:text-gray-700">
                            {inv.queries.query_number}
                          </Link>
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isOverdue ? 'bg-red-100 text-red-800' : STATUS_COLORS[inv.status] || STATUS_COLORS.pending
                        }`}>
                          {isOverdue ? 'overdue' : inv.status}
                        </span>
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-primary-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">Create New Invoice</h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-white hover:text-gray-200"><X className="w-6 h-6" /></button>
                  </div>
                </div>

                {error && (
                  <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="px-6 py-4 max-h-[calc(100vh-250px)] overflow-y-auto space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Amount (Revenue) *</label>
                      <input
                        type="number" required min="0" step="0.01"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        className="input" placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Amount</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={formData.total_cost}
                        onChange={e => setFormData({ ...formData, total_cost: e.target.value })}
                        className="input" placeholder="0.00"
                      />
                      {formData.amount && formData.total_cost && (
                        <p className="text-xs text-purple-600 mt-1">
                          Profit: {formatCurrency((parseFloat(formData.amount) || 0) - (parseFloat(formData.total_cost) || 0))}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={formData.paid_amount}
                        onChange={e => setFormData({ ...formData, paid_amount: e.target.value })}
                        className="input" placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })} className="input">
                        {['PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="input">
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                      <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Passenger</label>
                      <select value={formData.passenger_id} onChange={e => setFormData({ ...formData, passenger_id: e.target.value })} className="input">
                        <option value="">None</option>
                        {passengerOptions.map(p => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Query</label>
                      <select value={formData.query_id} onChange={e => setFormData({ ...formData, query_id: e.target.value })} className="input">
                        <option value="">None</option>
                        {queryOptions.map(q => (
                          <option key={q.id} value={q.id}>{q.query_number} — {q.client_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input" />
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><Loader className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
