import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, User, Mail, Phone, CreditCard, Calendar, FileText, X, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import DocumentUpload from '@/components/DocumentUpload'
import DocumentList from '@/components/DocumentList'
import TravelHistory from '@/components/TravelHistory'

interface Passenger {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  passport_number: string | null
  passport_expiry: string | null
  date_of_birth: string | null
  nationality: string | null
  notes: string | null
  created_at: string
}

export default function Passengers() {
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'documents' | 'travel'>('info')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    passport_number: '',
    passport_expiry: '',
    date_of_birth: '',
    nationality: '',
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
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        passport_number: '',
        passport_expiry: '',
        date_of_birth: '',
        nationality: '',
        notes: '',
      })
      loadPassengers()
    } catch (error) {
      console.error('Error creating passenger:', error)
      alert('Failed to create passenger')
    }
  }

  const handleViewDetails = (passenger: Passenger) => {
    setSelectedPassenger(passenger)
    setActiveTab('info')
    setShowDetailModal(true)
  }

  const filteredPassengers = passengers.filter((passenger) =>
    `${passenger.first_name} ${passenger.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    passenger.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    passenger.phone.includes(searchTerm) ||
    passenger.passport_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900">Passengers</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage passenger profiles and information
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Passenger
        </button>
      </div>

      <div className="card">
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search passengers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPassengers.map((passenger) => (
          <div
            key={passenger.id}
            onClick={() => handleViewDetails(passenger)}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {passenger.first_name} {passenger.last_name}
                </h3>
                {passenger.nationality && (
                  <p className="text-sm text-gray-500">{passenger.nationality}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {passenger.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {passenger.email}
                </div>
              )}
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="w-4 h-4 mr-2" />
                {passenger.phone}
              </div>
              {passenger.passport_number && (
                <div className="flex items-center text-sm text-gray-600">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {passenger.passport_number}
                  {passenger.passport_expiry && (
                    <span className="ml-2 text-xs text-gray-500">
                      (Exp: {format(new Date(passenger.passport_expiry), 'MMM yyyy')})
                    </span>
                  )}
                </div>
              )}
              {passenger.date_of_birth && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  DOB: {format(new Date(passenger.date_of_birth), 'MMM dd, yyyy')}
                </div>
              )}
            </div>

            {passenger.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{passenger.notes}</p>
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

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Passenger</h3>

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
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        value={formData.passport_number}
                        onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Passport Expiry
                      </label>
                      <input
                        type="date"
                        value={formData.passport_expiry}
                        onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                        className="input"
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
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" className="btn btn-primary">
                    Add Passenger
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

      {/* Passenger Detail Modal */}
      {showDetailModal && selectedPassenger && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDetailModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-primary-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="text-white">
                      <h3 className="text-xl font-semibold">
                        {selectedPassenger.first_name} {selectedPassenger.last_name}
                      </h3>
                      <p className="text-sm text-primary-100">{selectedPassenger.nationality}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'info'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <User className="w-4 h-4 inline-block mr-2" />
                    Information
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
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
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'travel'
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4 inline-block mr-2" />
                    Travel History
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="flex items-center text-gray-900">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedPassenger.email || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <div className="flex items-center text-gray-900">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedPassenger.phone}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Passport Number
                        </label>
                        <div className="flex items-center text-gray-900">
                          <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedPassenger.passport_number || 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Passport Expiry
                        </label>
                        <div className="flex items-center text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedPassenger.passport_expiry
                            ? format(new Date(selectedPassenger.passport_expiry), 'MMM dd, yyyy')
                            : 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <div className="flex items-center text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {selectedPassenger.date_of_birth
                            ? format(new Date(selectedPassenger.date_of_birth), 'MMM dd, yyyy')
                            : 'Not provided'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nationality
                        </label>
                        <div className="text-gray-900">
                          {selectedPassenger.nationality || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    {selectedPassenger.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                          {selectedPassenger.notes}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Created At
                      </label>
                      <div className="text-gray-600 text-sm">
                        {format(new Date(selectedPassenger.created_at), 'PPpp')}
                      </div>
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
