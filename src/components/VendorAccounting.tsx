import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Building2,
  ChevronDown,
  Eye,
  User,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Database } from '@/types/database'
import VendorLedgerFull from './VendorLedgerFull'

type Vendor = Database['public']['Tables']['vendors']['Row']

export default function VendorAccounting() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all')
  const [subTab, setSubTab] = useState<'vendor_accounts' | 'total_accounts'>('vendor_accounts')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTypeIcon = () => {
    // Return appropriate icon based on vendor type
    return <Building2 className="w-6 h-6" />
  }

  const handleVendorSelect = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setViewMode('single')
  }

  const handleBackToAll = () => {
    setSelectedVendor(null)
    setViewMode('all')
  }

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  // If viewing a specific vendor ledger
  if (viewMode === 'single' && selectedVendor) {
    return (
      <VendorLedgerFull
        vendor={selectedVendor}
        onBack={handleBackToAll}
        onRefresh={loadVendors}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="card p-0 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setSubTab('vendor_accounts')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                subTab === 'vendor_accounts'
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Vendor Accounts
            </button>
            <button
              onClick={() => setSubTab('total_accounts')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                subTab === 'total_accounts'
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Total Accounts
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab Content */}
      {subTab === 'vendor_accounts' ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Vendor Accounting</h2>

            <div className="space-y-4">
              {/* Vendor Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vendor
                </label>
                <div className="relative">
                  <select
                    value={selectedVendor?.id || ''}
                    onChange={(e) => {
                      const vendor = vendors.find(v => v.id === e.target.value)
                      if (vendor) {
                        handleVendorSelect(vendor)
                      }
                    }}
                    className="input pr-10 appearance-none"
                  >
                    <option value="">Choose a vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name} - {vendor.type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-sm font-medium text-gray-500">OR</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* View All Button */}
              <button
                onClick={() => setViewMode('all')}
                className="w-full btn btn-secondary"
              >
                <Building2 className="w-5 h-5 mr-2" />
                View All Vendors
              </button>
            </div>
          </div>

          {/* All Vendors Grid */}
          {viewMode === 'all' && (
            <>
              {/* Search */}
              <div className="card">
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>

              {/* Vendor Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="card hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-purple-300"
                  >
                    {/* Vendor Header */}
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        {getTypeIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate">
                          {vendor.name}
                        </h3>
                        <p className="text-sm text-gray-600">{vendor.type}</p>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Financial Summary</p>

                        <div className="space-y-2">
                          {/* Total Business */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Total Business:</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatCurrency(vendor.total_business)}
                            </span>
                          </div>

                          {/* Total Paid */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Total Paid:</span>
                            <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                              {formatCurrency(vendor.total_paid)}
                              {vendor.total_paid > 0 && <span className="text-green-500">✓</span>}
                            </span>
                          </div>

                          {/* Pending */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Pending:</span>
                            <span className={`text-sm font-semibold flex items-center gap-1 ${
                              vendor.total_pending > 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {formatCurrency(vendor.total_pending)}
                              {vendor.total_pending > 0 && <AlertCircle className="w-3 h-3" />}
                            </span>
                          </div>

                          {/* Profit */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-600">Profit:</span>
                            <span className="text-sm font-bold text-purple-600 flex items-center gap-1">
                              {formatCurrency(vendor.total_profit)}
                              {vendor.total_business > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({((vendor.total_profit / vendor.total_business) * 100).toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleVendorSelect(vendor)}
                        className="btn btn-primary btn-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Ledger
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to vendor profile
                          // This could open a modal or navigate to a profile page
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <User className="w-4 h-4 mr-1" />
                        Profile
                      </button>
                    </div>
                  </div>
                ))}

                {filteredVendors.length === 0 && (
                  <div className="col-span-full card text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No vendors found</p>
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search' : 'Add vendors to get started'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        // Total Accounts Tab (Placeholder)
        <div className="card text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Total Accounts</h3>
          <p className="text-gray-600 mb-4">
            This section is coming soon. It will show consolidated accounting reports across all vendors.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg">
            <DollarSign className="w-4 h-4" />
            <span>Feature under development</span>
          </div>
        </div>
      )}
    </div>
  )
}
