import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Eye,
  RotateCcw
} from 'lucide-react'
import { Database } from '@/types/database'
import VendorForm from '@/components/VendorForm'
import VendorProfile from '@/components/VendorProfile'

type Vendor = Database['public']['Tables']['vendors']['Row']

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'deleted'>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const [showForm, setShowForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    vendor: Vendor | null
    isRestore: boolean
  }>({
    show: false,
    vendor: null,
    isRestore: false
  })

  const VENDOR_TYPES = [
    'Hotel',
    'Airline',
    'Transport',
    'Visa Agent',
    'Tour Operator',
    'Insurance',
    'Other'
  ]

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

  const handleAddVendor = () => {
    setEditingVendor(null)
    setShowForm(true)
  }

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setShowForm(true)
    setShowProfile(false)
  }

  const handleViewProfile = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setShowProfile(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingVendor(null)
    loadVendors()
  }

  const handleDeleteClick = (vendor: Vendor) => {
    setDeleteConfirm({
      show: true,
      vendor,
      isRestore: false
    })
  }

  const handleRestoreClick = (vendor: Vendor) => {
    setDeleteConfirm({
      show: true,
      vendor,
      isRestore: true
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.vendor) return

    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          is_deleted: !deleteConfirm.isRestore,
          is_active: deleteConfirm.isRestore
        })
        .eq('id', deleteConfirm.vendor.id)

      if (error) throw error

      loadVendors()
      setDeleteConfirm({ show: false, vendor: null, isRestore: false })
    } catch (error) {
      console.error('Error updating vendor:', error)
      alert('Failed to update vendor. Please try again.')
    }
  }

  const filteredVendors = vendors.filter((vendor) => {
    // Apply status filter first
    if (filterStatus === 'active' && (!vendor.is_active || vendor.is_deleted)) return false
    if (filterStatus === 'inactive' && (vendor.is_active || vendor.is_deleted)) return false
    if (filterStatus === 'deleted' && !vendor.is_deleted) return false
    if (filterStatus === 'all' && vendor.is_deleted) return false

    // Apply type filter
    if (filterType !== 'all' && vendor.type !== filterType) return false

    // Apply search filter
    const search = searchTerm.toLowerCase()
    return (
      vendor.name.toLowerCase().includes(search) ||
      vendor.type.toLowerCase().includes(search) ||
      vendor.contact_person?.toLowerCase().includes(search) ||
      vendor.phone?.toLowerCase().includes(search) ||
      vendor.email?.toLowerCase().includes(search)
    )
  })

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Hotel': 'bg-blue-100 text-blue-800',
      'Airline': 'bg-sky-100 text-sky-800',
      'Transport': 'bg-green-100 text-green-800',
      'Visa Agent': 'bg-purple-100 text-purple-800',
      'Tour Operator': 'bg-orange-100 text-orange-800',
      'Insurance': 'bg-red-100 text-red-800',
      'Other': 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
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
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage suppliers and service providers
          </p>
        </div>
        <button onClick={handleAddVendor} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card space-y-4">
        {/* Search Bar */}
        <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
          <Search className="w-5 h-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name, type, contact person, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filters */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setFilterStatus('deleted')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'deleted'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Deleted
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {VENDOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="ml-auto text-sm text-gray-600">
            {filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'} found
          </div>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className={`card hover:shadow-lg transition-shadow ${
              vendor.is_deleted ? 'opacity-60 border-2 border-red-200' : ''
            }`}
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                  vendor.is_active && !vendor.is_deleted
                    ? 'bg-purple-100'
                    : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-6 h-6 ${
                    vendor.is_active && !vendor.is_deleted
                      ? 'text-purple-600'
                      : 'text-gray-400'
                  }`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{vendor.name}</h3>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(vendor.type)}`}>
                    {vendor.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              {vendor.contact_person && (
                <p className="text-sm text-gray-600 truncate">
                  <span className="font-medium">Contact:</span> {vendor.contact_person}
                </p>
              )}
              {vendor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{vendor.phone}</span>
                </div>
              )}
              {vendor.whatsapp_number && vendor.whatsapp_number !== vendor.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <MessageCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{vendor.whatsapp_number}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{vendor.email}</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="pt-4 border-t space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Total Paid</p>
                  <p className="font-semibold text-green-600">{formatCurrency(vendor.total_paid)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Pending</p>
                  <p className={`font-semibold ${vendor.total_pending > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {formatCurrency(vendor.total_pending)}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {vendor.is_deleted ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3 mr-1" />
                      Deleted
                    </span>
                  ) : vendor.is_active ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => handleViewProfile(vendor)}
                className="btn btn-secondary btn-sm text-xs"
                title="View Profile"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEditVendor(vendor)}
                className="btn btn-secondary btn-sm text-xs"
                disabled={vendor.is_deleted}
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              {vendor.is_deleted ? (
                <button
                  onClick={() => handleRestoreClick(vendor)}
                  className="btn btn-sm text-xs bg-green-600 hover:bg-green-700 text-white"
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleDeleteClick(vendor)}
                  className="btn btn-sm text-xs bg-red-600 hover:bg-red-700 text-white"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredVendors.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No vendors found</p>
            {searchTerm || filterStatus !== 'all' || filterType !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                  setFilterType('all')
                }}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            ) : (
              <button onClick={handleAddVendor} className="btn btn-primary">
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Vendor
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vendor Form Modal */}
      {showForm && (
        <VendorForm
          vendor={editingVendor}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingVendor(null)
          }}
        />
      )}

      {/* Vendor Profile Modal */}
      {showProfile && selectedVendor && (
        <VendorProfile
          vendor={selectedVendor}
          onEdit={() => handleEditVendor(selectedVendor)}
          onClose={() => {
            setShowProfile(false)
            setSelectedVendor(null)
          }}
        />
      )}

      {/* Delete/Restore Confirmation Modal */}
      {deleteConfirm.show && deleteConfirm.vendor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-5">
                <div className="flex items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                    deleteConfirm.isRestore ? 'bg-green-100' : 'bg-red-100'
                  } sm:mx-0 sm:h-10 sm:w-10`}>
                    {deleteConfirm.isRestore ? (
                      <RotateCcw className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="mt-0 ml-4 text-left">
                    <h3 className="text-lg font-medium text-gray-900">
                      {deleteConfirm.isRestore ? 'Restore Vendor' : 'Delete Vendor'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {deleteConfirm.isRestore ? (
                          <>
                            Are you sure you want to restore <strong>{deleteConfirm.vendor.name}</strong>?
                            <br /><br />
                            The vendor will be:
                            <br />• Marked as active
                            <br />• Available for new bookings
                            <br />• Visible in the active vendor list
                          </>
                        ) : (
                          <>
                            Are you sure you want to delete <strong>{deleteConfirm.vendor.name}</strong>?
                            <br /><br />
                            The vendor will be removed from the active list, but:
                            <br />✓ All transaction records will be preserved
                            <br />✓ You can restore this vendor later if needed
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirm({ show: false, vendor: null, isRestore: false })}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className={`btn w-full sm:w-auto ${
                    deleteConfirm.isRestore
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {deleteConfirm.isRestore ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Confirm Restore
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
