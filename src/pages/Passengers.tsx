import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, User, Mail, Phone, CreditCard, FileText, X,
  MessageCircle, Star, AlertTriangle, DollarSign, Package, Filter
} from 'lucide-react'
import { format } from 'date-fns'
import DocumentUpload from '@/components/DocumentUpload'
import DocumentList from '@/components/DocumentList'
import TravelHistory from '@/components/TravelHistory'
import CommunicationLog from '@/components/CommunicationLog'
import AddCommunication from '@/components/AddCommunication'

interface Passenger {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  cnic: string | null
  passport_number: string | null
  passport_expiry: string | null
  date_of_birth: string | null
  nationality: string | null
  whatsapp_number: string | null
  alternate_phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  is_vip: boolean
  is_active: boolean
  total_trips: number
  total_revenue: number
  outstanding_balance: number
  notes: string | null
  created_at: string
}

export default function Passengers() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'travel' | 'communications' | 'financial'>('info')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'vip'>('all')

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cnic: '',
    passport_number: '',
    passport_expiry: '',
    date_of_birth: '',
    nationality: 'Pakistani',
    whatsapp_number: '',
    alternate_phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    is_vip: false,
    is_active: true,
    notes: '',
  })

  useEffect(() => {
    loadPassengers()
  }, [])

  const loadPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPassengers(data || [])
    } catch (error) {
      console.error('Error loading passengers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const passengerData = {
        ...formData,
        cnic: formData.cnic || null,
        email: formData.email || null,
        passport_number: formData.passport_number || null,
        passport_expiry: formData.passport_expiry || null,
        date_of_birth: formData.date_of_birth || null,
        whatsapp_number: formData.whatsapp_number || null,
        alternate_phone: formData.alternate_phone || null,
        address: formData.address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        notes: formData.notes || null,
      }

      const { error } = await supabase.from('passengers').insert([passengerData])

      if (error) throw error

      setShowModal(false)
      resetForm()
      loadPassengers()
    } catch (error) {
      console.error('Error creating passenger:', error)
      alert('Failed to create passenger')
    }
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      cnic: '',
      passport_number: '',
      passport_expiry: '',
      date_of_birth: '',
      nationality: 'Pakistani',
      whatsapp_number: '',
      alternate_phone: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      is_vip: false,
      is_active: true,
      notes: '',
    })
  }

  const handleViewDetails = (passenger: Passenger) => {
    setSelectedPassenger(passenger)
    setActiveTab('info')
    setShowDetailModal(true)
  }

  const getFilteredPassengers = () => {
    let filtered = passengers

    // Filter by type
    if (filterType === 'active') {
      filtered = filtered.filter(p => p.is_active)
    } else if (filterType === 'vip') {
      filtered = filtered.filter(p => p.is_vip)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((passenger) =>
        `${passenger.first_name} ${passenger.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        passenger.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        passenger.phone.includes(searchTerm) ||
        passenger.cnic?.includes(searchTerm) ||
        passenger.passport_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const filteredPassengers = getFilteredPassengers()
  const activeCount = passengers.filter(p => p.is_active).length
  const vipCount = passengers.filter(p => p.is_vip).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading passengers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Passenger Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage passenger profiles and travel history</p>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex items-center space-x-3">
        <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filterType === 'all'
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          All
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs">
            {passengers.length}
          </span>
        </button>
        <button
          onClick={() => setFilterType('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filterType === 'active'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Active
          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs">
            {activeCount}
          </span>
        </button>
        <button
          onClick={() => setFilterType('vip')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filterType === 'vip'
              ? 'bg-yellow-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          ⭐ VIP
          <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs">
            {vipCount}
          </span>
        </button>
      </div>

      {/* Search and Add Button */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name, phone, email, CNIC, passport..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium inline-flex items-center space-x-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          <span>Add Passenger</span>
        </button>
      </div>

      {/* Passengers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPassengers.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">No passengers found</p>
          </div>
        ) : (
          filteredPassengers.map((passenger) => (
            <div
              key={passenger.id}
              onClick={() => handleViewDetails(passenger)}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer p-5 relative"
            >
              {/* VIP Badge */}
              {passenger.is_vip && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    VIP
                  </span>
                </div>
              )}

              {/* Avatar & Name */}
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {passenger.first_name.charAt(0)}{passenger.last_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {passenger.first_name} {passenger.last_name}
                  </h3>
                  {passenger.cnic && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      CNIC: {passenger.cnic}
                    </p>
                  )}
                  {!passenger.is_active && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 mt-1">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>{passenger.phone}</span>
                </div>
                {passenger.whatsapp_number && passenger.whatsapp_number !== passenger.phone && (
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <span>{passenger.whatsapp_number}</span>
                  </div>
                )}
                {passenger.email && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="truncate">{passenger.email}</span>
                  </div>
                )}
                {passenger.passport_number && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span>{passenger.passport_number}</span>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <Package className="h-4 w-4 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Trips</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{passenger.total_trips}</p>
                  </div>
                  <div>
                    <DollarSign className="h-4 w-4 mx-auto text-green-600 dark:text-green-400 mb-1" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      Rs {passenger.total_revenue.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <AlertTriangle className={`h-4 w-4 mx-auto mb-1 ${
                      passenger.outstanding_balance > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-400 dark:text-gray-600'
                    }`} />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                    <p className={`text-sm font-bold ${
                      passenger.outstanding_balance > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Rs {passenger.outstanding_balance.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Pending Alert */}
              {passenger.outstanding_balance > 0 && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Payment pending</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Passenger Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowModal(false)} />

            <div className="inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Add New Passenger</h3>
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
                  {/* Section 1: Basic Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Basic Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          CNIC Number
                        </label>
                        <input
                          type="text"
                          value={formData.cnic}
                          onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                          placeholder="42101-1234567-8"
                          maxLength={15}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nationality
                        </label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Primary Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          WhatsApp Number
                        </label>
                        <input
                          type="tel"
                          value={formData.whatsapp_number}
                          onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                          placeholder="If different from primary phone"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Alternate Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.alternate_phone}
                          onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          rows={2}
                          placeholder="House #, Street, Area, City"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Passport Information */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Passport Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Passport Number
                        </label>
                        <input
                          type="text"
                          value={formData.passport_number}
                          onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Passport Expiry Date
                        </label>
                        <input
                          type="date"
                          value={formData.passport_expiry}
                          onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Emergency Contact */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Emergency Contact
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Additional Settings */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Additional Settings
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is-vip"
                          checked={formData.is_vip}
                          onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="is-vip" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500" />
                          Mark as VIP Customer
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is-active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="is-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Active Customer
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section 6: Notes */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Notes
                    </h4>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Any additional notes about the passenger..."
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
                  Add Passenger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Detail Modal */}
      {showDetailModal && selectedPassenger && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" onClick={() => setShowDetailModal(false)} />

            <div className="inline-block w-full max-w-5xl overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-primary">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">
                        {selectedPassenger.first_name.charAt(0)}{selectedPassenger.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {selectedPassenger.first_name} {selectedPassenger.last_name}
                      </h3>
                      <p className="text-white/80 text-sm">{selectedPassenger.phone}</p>
                    </div>
                    {selectedPassenger.is_vip && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        VIP
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="mt-4 flex space-x-1">
                  {(['info', 'financial', 'documents', 'travel', 'communications'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === tab
                          ? 'bg-white text-red-600'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {tab === 'info' && 'Information'}
                      {tab === 'financial' && 'Financial'}
                      {tab === 'documents' && 'Documents'}
                      {tab === 'travel' && 'Travel History'}
                      {tab === 'communications' && 'Communications'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Primary Phone:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.phone}</p>
                        </div>
                        {selectedPassenger.whatsapp_number && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">WhatsApp:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.whatsapp_number}</p>
                          </div>
                        )}
                        {selectedPassenger.alternate_phone && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Alternate Phone:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.alternate_phone}</p>
                          </div>
                        )}
                        {selectedPassenger.email && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Identity Information */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Identity Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {selectedPassenger.cnic && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">CNIC:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.cnic}</p>
                          </div>
                        )}
                        {selectedPassenger.passport_number && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Passport Number:</span>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.passport_number}</p>
                          </div>
                        )}
                        {selectedPassenger.passport_expiry && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Passport Expiry:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(selectedPassenger.passport_expiry), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                        {selectedPassenger.date_of_birth && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Date of Birth:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(selectedPassenger.date_of_birth), 'MMM d, yyyy')}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Nationality:</span>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.nationality || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    {selectedPassenger.address && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Address</h4>
                        <p className="text-sm text-gray-900 dark:text-white">{selectedPassenger.address}</p>
                      </div>
                    )}

                    {/* Emergency Contact */}
                    {(selectedPassenger.emergency_contact_name || selectedPassenger.emergency_contact_phone) && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {selectedPassenger.emergency_contact_name && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Name:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.emergency_contact_name}</p>
                            </div>
                          )}
                          {selectedPassenger.emergency_contact_phone && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                              <p className="font-medium text-gray-900 dark:text-white">{selectedPassenger.emergency_contact_phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedPassenger.notes && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h4>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedPassenger.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                        <Package className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Trips</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{selectedPassenger.total_trips}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                        <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mb-3" />
                        <p className="text-sm text-green-700 dark:text-green-300 mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                          Rs {selectedPassenger.total_revenue.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className={`bg-gradient-to-br p-6 rounded-xl border ${
                        selectedPassenger.outstanding_balance > 0
                          ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
                          : 'from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20 border-gray-200 dark:border-gray-700'
                      }`}>
                        <AlertTriangle className={`h-8 w-8 mb-3 ${
                          selectedPassenger.outstanding_balance > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <p className={`text-sm mb-1 ${
                          selectedPassenger.outstanding_balance > 0
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>Outstanding Balance</p>
                        <p className={`text-3xl font-bold ${
                          selectedPassenger.outstanding_balance > 0
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          Rs {selectedPassenger.outstanding_balance.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Financial Breakdown Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Financial Breakdown
                      </h4>
                      <p className="text-blue-800 dark:text-blue-300 mb-4">
                        Detailed financial information is shown in the Travel History tab with complete trip-wise breakdown.
                      </p>
                      <button
                        onClick={() => setActiveTab('travel')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center space-x-2"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View Travel History & Financial Details</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <DocumentUpload
                      entityType="passenger"
                      entityId={selectedPassenger.id}
                      onUploadComplete={() => {}}
                    />
                    <DocumentList
                      entityType="passenger"
                      entityId={selectedPassenger.id}
                    />
                  </div>
                )}

                {activeTab === 'travel' && (
                  <TravelHistory passengerId={selectedPassenger.id} />
                )}

                {activeTab === 'communications' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Log New Communication
                      </h4>
                      <AddCommunication
                        entityType="passenger"
                        entityId={selectedPassenger.id}
                        contactPhone={selectedPassenger.phone}
                        contactEmail={selectedPassenger.email || undefined}
                        onSuccess={() => {
                          // Refresh communication log
                        }}
                      />
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Communication History
                      </h4>
                      <CommunicationLog
                        entityType="passenger"
                        entityId={selectedPassenger.id}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 flex justify-end border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
