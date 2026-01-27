import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, Phone, Mail, MapPin,
  FileText, User, Trash2, X, Users, MessageCircle, AlertTriangle, CheckCircle, Clock, Briefcase, Package
} from 'lucide-react'
import { format } from 'date-fns'
import PassengerSelector from '@/components/PassengerSelector'
import CommunicationLog from '@/components/CommunicationLog'
import AddCommunication from '@/components/AddCommunication'
import QuickActions from '@/components/QuickActions'
import QueryWorkspace from '@/components/QueryWorkspace'

interface Query {
  id: string
  query_number: string
  client_name: string
  client_email: string | null
  client_phone: string
  destination: string
  travel_date: string | null
  return_date: string | null
  adults: number
  children: number
  infants: number
  status: string
  assigned_to: string | null
  notes: string | null
  query_source: string | null
  service_type: string | null
  tentative_plan: string | null
  internal_reminders: string | null
  is_responded: boolean
  response_given: string | null
  is_tentative_dates: boolean
  created_at: string
  updated_at: string
  cost_price: number
  selling_price: number
  profit: number
  profit_margin: number
  services?: QueryService[]
  service_count?: number
  total_selling_price?: number
  total_profit?: number
}

interface QueryService {
  id: string
  type: 'Flight' | 'Hotel' | 'Visa' | 'Transport' | 'Tour' | 'Insurance' | 'Other'
  description: string
  vendor: string
  cost: number
  selling: number
  pnr?: string
  booking_ref?: string
}

const STATUSES = ['New', 'Working', 'Quoted', 'Finalized', 'Booking', 'Issued', 'Completed']

const QUERY_SOURCES = ['Phone Call', 'WhatsApp', 'Walk-in', 'Website', 'Email', 'Referral']
const SERVICE_CATEGORIES = [
  'Umrah Package',
  'Umrah Plus Package',
  'Hajj Package',
  'Leisure Tourism',
  'Ticket Booking',
  'Visa Service',
  'Transport Service',
  'Hotel Only',
  'Other'
]

export default function EnhancedQueries() {
  const [queries, setQueries] = useState<Query[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPassengerModal, setShowPassengerModal] = useState(false)
  const [showCommModal, setShowCommModal] = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [workspaceQuery, setWorkspaceQuery] = useState<Query | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [priorityTab, setPriorityTab] = useState<'all' | 'urgent' | 'awaiting'>('all')

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    destination: '',
    travel_date: '',
    return_date: '',
    adults: 1,
    children: 0,
    infants: 0,
    status: 'New',
    notes: '',
    cost_price: 0,
    selling_price: 0,
    query_source: '',
    service_type: '',
    tentative_plan: '',
    internal_reminders: '',
    is_responded: false,
    response_given: '',
    is_tentative_dates: false,
  })

  useEffect(() => {
    loadQueries()
  }, [])

  // Auto-fill destination based on service type
  useEffect(() => {
    if (formData.service_type === 'Umrah Package' || formData.service_type === 'Umrah Plus Package') {
      setFormData(prev => ({ ...prev, destination: 'Makkah & Madinah' }))
    } else if (formData.service_type === 'Hajj Package') {
      setFormData(prev => ({ ...prev, destination: 'Makkah, Madinah, Arafat' }))
    }
  }, [formData.service_type])

  const loadQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Load service counts and totals for each query
      const queriesWithServices = await Promise.all(
        (data || []).map(async (query) => {
          const { data: services } = await supabase
            .from('query_services')
            .select('selling_price, profit')
            .eq('query_id', query.id)

          const service_count = services?.length || 0
          const total_selling_price = services?.reduce((sum, s) => sum + s.selling_price, 0) || 0
          const total_profit = services?.reduce((sum, s) => sum + s.profit, 0) || 0

          return {
            ...query,
            service_count,
            total_selling_price,
            total_profit
          }
        })
      )

      setQueries(queriesWithServices)
    } catch (error) {
      console.error('Error loading queries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const queryData = {
        ...formData,
        query_source: formData.query_source || null,
        service_type: formData.service_type || null,
        tentative_plan: formData.tentative_plan || null,
        internal_reminders: formData.internal_reminders || null,
        response_given: formData.response_given || null,
      }

      const { error } = await supabase.from('queries').insert([queryData])

      if (error) throw error

      await loadQueries()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error creating query:', error)
      alert('Failed to create query')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this query?')) return

    try {
      const { error } = await supabase.from('queries').delete().eq('id', id)

      if (error) throw error

      await loadQueries()
    } catch (error) {
      console.error('Error deleting query:', error)
      alert('Failed to delete query')
    }
  }

  const toggleResponded = async (query: Query) => {
    try {
      const { error } = await supabase
        .from('queries')
        .update({ is_responded: !query.is_responded })
        .eq('id', query.id)

      if (error) throw error

      await loadQueries()
    } catch (error) {
      console.error('Error updating query:', error)
      alert('Failed to update query status')
    }
  }

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      destination: '',
      travel_date: '',
      return_date: '',
      adults: 1,
      children: 0,
      infants: 0,
      status: 'New',
      notes: '',
      cost_price: 0,
      selling_price: 0,
      query_source: '',
      service_type: '',
      tentative_plan: '',
      internal_reminders: '',
      is_responded: false,
      response_given: '',
      is_tentative_dates: false,
    })
  }

  // Filter queries based on priority tab
  const getFilteredQueries = () => {
    let filtered = queries

    // Priority tab filtering
    if (priorityTab === 'urgent') {
      filtered = filtered.filter(q => !q.is_responded)
      // Sort by oldest first for urgent
      filtered = [...filtered].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    } else if (priorityTab === 'awaiting') {
      filtered = filtered.filter(q => q.is_responded)
      // Sort by newest first for awaiting
      filtered = [...filtered].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    // Status filtering
    if (filterStatus !== 'all') {
      filtered = filtered.filter(q => q.status === filterStatus)
    }

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        q =>
          q.query_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.client_phone.includes(searchTerm) ||
          q.destination.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const urgentCount = queries.filter(q => !q.is_responded).length
  const awaitingCount = queries.filter(q => q.is_responded).length

  const filteredQueries = getFilteredQueries()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading queries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Query Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Track and manage customer travel queries</p>
      </div>

      {/* Urgent Alert Banner */}
      {urgentCount > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200">
                  ⚠️ {urgentCount} {urgentCount === 1 ? 'query' : 'queries'} awaiting response!
                </h3>
                <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                  These queries have not been responded to yet. Please review and respond as soon as possible.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPriorityTab('urgent')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
            >
              View Urgent
            </button>
          </div>
        </div>
      )}

      {/* Priority Tabs */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1 inline-flex">
        <button
          onClick={() => setPriorityTab('all')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            priorityTab === 'all'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          All Queries
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs">
            {queries.length}
          </span>
        </button>
        <button
          onClick={() => setPriorityTab('urgent')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            priorityTab === 'urgent'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          🔴 Urgent - Not Responded
          <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs font-bold">
            {urgentCount}
          </span>
        </button>
        <button
          onClick={() => setPriorityTab('awaiting')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            priorityTab === 'awaiting'
              ? 'bg-yellow-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          🟡 Awaiting Reply
          <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs font-bold">
            {awaitingCount}
          </span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by query number, client name, phone, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium inline-flex items-center space-x-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>New Query</span>
        </button>
      </div>

      {/* Queries Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQueries.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">No queries found</p>
          </div>
        ) : (
          filteredQueries.map((query) => (
            <div
              key={query.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="p-6">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        #{query.query_number}
                      </h3>

                      {/* Urgent Badge */}
                      {!query.is_responded && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700 animate-pulse">
                          URGENT
                        </span>
                      )}

                      {/* Query Source Tag */}
                      {query.query_source && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          via {query.query_source}
                        </span>
                      )}

                      {/* Service Type Badge */}
                      {query.service_type && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {query.service_type}
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          query.status === 'Completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                            : query.status === 'Cancelled'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                        }`}
                      >
                        {query.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{query.client_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{query.client_phone}</span>
                      </div>
                      {query.client_email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{query.client_email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Response Toggle & Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => toggleResponded(query)}
                      className={`p-2 rounded-lg transition-all ${
                        query.is_responded
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                      }`}
                      title={query.is_responded ? 'Mark as not responded' : 'Mark as responded'}
                    >
                      {query.is_responded ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(query.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Travel Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Destination</p>
                    <p className="font-medium text-gray-900 dark:text-white flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{query.destination}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Travel Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {query.travel_date ? format(new Date(query.travel_date), 'MMM d, yyyy') : 'Not set'}
                      {query.is_tentative_dates && (
                        <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">(Tentative)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Passengers</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {query.adults}A {query.children > 0 && `${query.children}C`} {query.infants > 0 && `${query.infants}I`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(query.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Tentative Plan */}
                {query.tentative_plan && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Customer Plan:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                      {query.tentative_plan}
                    </p>
                  </div>
                )}

                {/* Internal Reminders */}
                {query.internal_reminders && (
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2 flex items-center space-x-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>⚠️ Internal Notes:</span>
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">
                      {query.internal_reminders}
                    </p>
                  </div>
                )}

                {/* Response Given */}
                {query.response_given && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2 flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>✓ What Was Told:</span>
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">
                      {query.response_given}
                    </p>
                  </div>
                )}

                {/* Service Summary */}
                {query.service_count && query.service_count > 0 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          Services: {query.service_count}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Package: <span className="font-bold text-primary-600 dark:text-primary-400">Rs {query.total_selling_price?.toLocaleString('en-IN')}</span>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Profit: <span className={`font-bold ${(query.total_profit || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            Rs {query.total_profit?.toLocaleString('en-IN')}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setWorkspaceQuery(query)
                      setShowWorkspace(true)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-purple text-white rounded-lg hover:from-primary-700 hover:to-accent-purple transition-colors text-sm font-medium inline-flex items-center space-x-1"
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>Work on Query</span>
                    {query.service_count && query.service_count > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-white bg-opacity-20 rounded-full text-xs">
                        {query.service_count}
                      </span>
                    )}
                  </button>
                  <QuickActions
                    phone={query.client_phone}
                    email={query.client_email}
                    onActionComplete={() => {}}
                  />
                  <button
                    onClick={() => {
                      setSelectedQueryId(query.id)
                      setShowPassengerModal(true)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center space-x-1"
                  >
                    <Users className="h-4 w-4" />
                    <span>Manage Passengers</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedQuery(query)
                      setSelectedQueryId(query.id)
                      setShowCommModal(true)
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium inline-flex items-center space-x-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Communications</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Query Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowModal(false)} />

            <div className="inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Create New Query</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmit} className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="space-y-6">
                  {/* Query Source & Service Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Query Source *
                      </label>
                      <select
                        required
                        value={formData.query_source}
                        onChange={(e) => setFormData({ ...formData, query_source: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select source</option>
                        {QUERY_SOURCES.map(source => (
                          <option key={source} value={source}>{source}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Service Type *
                      </label>
                      <select
                        required
                        value={formData.service_type}
                        onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select service type</option>
                        {SERVICE_CATEGORIES.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Client Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.client_phone}
                        onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.client_email}
                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Destination */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Destination *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="Auto-fills for Umrah/Hajj packages"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Number of Passengers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Number of Passengers *
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Adults</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.adults}
                          onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Children</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.children}
                          onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Infants</label>
                        <input
                          type="number"
                          min="0"
                          value={formData.infants}
                          onChange={(e) => setFormData({ ...formData, infants: parseInt(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Travel Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Departure Date
                      </label>
                      <input
                        type="date"
                        value={formData.travel_date}
                        onChange={(e) => setFormData({ ...formData, travel_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Return Date
                      </label>
                      <input
                        type="date"
                        value={formData.return_date}
                        onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Tentative Dates Checkbox */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="tentative-dates"
                      checked={formData.is_tentative_dates}
                      onChange={(e) => setFormData({ ...formData, is_tentative_dates: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="tentative-dates" className="text-sm text-gray-700 dark:text-gray-300">
                      Dates are tentative / not confirmed yet
                    </label>
                  </div>

                  {/* Tentative Plan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tentative Plan / Customer Details
                    </label>
                    <textarea
                      value={formData.tentative_plan}
                      onChange={(e) => setFormData({ ...formData, tentative_plan: e.target.value })}
                      rows={6}
                      placeholder="Paste customer's WhatsApp message or write query details here..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Internal Reminders */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Internal Reminders <span className="text-xs text-gray-500">(Only visible to team)</span>
                    </label>
                    <textarea
                      value={formData.internal_reminders}
                      onChange={(e) => setFormData({ ...formData, internal_reminders: e.target.value })}
                      rows={4}
                      placeholder="Internal notes: budget constraints, follow-up date, special requirements..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Response Tracking */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="checkbox"
                        id="is-responded"
                        checked={formData.is_responded}
                        onChange={(e) => setFormData({ ...formData, is_responded: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="is-responded" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Have you responded to this query?
                      </label>
                    </div>

                    {formData.is_responded && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          What was told to the customer?
                        </label>
                        <textarea
                          value={formData.response_given}
                          onChange={(e) => setFormData({ ...formData, response_given: e.target.value })}
                          rows={3}
                          placeholder="Enter what you communicated to the customer..."
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    >
                      {STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end space-x-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Create Query
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Modal */}
      {showPassengerModal && selectedQueryId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowPassengerModal(false)} />

            <div className="inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <div className="px-6 py-4 bg-gradient-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Manage Passengers</h3>
                  <button
                    onClick={() => setShowPassengerModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <PassengerSelector
                  queryId={selectedQueryId}
                  onPassengersChange={() => {}}
                />
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPassengerModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Communication Modal */}
      {showCommModal && selectedQuery && selectedQueryId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowCommModal(false)} />

            <div className="inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <div className="px-6 py-4 bg-gradient-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Communications</h3>
                  <button
                    onClick={() => setShowCommModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Log New Communication
                  </h4>
                  <AddCommunication
                    entityType="query"
                    entityId={selectedQueryId}
                    contactPhone={selectedQuery.client_phone}
                    contactEmail={selectedQuery.client_email || undefined}
                    onSuccess={() => {}}
                  />
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Communication History
                  </h4>
                  <CommunicationLog
                    entityType="query"
                    entityId={selectedQueryId}
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCommModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Query Workspace Modal */}
      {showWorkspace && workspaceQuery && (
        <QueryWorkspace
          query={workspaceQuery}
          onClose={() => {
            setShowWorkspace(false)
            setWorkspaceQuery(null)
          }}
          onUpdate={() => {
            loadQueries()
          }}
        />
      )}
    </div>
  )
}
