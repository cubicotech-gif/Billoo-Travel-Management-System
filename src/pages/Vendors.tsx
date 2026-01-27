import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Building2, Mail, Phone, Star, FileText, DollarSign, X } from 'lucide-react'
import VendorLedger from '@/components/VendorLedger'
import VendorPayment from '@/components/VendorPayment'

interface Vendor {
  id: string
  name: string
  type: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  balance: number
  rating: number | null
  notes: string | null
  created_at: string
}

const VENDOR_TYPES = ['Airline', 'Hotel', 'Transport', 'Tour Operator', 'Visa Service', 'Insurance', 'Other']

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [activeTab, setActiveTab] = useState<'ledger' | 'payment'>('ledger')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    type: 'Hotel',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    balance: 0,
    rating: 5,
    notes: '',
  })

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setVendors(data || [])
    } catch (error) {
      console.error('Error loading vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from('vendors').insert([formData])

      if (error) throw error

      setShowModal(false)
      setFormData({
        name: '',
        type: 'Hotel',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        balance: 0,
        rating: 5,
        notes: '',
      })
      loadVendors()
    } catch (error) {
      console.error('Error creating vendor:', error)
      alert('Failed to create vendor')
    }
  }

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage suppliers and service providers
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Vendor
        </button>
      </div>

      <div className="card">
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
                  <p className="text-sm text-gray-500">{vendor.type}</p>
                </div>
              </div>
              {vendor.rating && (
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm font-medium text-gray-700">{vendor.rating}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {vendor.contact_person && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Contact:</span> {vendor.contact_person}
                </p>
              )}
              {vendor.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  {vendor.email}
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {vendor.phone}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Balance</span>
                <span className={`text-lg font-bold ${vendor.balance > 0 ? 'text-red-600' : vendor.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  ₹{Math.abs(vendor.balance).toLocaleString('en-IN')}
                  {vendor.balance > 0 && ' (Due)'}
                  {vendor.balance < 0 && ' (Credit)'}
                </span>
              </div>
            </div>

            {vendor.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{vendor.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedVendor(vendor)
                  setActiveTab('ledger')
                  setShowLedgerModal(true)
                }}
                className="btn btn-secondary btn-sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Ledger
              </button>
              <button
                onClick={() => {
                  setSelectedVendor(vendor)
                  setShowPaymentModal(true)
                }}
                className="btn btn-primary btn-sm"
                disabled={vendor.balance <= 0}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Pay Vendor
              </button>
            </div>
          </div>
        ))}

        {filteredVendors.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No vendors found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Vendor</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="input"
                      >
                        {VENDOR_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
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
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rating (1-5)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.rating}
                        onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                        className="input"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                    Add Vendor
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

      {/* Ledger Modal */}
      {showLedgerModal && selectedVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowLedgerModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              {/* Header */}
              <div className="bg-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-6 h-6 text-white" />
                    <div className="text-white">
                      <h3 className="text-xl font-semibold">{selectedVendor.name}</h3>
                      <p className="text-sm text-purple-100">{selectedVendor.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLedgerModal(false)}
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
                    onClick={() => setActiveTab('ledger')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'ledger'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline-block mr-2" />
                    Ledger & Transactions
                  </button>
                  <button
                    onClick={() => setActiveTab('payment')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'payment'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 inline-block mr-2" />
                    Record Payment
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {activeTab === 'ledger' && (
                  <VendorLedger
                    vendorId={selectedVendor.id}
                    vendorName={selectedVendor.name}
                    onBalanceUpdate={(balance) => {
                      // Update vendor balance in local state
                      setVendors((prev) =>
                        prev.map((v) =>
                          v.id === selectedVendor.id ? { ...v, balance } : v
                        )
                      )
                      setSelectedVendor({ ...selectedVendor, balance })
                    }}
                  />
                )}

                {activeTab === 'payment' && (
                  <VendorPayment
                    vendorId={selectedVendor.id}
                    vendorName={selectedVendor.name}
                    outstandingBalance={selectedVendor.balance}
                    onSuccess={() => {
                      loadVendors()
                      setActiveTab('ledger')
                    }}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end">
                <button onClick={() => setShowLedgerModal(false)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal (Quick Access) */}
      {showPaymentModal && selectedVendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowPaymentModal(false)}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="bg-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Record Payment</h3>
                    <p className="text-sm text-purple-100 mt-1">{selectedVendor.name}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-white hover:text-gray-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                <VendorPayment
                  vendorId={selectedVendor.id}
                  vendorName={selectedVendor.name}
                  outstandingBalance={selectedVendor.balance}
                  onSuccess={() => {
                    loadVendors()
                    setShowPaymentModal(false)
                  }}
                  onCancel={() => setShowPaymentModal(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
