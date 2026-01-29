import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, Calendar, Phone, MapPin, AlertCircle,
  Users, MessageCircle, Clock, X, Eye
} from 'lucide-react'
import { format } from 'date-fns'
import PassengerSelector from '@/components/PassengerSelector'
import CommunicationLog from '@/components/CommunicationLog'
import AddCommunication from '@/components/AddCommunication'
import QuickActions from '@/components/QuickActions'

interface Query {
  id: string
  query_number: string
  client_name: string
  client_email: string | null
  client_phone: string
  query_source: 'Phone Call' | 'WhatsApp' | 'Walk-in' | 'Website' | 'Email' | 'Referral' | null
  service_type: 'Umrah Package' | 'Umrah Plus Package' | 'Hajj Package' | 'Leisure Tourism' | 'Ticket Booking' | 'Visa Service' | 'Transport Service' | 'Hotel Only' | 'Other' | null
  destination: string
  travel_date: string | null
  return_date: string | null
  is_tentative_dates: boolean
  adults: number
  children: number
  infants: number
  tentative_plan: string | null
  internal_reminders: string | null
  is_responded: boolean
  response_given: string | null
  status: string
  priority_level: 'urgent' | 'high' | 'normal' | 'low'
  follow_up_date: string | null
  notes: string | null
  cost_price: number
  selling_price: number
  created_at: string
  updated_at: string
}

// Your 8-stage workflow
const WORKFLOW_STAGES = [
  { value: 'New Query - Not Responded', label: '🔴 New Query (Not Responded)', color: 'red', priority: 1 },
  { value: 'Responded - Awaiting Reply', label: '🟡 Awaiting Client Reply', color: 'yellow', priority: 2 },
  { value: 'Working on Proposal', label: '🔵 Working on Proposal', color: 'blue', priority: 3 },
  { value: 'Proposal Sent', label: '🟢 Proposal Sent', color: 'green', priority: 4 },
  { value: 'Revisions Requested', label: '🟣 Revisions Requested', color: 'purple', priority: 5 },
  { value: 'Finalized & Booking', label: '✅ Finalized & Booking', color: 'teal', priority: 6 },
  { value: 'Service Delivered', label: '📦 Service Delivered', color: 'emerald', priority: 7 },
  { value: 'Cancelled', label: '❌ Cancelled/Lost', color: 'gray', priority: 8 },
]

const QUERY_SOURCES = ['Phone Call', 'WhatsApp', 'Walk-in', 'Website', 'Email', 'Referral']

const SERVICE_TYPES = [
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
  const navigate = useNavigate()
  const [queries, setQueries] = useState<Query[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPassengerModal, setShowPassengerModal] = useState(false)
  const [showCommModal, setShowCommModal] = useState(false)
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'all' | 'urgent' | 'awaiting'>('all')
  
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    query_source: 'Phone Call' as any,
    service_type: '' as any,
    destination: '',
    travel_date: '',
    return_date: '',
    is_tentative_dates: false,
    adults: 1,
    children: 0,
    infants: 0,
    tentative_plan: '',
    internal_reminders: '',
    is_responded: false,
    response_given: '',
    status: 'New Query - Not Responded',
    priority_level: 'normal' as any,
    cost_price: 0,
    selling_price: 0,
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
    } else if (!formData.destination) {
      setFormData(prev => ({ ...prev, destination: '' }))
    }
  }, [formData.service_type])

  // Auto-update status based on response
  useEffect(() => {
    if (formData.is_responded && formData.status === 'New Query - Not Responded') {
      setFormData(prev => ({ ...prev, status: 'Responded - Awaiting Reply' }))
    } else if (!formData.is_responded && formData.status !== 'New Query - Not Responded') {
      setFormData(prev => ({ ...prev, status: 'New Query - Not Responded' }))
    }
  }, [formData.is_responded])

  const loadQueries = async () => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQueries(data || [])
    } catch (error) {
      console.error('Error loading queries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from('queries').insert([formData])

      if (error) throw error

      setShowModal(false)
      resetForm()
      loadQueries()
    } catch (error) {
      console.error('Error creating query:', error)
      alert('Failed to create query')
    }
  }

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      query_source: 'Phone Call',
      service_type: '',
      destination: '',
      travel_date: '',
      return_date: '',
      is_tentative_dates: false,
      adults: 1,
      children: 0,
      infants: 0,
      tentative_plan: '',
      internal_reminders: '',
      is_responded: false,
      response_given: '',
      status: 'New Query - Not Responded',
      priority_level: 'normal',
      cost_price: 0,
      selling_price: 0,
    })
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('queries')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      loadQueries()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const updateResponse = async (id: string, isResponded: boolean) => {
    try {
      const { error } = await supabase
        .from('queries')
        .update({ is_responded: isResponded })
        .eq('id', id)

      if (error) throw error
      loadQueries()
    } catch (error) {
      console.error('Error updating response status:', error)
    }
  }

  const filteredQueries = queries.filter((query) => {
    const matchesSearch =
      query.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.query_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.client_phone.includes(searchTerm)

    const matchesStatus = filterStatus === 'all' || query.status === filterStatus

    const matchesView = 
      viewMode === 'all' ||
      (viewMode === 'urgent' && !query.is_responded) ||
      (viewMode === 'awaiting' && query.is_responded && query.status === 'Responded - Awaiting Reply')

    return matchesSearch && matchesStatus && matchesView
  })

  // Sort queries by priority (urgent first)
  const sortedQueries = [...filteredQueries].sort((a, b) => {
    // Not responded queries first (urgent)
    if (!a.is_responded && b.is_responded) return -1
    if (a.is_responded && !b.is_responded) return 1
    
    // Then by creation date (oldest first for urgent queries)
    if (!a.is_responded && !b.is_responded) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    
    // For responded queries, newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const urgentCount = queries.filter(q => !q.is_responded).length
  const awaitingCount = queries.filter(q => q.is_responded && q.status === 'Responded - Awaiting Reply').length

  const getStatusColor = (status: string) => {
    const stage = WORKFLOW_STAGES.find(s => s.value === status)
    if (!stage) return 'bg-gray-100 text-gray-800 border-gray-200'
    
    const colors: Record<string, string> = {
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      teal: 'bg-teal-100 text-teal-800 border-teal-200',
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[stage.color] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getHoursSince = (date: string) => {
    const hours = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return '1 day ago'
    return `${days} days ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Query Tracking</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track customer queries from first contact to service delivery
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Query
        </button>
      </div>

      {/* Priority Alerts */}
      {urgentCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {urgentCount} {urgentCount === 1 ? 'query' : 'queries'} awaiting response!
              </p>
              <p className="text-xs text-red-600 mt-1">
                These queries have not been responded to yet. Please prioritize them.
              </p>
            </div>
            <button
              onClick={() => setViewMode('urgent')}
              className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
            >
              View Urgent
            </button>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="card">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Queries ({queries.length})
          </button>
          <button
            onClick={() => setViewMode('urgent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'urgent'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔴 Urgent - Not Responded ({urgentCount})
          </button>
          <button
            onClick={() => setViewMode('awaiting')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'awaiting'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🟡 Awaiting Reply ({awaitingCount})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-full md:w-64"
          >
            <option value="all">All Stages</option>
            {WORKFLOW_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Queries Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedQueries.map((query) => {
          const hoursSince = getHoursSince(query.created_at)
          const isUrgent = !query.is_responded
          
          return (
            <div
              key={query.id}
              className={`card transition-all ${
                isUrgent ? 'border-2 border-red-300 shadow-lg' : 'hover:shadow-md'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{query.client_name}</h3>
                    {isUrgent && (
                      <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full animate-pulse">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        URGENT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>#{query.query_number}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {hoursSince}
                    </span>
                    {query.query_source && (
                      <>
                        <span>•</span>
                        <span>via {query.query_source}</span>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Response Status Toggle */}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={query.is_responded}
                    onChange={(e) => updateResponse(query.id, e.target.checked)}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-xs text-gray-600">Responded?</span>
                </label>
              </div>

              {/* Service Type Badge */}
              {query.service_type && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200">
                    {query.service_type}
                  </span>
                </div>
              )}

              {/* Contact & Destination */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" />
                  <span className="truncate">{query.client_phone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" />
                  <span className="truncate font-medium">{query.destination}</span>
                </div>
              </div>

              {/* Travel Dates */}
              {(query.travel_date || query.is_tentative_dates) && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  {query.travel_date ? (
                    <>
                      {format(new Date(query.travel_date), 'MMM dd, yyyy')}
                      {query.return_date && ` - ${format(new Date(query.return_date), 'MMM dd')}`}
                      {query.is_tentative_dates && <span className="text-xs text-yellow-600">(Tentative)</span>}
                    </>
                  ) : (
                    <span className="text-yellow-600">Dates not confirmed yet</span>
                  )}
                </div>
              )}

              {/* Passengers Count */}
              <div className="flex items-center gap-4 text-sm mb-4">
                <span className="text-gray-600">
                  <Users className="w-4 h-4 inline-block mr-1" />
                  {query.adults} Adults
                </span>
                {query.children > 0 && <span className="text-gray-600">{query.children} Children</span>}
                {query.infants > 0 && <span className="text-gray-600">{query.infants} Infants</span>}
              </div>

              {/* Tentative Plan */}
              {query.tentative_plan && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded mb-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Customer Plan:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                    {query.tentative_plan}
                  </p>
                </div>
              )}

              {/* Internal Reminders */}
              {query.internal_reminders && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded mb-4">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ Internal Notes:</p>
                  <p className="text-sm text-gray-700">
                    {query.internal_reminders}
                  </p>
                </div>
              )}

              {/* Response Given */}
              {query.response_given && (
                <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded mb-4">
                  <p className="text-xs font-semibold text-green-700 mb-1">✓ What Was Told:</p>
                  <p className="text-sm text-gray-700">
                    {query.response_given}
                  </p>
                </div>
              )}

              {/* Status Selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Query Stage:
                </label>
                <select
                  value={query.status}
                  onChange={(e) => updateStatus(query.id, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    getStatusColor(query.status)
                  }`}
                >
                  {WORKFLOW_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Quick Actions
                  </span>
                  <QuickActions
                    phone={query.client_phone}
                    email={query.client_email}
                    onActionComplete={(_type) => {
                      // Optionally auto-open communication log modal
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/queries/${query.id}`)}
                    className="btn btn-primary btn-sm w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Details
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedQueryId(query.id)
                        setShowPassengerModal(true)
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Passengers
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuery(query)
                        setSelectedQueryId(query.id)
                        setShowCommModal(true)
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Communications
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {sortedQueries.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No queries found</p>
          </div>
        )}
      </div>

      {/* Create Query Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Create New Query</h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Customer Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Customer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Customer Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.client_name}
                          onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                          className="input"
                          placeholder="Muhammad Ahmed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.client_phone}
                          onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                          className="input"
                          placeholder="0300-1234567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={formData.client_email}
                          onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                          className="input"
                          placeholder="customer@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Query Source *
                        </label>
                        <select
                          value={formData.query_source}
                          onChange={(e) => setFormData({ ...formData, query_source: e.target.value as any })}
                          className="input"
                          required
                        >
                          {QUERY_SOURCES.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Service Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Type *
                        </label>
                        <select
                          value={formData.service_type}
                          onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                          className="input"
                          required
                        >
                          <option value="">Select Service Type</option>
                          {SERVICE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Destination *
                          {(formData.service_type === 'Umrah Package' || 
                            formData.service_type === 'Umrah Plus Package' || 
                            formData.service_type === 'Hajj Package') && (
                            <span className="text-xs text-green-600 ml-2">(Auto-filled)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.destination}
                          onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                          className="input"
                          placeholder="Destination"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Passengers *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">Adults</label>
                            <input
                              type="number"
                              min="1"
                              value={formData.adults}
                              onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Children</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.children}
                              onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
                              className="input"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Infants</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.infants}
                              onChange={(e) => setFormData({ ...formData, infants: parseInt(e.target.value) })}
                              className="input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Travel Dates */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Travel Dates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Departure Date
                        </label>
                        <input
                          type="date"
                          value={formData.travel_date}
                          onChange={(e) => setFormData({ ...formData, travel_date: e.target.value })}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Return Date
                        </label>
                        <input
                          type="date"
                          value={formData.return_date}
                          onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                          className="input"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.is_tentative_dates}
                            onChange={(e) => setFormData({ ...formData, is_tentative_dates: e.target.checked })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Dates are tentative / not confirmed yet
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Tentative Plan */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Customer Plan</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tentative Plan
                        <span className="text-xs text-gray-500 ml-2">(Paste WhatsApp message or write from call)</span>
                      </label>
                      <textarea
                        value={formData.tentative_plan}
                        onChange={(e) => setFormData({ ...formData, tentative_plan: e.target.value })}
                        className="input"
                        rows={6}
                        placeholder="Paste customer's query/plan here...

Example:
Salam, I want Umrah package for 4 people
Travel dates: March 15-25
Need 5-star hotel near Haram
Budget: Rs 250,000 per person"
                      />
                    </div>
                  </div>

                  {/* Response Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Response Tracking</h4>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_responded}
                          onChange={(e) => setFormData({ ...formData, is_responded: e.target.checked })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          Have you responded to this query?
                        </span>
                      </label>

                      {formData.is_responded && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            What was told to the customer?
                          </label>
                          <textarea
                            value={formData.response_given}
                            onChange={(e) => setFormData({ ...formData, response_given: e.target.value })}
                            className="input"
                            rows={3}
                            placeholder="I told them: 'We will work on your package and send you 3 options with prices within 2 hours...'"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Internal Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Reminders / Notes
                      <span className="text-xs text-gray-500 ml-2">(Only visible to team)</span>
                    </label>
                    <textarea
                      value={formData.internal_reminders}
                      onChange={(e) => setFormData({ ...formData, internal_reminders: e.target.value })}
                      className="input"
                      rows={3}
                      placeholder="Internal notes for team:
- Customer wants budget options
- Follow up if no response by tomorrow
- Prefer 5-star hotels only"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary w-full sm:w-auto sm:ml-3">
                    Save Query
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Modal */}
      {showPassengerModal && selectedQueryId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPassengerModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Manage Passengers</h3>
                  <button onClick={() => setShowPassengerModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <PassengerSelector queryId={selectedQueryId} />
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowPassengerModal(false)}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Close
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCommModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Communications - {selectedQuery.client_name}</h3>
                  <button onClick={() => setShowCommModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Log New Communication</h4>
                    <AddCommunication
                      entityType="query"
                      entityId={selectedQueryId}
                      contactPhone={selectedQuery.client_phone}
                      contactEmail={selectedQuery.client_email || undefined}
                      onSuccess={() => {
                        // Refresh communication log
                      }}
                    />
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Communication History</h4>
                    <CommunicationLog entityType="query" entityId={selectedQueryId} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowCommModal(false)}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
