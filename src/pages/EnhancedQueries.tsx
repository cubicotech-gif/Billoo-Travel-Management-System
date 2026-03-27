import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, Calendar, Phone, MapPin, AlertCircle,
  Users, MessageCircle, Clock, X, Eye, FileText, AlertTriangle
} from 'lucide-react'
import { format, differenceInDays, addDays } from 'date-fns'
import DateRangePicker from '@/components/queries/DateRangePicker'
import SmartTextarea from '@/components/queries/SmartTextarea'
import PassengerSelector from '@/components/PassengerSelector'
import CommunicationLog from '@/components/CommunicationLog'
import AddCommunication from '@/components/AddCommunication'
import QuickActions from '@/components/QuickActions'
import TravelAlertBanner from '@/components/queries/TravelAlertBanner'
import CreateFromTemplateModal from '@/components/queries/CreateFromTemplateModal'
import QueryPassengerPicker from '@/components/queries/QueryPassengerPicker'
import { linkPassengerToQuery, createPassengerAndLink } from '@/lib/api/queries'

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

// Complete 10-stage workflow
const WORKFLOW_STAGES = [
  { value: 'New Query - Not Responded', label: '🔴 New Query (Not Responded)', color: 'red', priority: 1 },
  { value: 'Responded - Awaiting Reply', label: '🟡 Awaiting Client Reply', color: 'yellow', priority: 2 },
  { value: 'Working on Proposal', label: '🔵 Working on Proposal', color: 'blue', priority: 3 },
  { value: 'Proposal Sent', label: '📧 Proposal Sent', color: 'green', priority: 4 },
  { value: 'Revisions Requested', label: '🟣 Revisions Requested', color: 'purple', priority: 5 },
  { value: 'Finalized & Booking', label: '✅ Finalized & Booking', color: 'teal', priority: 6 },
  { value: 'Services Booked', label: '📦 Services Booked', color: 'indigo', priority: 7 },
  { value: 'In Delivery', label: '🚚 In Delivery', color: 'cyan', priority: 8 },
  { value: 'Completed', label: '✅ Completed', color: 'emerald', priority: 9 },
  { value: 'Cancelled', label: '❌ Cancelled', color: 'gray', priority: 10 },
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
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState<{
    mode: 'existing' | 'new';
    id?: string;
    name: string;
    phone: string;
    email: string;
  } | null>(null)

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
    // New fields
    package_days: '' as string | number,
    city_order: '' as string,
    makkah_nights: '' as string | number,
    madinah_nights: '' as string | number,
    hotel_preferences: '',
    budget_amount: '' as string | number,
    budget_type: 'total' as string,
  })

  const autoCapitalize = (value: string): string => {
    return value.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const isUmrahHajj = ['Umrah Package', 'Umrah Plus Package', 'Hajj Package'].includes(formData.service_type)
  const totalPax = formData.adults + formData.children + formData.infants

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

  // Date ↔ Package Days sync
  useEffect(() => {
    if (formData.travel_date && formData.return_date) {
      const dep = new Date(formData.travel_date + 'T00:00:00')
      const ret = new Date(formData.return_date + 'T00:00:00')
      const days = differenceInDays(ret, dep)
      if (days > 0 && isUmrahHajj) {
        setFormData(prev => ({ ...prev, package_days: days }))
      }
    }
  }, [formData.travel_date, formData.return_date])

  // Auto-suggest return date from departure + package days
  useEffect(() => {
    if (formData.travel_date && formData.package_days && !formData.return_date) {
      const days = typeof formData.package_days === 'string' ? parseInt(formData.package_days) : formData.package_days
      if (days > 0) {
        const dep = new Date(formData.travel_date + 'T00:00:00')
        const ret = addDays(dep, days)
        setFormData(prev => ({ ...prev, return_date: format(ret, 'yyyy-MM-dd') }))
      }
    }
  }, [formData.package_days, formData.travel_date])

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
      // Clean empty strings to null for DB compatibility
      const insertData: any = { ...formData }
      if (!insertData.client_email) insertData.client_email = null
      if (!insertData.service_type) insertData.service_type = null
      if (!insertData.travel_date) insertData.travel_date = null
      if (!insertData.return_date) insertData.return_date = null
      if (!insertData.tentative_plan) insertData.tentative_plan = null
      if (!insertData.internal_reminders) insertData.internal_reminders = null
      if (!insertData.response_given) insertData.response_given = null
      if (!insertData.query_source) insertData.query_source = null
      // New fields — clean empties to null
      insertData.package_days = insertData.package_days ? Number(insertData.package_days) : null
      insertData.city_order = insertData.city_order || null
      insertData.makkah_nights = insertData.makkah_nights ? Number(insertData.makkah_nights) : null
      insertData.madinah_nights = insertData.madinah_nights ? Number(insertData.madinah_nights) : null
      insertData.hotel_preferences = insertData.hotel_preferences || null
      insertData.budget_amount = insertData.budget_amount ? Number(insertData.budget_amount) : null
      insertData.budget_type = insertData.budget_amount ? insertData.budget_type : null

      const { data: newQuery, error } = await supabase
        .from('queries')
        .insert([insertData])
        .select('id, query_number')
        .single()

      if (error) throw error

      // Auto-link passenger to the new query
      if (newQuery && selectedPassenger) {
        try {
          if (selectedPassenger.mode === 'existing' && selectedPassenger.id) {
            await linkPassengerToQuery(newQuery.id, selectedPassenger.id)
          } else if (selectedPassenger.mode === 'new') {
            await createPassengerAndLink(
              newQuery.id,
              selectedPassenger.name,
              formData.client_phone,
              formData.client_email || undefined
            )
          }
        } catch (linkErr) {
          console.error('Failed to link passenger (query created):', linkErr)
        }
      }

      setShowModal(false)
      setSelectedPassenger(null)
      resetForm()
      loadQueries()
    } catch (error: any) {
      console.error('Error creating query:', error)
      alert('Failed to create query: ' + (error.message || 'Unknown error'))
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
      package_days: '',
      city_order: '',
      makkah_nights: '',
      madinah_nights: '',
      hotel_preferences: '',
      budget_amount: '',
      budget_type: 'total',
    })
  }

  const handleAutoFillFromText = (fields: Record<string, string | number>) => {
    setFormData(prev => ({ ...prev, ...fields }))
  }

  const nightsSplitWarning = (() => {
    const pkgDays = typeof formData.package_days === 'string' ? parseInt(formData.package_days) : formData.package_days
    const mNights = typeof formData.makkah_nights === 'string' ? parseInt(formData.makkah_nights) : formData.makkah_nights
    const mdNights = typeof formData.madinah_nights === 'string' ? parseInt(formData.madinah_nights) : formData.madinah_nights
    if (pkgDays && mNights && mdNights && (mNights + mdNights !== pkgDays)) {
      return `Makkah (${mNights}) + Madinah (${mdNights}) = ${mNights + mdNights} nights, but package is ${pkgDays} days`
    }
    return null
  })()

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="btn btn-secondary flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            From Template
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            New Query
          </button>
        </div>
      </div>

      {/* Travel Alerts */}
      <TravelAlertBanner />

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
                      {/* Passenger Picker — spans full width */}
                      <div className="md:col-span-2">
                        <QueryPassengerPicker
                          onSelect={(passenger) => {
                            setSelectedPassenger(passenger);
                            if (passenger) {
                              setFormData(prev => ({
                                ...prev,
                                client_name: passenger.name,
                                client_phone: passenger.phone || prev.client_phone,
                                client_email: passenger.email || prev.client_email,
                              }));
                            }
                          }}
                          initialName={formData.client_name}
                          initialPhone={formData.client_phone}
                          initialEmail={formData.client_email}
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
                          onChange={(e) => setFormData({ ...formData, destination: autoCapitalize(e.target.value) })}
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

                  {/* Client Budget (Optional) */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Client Budget <span className="text-xs font-normal text-gray-400">(Optional)</span></h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs</span>
                          <input
                            type="number"
                            min="0"
                            value={formData.budget_amount}
                            onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                            className="input pl-9"
                            placeholder="350,000"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Type</label>
                        <select
                          value={formData.budget_type}
                          onChange={(e) => setFormData({ ...formData, budget_type: e.target.value })}
                          className="input"
                        >
                          <option value="total">Total Package</option>
                          <option value="per_person">Per Person</option>
                        </select>
                      </div>
                    </div>
                    {formData.budget_amount && formData.budget_type === 'per_person' && totalPax > 0 && (
                      <p className="mt-2 text-sm text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg">
                        Per Person: Rs {Number(formData.budget_amount).toLocaleString()} × {totalPax} pax = Total: Rs {(Number(formData.budget_amount) * totalPax).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Travel Dates */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Travel Dates</h4>
                    <DateRangePicker
                      departureDate={formData.travel_date}
                      returnDate={formData.return_date}
                      onDepartureChange={(date) => setFormData(prev => ({ ...prev, travel_date: date }))}
                      onReturnChange={(date) => setFormData(prev => ({ ...prev, return_date: date }))}
                    />
                    <div className="mt-3">
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

                  {/* Package Details — Umrah/Hajj only */}
                  {isUmrahHajj && (
                    <div className="mb-6 overflow-hidden transition-all duration-300">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        Package Details <span className="text-xs font-normal text-gray-400">(Optional)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Package Days</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.package_days}
                            onChange={(e) => {
                              const days = e.target.value ? parseInt(e.target.value) : ''
                              setFormData(prev => ({ ...prev, package_days: days }))
                            }}
                            className="input"
                            placeholder="e.g. 14"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City Order</label>
                          <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="city_order"
                                value="makkah_first"
                                checked={formData.city_order === 'makkah_first'}
                                onChange={(e) => setFormData({ ...formData, city_order: e.target.value })}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Makkah First</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="city_order"
                                value="madinah_first"
                                checked={formData.city_order === 'madinah_first'}
                                onChange={(e) => setFormData({ ...formData, city_order: e.target.value })}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-gray-700">Madinah First</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nights Split</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500">Makkah Nights</label>
                              <input
                                type="number"
                                min="0"
                                value={formData.makkah_nights}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value) : ''
                                  const pkgDays = typeof formData.package_days === 'string' ? parseInt(formData.package_days) : formData.package_days
                                  const newState: any = { makkah_nights: val }
                                  // Auto-fill madinah nights
                                  if (val && pkgDays && !formData.madinah_nights) {
                                    newState.madinah_nights = pkgDays - (val as number)
                                  }
                                  setFormData(prev => ({ ...prev, ...newState }))
                                }}
                                className="input"
                                placeholder="8"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Madinah Nights</label>
                              <input
                                type="number"
                                min="0"
                                value={formData.madinah_nights}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value) : ''
                                  const pkgDays = typeof formData.package_days === 'string' ? parseInt(formData.package_days) : formData.package_days
                                  const newState: any = { madinah_nights: val }
                                  // Auto-fill makkah nights
                                  if (val && pkgDays && !formData.makkah_nights) {
                                    newState.makkah_nights = pkgDays - (val as number)
                                  }
                                  setFormData(prev => ({ ...prev, ...newState }))
                                }}
                                className="input"
                                placeholder="6"
                              />
                            </div>
                          </div>
                          {nightsSplitWarning && (
                            <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {nightsSplitWarning}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Preferences</label>
                          <input
                            type="text"
                            value={formData.hotel_preferences}
                            onChange={(e) => setFormData({ ...formData, hotel_preferences: autoCapitalize(e.target.value) })}
                            className="input"
                            placeholder='e.g. "5-star near Haram" or "budget, any area"'
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tentative Plan */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Customer Plan</h4>
                    <SmartTextarea
                      value={formData.tentative_plan}
                      onChange={(val) => setFormData({ ...formData, tentative_plan: val })}
                      label="Tentative Plan"
                      sublabel="(Paste WhatsApp message or write from call)"
                      rows={6}
                      placeholder={"Paste customer's query/plan here...\n\nExample:\nSalam, I want Umrah package for 4 people\nTravel dates: March 15-25\nNeed 5-star hotel near Haram\nBudget: Rs 250,000 per person"}
                      showAutoFill={isUmrahHajj}
                      onAutoFill={handleAutoFillFromText}
                    />
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
                    <SmartTextarea
                      value={formData.internal_reminders}
                      onChange={(val) => setFormData({ ...formData, internal_reminders: val })}
                      label="Internal Reminders / Notes"
                      sublabel="(Only visible to team)"
                      rows={3}
                      placeholder={"Internal notes for team:\n- Customer wants budget options\n- Follow up if no response by tomorrow\n- Prefer 5-star hotels only"}
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

      {showTemplateModal && (
        <CreateFromTemplateModal
          onClose={() => setShowTemplateModal(false)}
          onSuccess={(newId) => { setShowTemplateModal(false); navigate(`/queries/${newId}`); }}
        />
      )}
    </div>
  )
}
