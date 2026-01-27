import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, Calendar, Phone, Mail, MapPin, Plane, Hotel,
  FileText, User, Trash2, X, Users, MessageCircle
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
  destination: string
  travel_date: string | null
  return_date: string | null
  adults: number
  children: number
  infants: number
  status: string
  notes: string | null
  created_at: string
  cost_price?: number
  selling_price?: number
  services?: QueryService[]
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
const SERVICE_TYPES = ['Flight', 'Hotel', 'Visa', 'Transport', 'Tour', 'Insurance', 'Other']

export default function EnhancedQueries() {
  const [queries, setQueries] = useState<Query[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPassengerModal, setShowPassengerModal] = useState(false)
  const [showCommModal, setShowCommModal] = useState(false)
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
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
  })

  const [services, setServices] = useState<QueryService[]>([])
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    type: 'Flight' as any,
    description: '',
    vendor: '',
    cost: 0,
    selling: 0,
    pnr: '',
    booking_ref: '',
  })

  useEffect(() => {
    loadQueries()
  }, [])

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
    })
    setServices([])
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

  const addService = () => {
    if (!serviceForm.description || !serviceForm.vendor) {
      alert('Please fill in service details')
      return
    }

    setServices([...services, { ...serviceForm, id: Date.now().toString() }])
    setServiceForm({
      type: 'Flight',
      description: '',
      vendor: '',
      cost: 0,
      selling: 0,
      pnr: '',
      booking_ref: '',
    })
    setShowServiceModal(false)
  }

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id))
  }

  const filteredQueries = queries.filter((query) => {
    const matchesSearch =
      query.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.query_number.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus === 'all' || query.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'New': 'bg-blue-100 text-blue-800 border-blue-200',
      'Working': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Quoted': 'bg-purple-100 text-purple-800 border-purple-200',
      'Finalized': 'bg-green-100 text-green-800 border-green-200',
      'Booking': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Issued': 'bg-teal-100 text-teal-800 border-teal-200',
      'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getServiceIcon = (type: string) => {
    const icons: Record<string, any> = {
      'Flight': Plane,
      'Hotel': Hotel,
      'Visa': FileText,
      'Transport': MapPin,
      'Tour': User,
      'Insurance': FileText,
      'Other': FileText,
    }
    return icons[type] || FileText
  }

  const totalCost = services.reduce((sum, s) => sum + s.cost, 0)
  const totalSelling = services.reduce((sum, s) => sum + s.selling, 0)
  const totalProfit = totalSelling - totalCost
  const profitMargin = totalSelling > 0 ? ((totalProfit / totalSelling) * 100).toFixed(1) : '0'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queries & Bookings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage travel inquiries with detailed service breakdown
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          New Query
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
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
            className="input"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Pipeline */}
      <div className="card overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({queries.length})
          </button>
          {STATUSES.map(status => {
            const count = queries.filter(q => q.status === status).length
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filterStatus === status ? getStatusColor(status) + ' border' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Queries Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredQueries.map((query) => {
          const profit = (query.selling_price || 0) - (query.cost_price || 0)
          const margin = query.selling_price && query.selling_price > 0
            ? ((profit / query.selling_price) * 100).toFixed(1)
            : '0'

          return (
            <div key={query.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{query.client_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(query.status)}`}>
                      {query.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">Query #{query.query_number}</p>
                </div>
                <select
                  value={query.status}
                  onChange={(e) => updateStatus(query.id, e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-primary-600" />
                  <span className="font-medium">{query.destination}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2 text-primary-600" />
                  {query.client_phone}
                </div>
                {query.client_email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-primary-600" />
                    {query.client_email}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm mb-4">
                {query.travel_date && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-primary-600" />
                    {format(new Date(query.travel_date), 'MMM dd, yyyy')}
                    {query.return_date && ` - ${format(new Date(query.return_date), 'MMM dd')}`}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">👥 {query.adults} Adults</span>
                  {query.children > 0 && <span className="text-gray-600">👶 {query.children} Children</span>}
                  {query.infants > 0 && <span className="text-gray-600">🍼 {query.infants} Infants</span>}
                </div>
              </div>

              {/* Pricing Section */}
              {(query.cost_price || query.selling_price) && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Cost Price</p>
                    <p className="text-lg font-bold text-gray-900">₹{(query.cost_price || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Selling Price</p>
                    <p className="text-lg font-bold text-primary-600">₹{(query.selling_price || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Profit ({margin}%)</p>
                    <p className={`text-lg font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{profit.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {query.notes && (
                <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded mb-4">
                  <p className="text-sm text-gray-700">{query.notes}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Quick Actions
                  </span>
                  <QuickActions
                    phone={query.client_phone}
                    email={query.client_email}
                    onActionComplete={(type) => {
                      // Optionally auto-open communication log modal
                    }}
                  />
                </div>

                {/* Action Buttons */}
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
          )
        })}

        {filteredQueries.length === 0 && (
          <div className="card text-center py-12">
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

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Query</h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        className="input"
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
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.client_email}
                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Destination *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Travel Date
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adults
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.adults}
                        onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Children
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.children}
                        onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Infants
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.infants}
                        onChange={(e) => setFormData({ ...formData, infants: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="input"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cost Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Selling Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) })}
                        className="input"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  {/* Services Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-900">Services Breakdown</h4>
                      <button
                        type="button"
                        onClick={() => setShowServiceModal(true)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        + Add Service
                      </button>
                    </div>

                    {services.length > 0 ? (
                      <div className="space-y-2">
                        {services.map(service => {
                          const ServiceIcon = getServiceIcon(service.type)
                          return (
                            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <ServiceIcon className="w-5 h-5 text-primary-600" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{service.type}: {service.description}</p>
                                  <p className="text-xs text-gray-600">Vendor: {service.vendor}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-xs text-gray-600">Cost: ₹{service.cost}</p>
                                  <p className="text-xs text-primary-600">Selling: ₹{service.selling}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeService(service.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}

                        <div className="flex justify-end gap-6 p-3 bg-primary-50 rounded-lg mt-3">
                          <div>
                            <p className="text-xs text-gray-600">Total Cost</p>
                            <p className="text-sm font-bold text-gray-900">₹{totalCost.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Total Selling</p>
                            <p className="text-sm font-bold text-primary-600">₹{totalSelling.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Profit ({profitMargin}%)</p>
                            <p className={`text-sm font-bold ${totalProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{totalProfit.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No services added yet</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="btn btn-primary">
                    Create Query
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowServiceModal(false)} />
            <div className="inline-block bg-white rounded-lg p-6 shadow-xl transform transition-all sm:max-w-lg sm:w-full z-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Service</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select
                    value={serviceForm.type}
                    onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value as any })}
                    className="input"
                  >
                    {SERVICE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <input
                    type="text"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="input"
                    placeholder="e.g., Mumbai to Dubai return"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <input
                    type="text"
                    value={serviceForm.vendor}
                    onChange={(e) => setServiceForm({ ...serviceForm, vendor: e.target.value })}
                    className="input"
                    placeholder="e.g., Emirates Airlines"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.cost}
                      onChange={(e) => setServiceForm({ ...serviceForm, cost: parseFloat(e.target.value) })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.selling}
                      onChange={(e) => setServiceForm({ ...serviceForm, selling: parseFloat(e.target.value) })}
                      className="input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PNR</label>
                    <input
                      type="text"
                      value={serviceForm.pnr}
                      onChange={(e) => setServiceForm({ ...serviceForm, pnr: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Ref</label>
                    <input
                      type="text"
                      value={serviceForm.booking_ref}
                      onChange={(e) => setServiceForm({ ...serviceForm, booking_ref: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button onClick={addService} className="btn btn-primary flex-1">
                  Add Service
                </button>
                <button onClick={() => setShowServiceModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Management Modal */}
      {showPassengerModal && selectedQueryId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowPassengerModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manage Passengers
                  </h3>
                  <button
                    onClick={() => setShowPassengerModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <PassengerSelector
                  queryId={selectedQueryId}
                  onPassengersChange={loadQueries}
                />
              </div>

              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <button
                  onClick={() => setShowPassengerModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Communications Modal */}
      {showCommModal && selectedQueryId && selectedQuery && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCommModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-primary-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Communications
                    </h3>
                    <p className="text-sm text-primary-100 mt-1">
                      {selectedQuery.client_name} - #{selectedQuery.query_number}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCommModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {/* Add Communication Form */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Log New Communication
                  </h4>
                  <AddCommunication
                    entityType="query"
                    entityId={selectedQueryId}
                    contactPhone={selectedQuery.client_phone}
                    contactEmail={selectedQuery.client_email}
                    onSuccess={() => {
                      // Refresh communication log
                      const event = new CustomEvent('refreshCommunications')
                      window.dispatchEvent(event)
                    }}
                  />
                </div>

                {/* Communication History */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Communication History
                  </h4>
                  <CommunicationLog
                    entityType="query"
                    entityId={selectedQueryId}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <button
                  onClick={() => setShowCommModal(false)}
                  className="btn btn-secondary"
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
