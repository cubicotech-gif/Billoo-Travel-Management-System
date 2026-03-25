import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  Plus, Search, Building2, Star, X, Filter, Tag, MapPin
} from 'lucide-react'
import VendorForm from '@/components/VendorForm'

const VENDOR_TYPES = ['Airline', 'Hotel', 'Transport', 'Tour Operator', 'Visa Service', 'Insurance', 'Other']

interface Vendor {
  id: string
  name: string
  type: string
  service_types: string[]
  contact_person: string | null
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  address: string | null
  location: string | null
  country: string | null
  tags: string[]
  balance: number
  rating: number | null
  notes: string | null
  is_active: boolean
  is_deleted: boolean
  total_business: number
  total_paid: number
  total_pending: number
  total_profit: number
  credit_limit: number
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  'Airline': 'bg-sky-100 text-sky-800',
  'Hotel': 'bg-blue-100 text-blue-800',
  'Transport': 'bg-green-100 text-green-800',
  'Tour Operator': 'bg-orange-100 text-orange-800',
  'Visa Service': 'bg-purple-100 text-purple-800',
  'Insurance': 'bg-red-100 text-red-800',
  'Other': 'bg-gray-100 text-gray-800',
}

export default function Vendors() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [filterServiceType, setFilterServiceType] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterTag, setFilterTag] = useState('')
  const [filterLocation, setFilterLocation] = useState('')

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_deleted', false)
        .order('name', { ascending: true })

      if (error) throw error
      setVendors(data || [])
    } catch (error) {
      console.error('Error loading vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  // Collect unique values for filter dropdowns
  const allTags = [...new Set(vendors.flatMap(v => v.tags || []))].sort()
  const allLocations = [...new Set(vendors.map(v => v.location).filter(Boolean) as string[])].sort()

  const filteredVendors = vendors.filter(vendor => {
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        vendor.name.toLowerCase().includes(term) ||
        vendor.contact_person?.toLowerCase().includes(term) ||
        vendor.phone?.toLowerCase().includes(term) ||
        vendor.email?.toLowerCase().includes(term) ||
        vendor.type.toLowerCase().includes(term)
      if (!matchesSearch) return false
    }

    // Service type filter
    if (filterServiceType) {
      const types = vendor.service_types?.length ? vendor.service_types : [vendor.type]
      if (!types.includes(filterServiceType)) return false
    }

    // Status filter
    if (filterStatus === 'active' && !vendor.is_active) return false
    if (filterStatus === 'inactive' && vendor.is_active) return false

    // Tag filter
    if (filterTag && !(vendor.tags || []).includes(filterTag)) return false

    // Location filter
    if (filterLocation && vendor.location !== filterLocation) return false

    return true
  })

  const hasActiveFilters = filterServiceType || filterStatus !== 'all' || filterTag || filterLocation

  const clearFilters = () => {
    setFilterServiceType('')
    setFilterStatus('all')
    setFilterTag('')
    setFilterLocation('')
  }

  // Summary stats
  const totalPending = filteredVendors.reduce((s, v) => s + v.total_pending, 0)
  const totalBusiness = filteredVendors.reduce((s, v) => s + v.total_business, 0)
  const activeCount = filteredVendors.filter(v => v.is_active).length

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
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="mt-1 text-sm text-gray-600">
            {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} &middot; {activeCount} active
          </p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Vendor
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-700">Total Business</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalBusiness)}</p>
        </div>
        <div className={`card border ${totalPending > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-sm font-medium ${totalPending > 0 ? 'text-red-700' : 'text-green-700'}`}>Total Pending</p>
          <p className={`text-2xl font-bold ${totalPending > 0 ? 'text-red-900' : 'text-green-900'}`}>{formatCurrency(totalPending)}</p>
        </div>
        <div className="card bg-purple-50 border border-purple-200">
          <p className="text-sm font-medium text-purple-700">Active Vendors</p>
          <p className="text-2xl font-bold text-purple-900">{activeCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, contact, phone, email, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${hasActiveFilters ? 'btn-primary' : 'btn-secondary'} flex items-center`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-white text-primary-600 text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {[filterServiceType, filterStatus !== 'all', filterTag, filterLocation].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
              <select
                value={filterServiceType}
                onChange={(e) => setFilterServiceType(e.target.value)}
                className="input text-sm"
              >
                <option value="">All Types</option>
                {VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                className="input text-sm"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tag</label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="input text-sm"
              >
                <option value="">All Tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="input text-sm"
              >
                <option value="">All Locations</option>
                {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-800">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vendor Table */}
      <div className="card overflow-hidden">
        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No vendors found</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:text-primary-800">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Types</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Business</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVendors.map(vendor => {
                  const serviceTypes = vendor.service_types?.length ? vendor.service_types : [vendor.type]
                  return (
                    <tr
                      key={vendor.id}
                      onClick={() => navigate(`/vendors/${vendor.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <Building2 className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{vendor.name}</p>
                            <p className="text-sm text-gray-500 truncate">
                              {vendor.contact_person || vendor.phone || vendor.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {serviceTypes.map(t => (
                            <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t] || TYPE_COLORS['Other']}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                        {(vendor.tags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {vendor.tags.map(tag => (
                              <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                <Tag className="w-3 h-3 mr-0.5" />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {vendor.location || vendor.country ? (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                            {[vendor.location, vendor.country].filter(Boolean).join(', ')}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(vendor.total_business)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <span className={vendor.total_pending > 0 ? 'text-red-600' : 'text-green-600'}>
                          {formatCurrency(vendor.total_pending)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {vendor.rating ? (
                          <div className="flex items-center justify-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-sm font-medium text-gray-700">{vendor.rating}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vendor.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vendor Form Modal */}
      {showAddForm && (
        <VendorForm
          onSuccess={() => {
            setShowAddForm(false)
            loadVendors()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  )
}
