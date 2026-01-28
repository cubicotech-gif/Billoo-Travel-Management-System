import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Search, User, Mail, Phone, CreditCard, Calendar, FileText, X, 
  MapPin, MessageCircle, AlertCircle, Star, DollarSign, Package
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
  whatsapp_number: string | null
  alternate_phone: string | null
  cnic: string | null
  passport_number: string | null
  passport_expiry: string | null
  date_of_birth: string | null
  nationality: string | null
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'vip'>('all')
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    alternate_phone: '',
    cnic: '',
    passport_number: '',
    passport_expiry: '',
    date_of_birth: '',
    nationality: 'Pakistani',
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
      const { error } = await supabase.from('passengers').insert([formData])

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
      whatsapp_number: '',
      alternate_phone: '',
      cnic: '',
      passport_number: '',
      passport_expiry: '',
      date_of_birth: '',
      nationality: 'Pakistani',
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

  const filteredPassengers = passengers.filter((passenger) => {
    const matchesSearch =
      `${passenger.first_name} ${passenger.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.phone.includes(searchTerm) ||
      passenger.cnic?.includes(searchTerm) ||
      passenger.passport_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && passenger.is_active) ||
      (filterStatus === 'inactive' && !passenger.is_active) ||
      (filterStatus === 'vip' && passenger.is_vip)

    return matchesSearch && matchesFilter
  })

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
          <h1 className="text-2xl font-bold text-gray-900">Passengers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage passenger profiles, documents, and travel history
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Passenger
        </button>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, phone, CNIC, passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({passengers.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({passengers.filter(p => p.is_active).length})
            </button>
            <button
              onClick={() => setFilterStatus('vip')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'vip'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star className="w-4 h-4 inline-block mr-1" />
              VIP ({passengers.filter(p => p.is_vip).length})
            </button>
          </div>
        </div>
      </div>

      {/* Passengers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPassengers.map((passenger) => (
          <div
            key={passenger.id}
            onClick={() => handleViewDetails(passenger)}
            className="card hover:shadow-lg transition-all cursor-pointer relative"
          >
            {/* VIP Badge */}
            {passenger.is_vip && (
              <div className="absolute top-4 right-4">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>
            )}

            {/* Status Badge */}
            {!passenger.is_active && (
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                  Inactive
                </span>
              </div>
            )}

            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${
                passenger.is_vip ? 'bg-yellow-100' : 'bg-primary-100'
              }`}>
                <User className={`w-6 h-6 ${passenger.is_vip ? 'text-yellow-600' : 'text-primary-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {passenger.first_name} {passenger.last_name}
                </h3>
                {passenger.cnic && (
                  <p className="text-xs text-gray-500">CNIC: {passenger.cnic}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                {passenger.phone}
              </div>
              {passenger.whatsapp_number && (
                <div className="flex items-center text-sm text-green-600">
                  <MessageCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {passenger.whatsapp_number}
                </div>
              )}
              {passenger.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{passenger.email}</span>
                </div>
              )}
              {passenger.passport_number && (
                <div className="flex items-center text-sm text-gray-600">
                  <CreditCard className="w-4 h-4 mr-2 flex-shrink-0" />
                  {passenger.passport_number}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Trips</p>
                <p className="text-lg font-bold text-gray-900">
                  <Package className="w-4 h-4 inline-block mr-1" />
                  {passenger.total_trips}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-sm font-bold text-green-600">
                  Rs {passenger.total_revenue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className={`text-sm font-bold ${
                  passenger.outstanding_balance > 0 ? 'text-red-600' : 'text-gray-400'
                }`}>
                  Rs {passenger.outstanding_balance.toLocaleString()}
                </p>
              </div>
            </div>

            {passenger.outstanding_balance > 0 && (
              <div className="mt-3 flex items-center text-xs text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                Payment pending
              </div>
            )}
          </div>
        ))}

        {filteredPassengers.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No passengers found</p>
          </div>
        )}
      </div>

      {/* Add Passenger Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add New Passenger</h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Basic Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="input"
                          placeholder="Muhammad"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="input"
                          placeholder="Ahmed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CNIC Number
                        </label>
                        <input
                          type="text"
                          value={formData.cnic}
                          onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                          className="input"
                          placeholder="42101-1234567-8"
                          maxLength={15}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          className="input"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nationality
                        </label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="input"
                          placeholder="Pakistani"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Primary Phone *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="input"
                          placeholder="0300-1234567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          WhatsApp Number
                        </label>
                        <input
                          type="tel"
                          value={formData.whatsapp_number}
                          onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                          className="input"
                          placeholder="0321-9876543"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alternate Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.alternate_phone}
                          onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                          className="input"
                          placeholder="021-12345678"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="input"
                          placeholder="passenger@email.com"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="input"
                          rows={2}
                          placeholder="House #, Street, Area, City"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passport Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Passport Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Passport Number
                        </label>
                        <input
                          type="text"
                          value={formData.passport_number}
                          onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                          className="input"
                          placeholder="AA1234567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Passport Expiry Date
                        </label>
                        <input
                          type="date"
                          value={formData.passport_expiry}
                          onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Name
                        </label>
                        <input
                          type="text"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                          className="input"
                          placeholder="Relative/Friend Name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                          className="input"
                          placeholder="0300-1234567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Additional Settings</h4>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_vip}
                          onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          <Star className="w-4 h-4 inline-block text-yellow-500" /> Mark as VIP Customer
                        </span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active Customer</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input"
                      rows={3}
                      placeholder="Any additional notes about this passenger..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary w-full sm:w-auto sm:ml-3">
                    Save Passenger
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

      {/* Passenger Detail Modal - Keep existing implementation but add financial tab */}
      {showDetailModal && selectedPassenger && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mr-4">
                      <User className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {selectedPassenger.first_name} {selectedPassenger.last_name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {selectedPassenger.is_vip && (
                          <span className="flex items-center text-yellow-300 text-sm">
                            <Star className="w-4 h-4 mr-1 fill-yellow-300" />
                            VIP Customer
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedPassenger.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedPassenger.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowDetailModal(false)} className="text-white hover:text-gray-200">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'info'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4 inline-block mr-2" />
                    Information
                  </button>
                  <button
                    onClick={() => setActiveTab('financial')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'financial'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 inline-block mr-2" />
                    Financial Summary
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'documents'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline-block mr-2" />
                    Documents
                  </button>
                  <button
                    onClick={() => setActiveTab('travel')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'travel'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4 inline-block mr-2" />
                    Travel History
                  </button>
                  <button
                    onClick={() => setActiveTab('communications')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'communications'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 inline-block mr-2" />
                    Communications
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Primary Phone</label>
                          <div className="flex items-center text-gray-900">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {selectedPassenger.phone}
                          </div>
                        </div>

                        {selectedPassenger.whatsapp_number && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
                            <div className="flex items-center text-green-600">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              {selectedPassenger.whatsapp_number}
                            </div>
                          </div>
                        )}

                        {selectedPassenger.alternate_phone && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Alternate Phone</label>
                            <div className="flex items-center text-gray-900">
                              <Phone className="w-4 h-4 mr-2 text-gray-400" />
                              {selectedPassenger.alternate_phone}
                            </div>
                          </div>
                        )}

                        {selectedPassenger.email && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                            <div className="flex items-center text-gray-900">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {selectedPassenger.email}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Identity Information */}
                    <div className="pt-6 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Identity Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPassenger.cnic && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">CNIC Number</label>
                            <div className="flex items-center text-gray-900">
                              <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                              {selectedPassenger.cnic}
                            </div>
                          </div>
                        )}

                        {selectedPassenger.passport_number && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Passport Number</label>
                            <div className="flex items-center text-gray-900">
                              <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                              {selectedPassenger.passport_number}
                            </div>
                          </div>
                        )}

                        {selectedPassenger.passport_expiry && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Passport Expiry</label>
                            <div className="flex items-center text-gray-900">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {format(new Date(selectedPassenger.passport_expiry), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        )}

                        {selectedPassenger.date_of_birth && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Date of Birth</label>
                            <div className="flex items-center text-gray-900">
                              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                              {format(new Date(selectedPassenger.date_of_birth), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        )}

                        {selectedPassenger.nationality && (
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nationality</label>
                            <div className="text-gray-900">{selectedPassenger.nationality}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    {selectedPassenger.address && (
                      <div className="pt-6 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Address</h4>
                        <div className="flex items-start text-gray-900">
                          <MapPin className="w-4 h-4 mr-2 mt-1 text-gray-400 flex-shrink-0" />
                          <p>{selectedPassenger.address}</p>
                        </div>
                      </div>
                    )}

                    {/* Emergency Contact */}
                    {(selectedPassenger.emergency_contact_name || selectedPassenger.emergency_contact_phone) && (
                      <div className="pt-6 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedPassenger.emergency_contact_name && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
                              <div className="text-gray-900">{selectedPassenger.emergency_contact_name}</div>
                            </div>
                          )}
                          {selectedPassenger.emergency_contact_phone && (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Contact Phone</label>
                              <div className="flex items-center text-gray-900">
                                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                {selectedPassenger.emergency_contact_phone}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {selectedPassenger.notes && (
                      <div className="pt-6 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Notes</h4>
                        <div className="p-4 bg-blue-50 rounded-lg text-gray-900">
                          {selectedPassenger.notes}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'financial' && (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Package className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="text-sm text-blue-600 mb-1">Total Trips</p>
                        <p className="text-3xl font-bold text-blue-900">{selectedPassenger.total_trips}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <DollarSign className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-sm text-green-600 mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-900">
                          Rs {selectedPassenger.total_revenue.toLocaleString()}
                        </p>
                      </div>

                      <div className={`bg-gradient-to-br p-6 rounded-lg ${
                        selectedPassenger.outstanding_balance > 0
                          ? 'from-red-50 to-red-100'
                          : 'from-gray-50 to-gray-100'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <AlertCircle className={`w-8 h-8 ${
                            selectedPassenger.outstanding_balance > 0 ? 'text-red-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <p className={`text-sm mb-1 ${
                          selectedPassenger.outstanding_balance > 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          Outstanding Balance
                        </p>
                        <p className={`text-3xl font-bold ${
                          selectedPassenger.outstanding_balance > 0 ? 'text-red-900' : 'text-gray-400'
                        }`}>
                          Rs {selectedPassenger.outstanding_balance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Financial Breakdown - This will show travel history with financial details */}
                    <div className="pt-6 border-t">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Breakdown</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Detailed financial information is shown in the Travel History tab with complete trip-wise breakdown.
                      </p>
                      <button
                        onClick={() => setActiveTab('travel')}
                        className="btn btn-primary"
                      >
                        View Travel History & Financial Details
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Upload New Document
                      </h4>
                      <DocumentUpload
                        entityType="passenger"
                        entityId={selectedPassenger.id}
                        onUploadComplete={() => {
                          // Refresh document list
                        }}
                      />
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Uploaded Documents
                      </h4>
                      <DocumentList entityType="passenger" entityId={selectedPassenger.id} />
                    </div>
                  </div>
                )}

                {activeTab === 'travel' && (
                  <TravelHistory passengerId={selectedPassenger.id} />
                )}

                {activeTab === 'communications' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
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

                    <div className="pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
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

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
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
