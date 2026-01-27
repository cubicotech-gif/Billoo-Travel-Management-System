import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  Send,
  Hotel,
  Plane,
  Car,
  FileText,
  Shield,
  MapPin,
  Package,
  AlertTriangle
} from 'lucide-react'
import type { Database } from '@/types/database'

type Query = Database['public']['Tables']['queries']['Row']
type QueryService = Database['public']['Tables']['query_services']['Row']
type QueryServiceInsert = Database['public']['Tables']['query_services']['Insert']
type Vendor = Database['public']['Tables']['vendors']['Row']

interface QueryWorkspaceProps {
  query: Query
  onClose: () => void
  onUpdate: () => void
}

const SERVICE_TYPES = ['Hotel', 'Flight', 'Transport', 'Visa', 'Insurance', 'Tours', 'Other'] as const
type ServiceType = typeof SERVICE_TYPES[number]

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  Hotel: <Hotel className="w-5 h-5" />,
  Flight: <Plane className="w-5 h-5" />,
  Transport: <Car className="w-5 h-5" />,
  Visa: <FileText className="w-5 h-5" />,
  Insurance: <Shield className="w-5 h-5" />,
  Tours: <MapPin className="w-5 h-5" />,
  Other: <Package className="w-5 h-5" />
}

export default function QueryWorkspace({ query, onClose, onUpdate }: QueryWorkspaceProps) {
  const [services, setServices] = useState<QueryService[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingService, setEditingService] = useState<QueryService | null>(null)
  const [showVendorModal, setShowVendorModal] = useState(false)

  const [serviceForm, setServiceForm] = useState<QueryServiceInsert>({
    query_id: query.id,
    service_type: 'Hotel',
    vendor_id: null,
    vendor_name: '',
    service_description: '',
    city: '',
    service_date: null,
    purchase_price: 0,
    selling_price: 0,
    booking_reference: '',
    status: 'Draft',
    notes: ''
  })

  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    type: 'Hotel',
    contact_person: '',
    phone: '',
    email: '',
    is_active: true
  })

  useEffect(() => {
    loadData()
  }, [query.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('query_services')
        .select('*')
        .eq('query_id', query.id)
        .order('created_at', { ascending: false })

      if (servicesError) throw servicesError
      setServices(servicesData || [])

      // Load active vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (vendorsError) throw vendorsError
      setVendors(vendorsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!serviceForm.service_description.trim()) {
      alert('Please enter service description')
      return
    }

    if ((serviceForm.selling_price || 0) < (serviceForm.purchase_price || 0)) {
      const confirm = window.confirm(
        'Warning: Selling price is lower than purchase price. This will result in a loss. Continue?'
      )
      if (!confirm) return
    }

    try {
      setSaving(true)

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('query_services')
          .update(serviceForm)
          .eq('id', editingService.id)

        if (error) throw error
        alert('Service updated successfully')
      } else {
        // Add new service
        const { error } = await supabase
          .from('query_services')
          .insert([serviceForm])

        if (error) throw error
        alert('Service added successfully')
      }

      // Reset form
      setServiceForm({
        query_id: query.id,
        service_type: 'Hotel',
        vendor_id: null,
        vendor_name: '',
        service_description: '',
        city: '',
        service_date: null,
        purchase_price: 0,
        selling_price: 0,
        booking_reference: '',
        status: 'Draft',
        notes: ''
      })
      setEditingService(null)
      loadData()
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const handleEditService = (service: QueryService) => {
    setEditingService(service)
    setServiceForm({
      query_id: service.query_id,
      service_type: service.service_type,
      vendor_id: service.vendor_id,
      vendor_name: service.vendor_name || '',
      service_description: service.service_description,
      city: service.city || '',
      service_date: service.service_date,
      purchase_price: service.purchase_price,
      selling_price: service.selling_price,
      booking_reference: service.booking_reference || '',
      status: service.status,
      notes: service.notes || ''
    })
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return

    try {
      const { error } = await supabase
        .from('query_services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error
      alert('Service deleted successfully')
      loadData()
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Failed to delete service')
    }
  }

  const handleVendorChange = (vendorId: string) => {
    const selectedVendor = vendors.find(v => v.id === vendorId)
    setServiceForm({
      ...serviceForm,
      vendor_id: vendorId,
      vendor_name: selectedVendor?.name || ''
    })
  }

  const handleAddNewVendor = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      const { data, error } = await supabase
        .from('vendors')
        .insert([newVendorForm])
        .select()
        .single()

      if (error) throw error

      alert('Vendor added successfully')
      setShowVendorModal(false)
      setNewVendorForm({
        name: '',
        type: 'Hotel',
        contact_person: '',
        phone: '',
        email: '',
        is_active: true
      })

      // Reload vendors and select the new one
      await loadData()
      if (data) {
        setServiceForm({
          ...serviceForm,
          vendor_id: data.id,
          vendor_name: data.name
        })
      }
    } catch (error) {
      console.error('Error adding vendor:', error)
      alert('Failed to add vendor')
    } finally {
      setSaving(false)
    }
  }

  const handleSendProposal = async () => {
    if (services.length === 0) {
      alert('Please add at least one service before sending proposal')
      return
    }

    if (!window.confirm('Change query status to "Proposal Sent"?')) return

    try {
      const { error } = await supabase
        .from('queries')
        .update({ status: 'Quoted' })
        .eq('id', query.id)

      if (error) throw error
      alert('Proposal sent! Query status updated to "Quoted"')
      onUpdate()
      onClose()
    } catch (error) {
      console.error('Error updating query status:', error)
      alert('Failed to update query status')
    }
  }

  // Calculate totals
  const totalServices = services.length
  const totalPurchaseCost = services.reduce((sum, s) => sum + s.purchase_price, 0)
  const totalSellingPrice = services.reduce((sum, s) => sum + s.selling_price, 0)
  const totalProfit = totalSellingPrice - totalPurchaseCost
  const profitMargin = totalSellingPrice > 0 ? (totalProfit / totalSellingPrice * 100) : 0
  const totalPassengers = (query.adults || 0) + (query.children || 0) + (query.infants || 0)
  const perPassengerCost = totalPassengers > 0 ? totalSellingPrice / totalPassengers : 0

  // Calculate profit for form
  const formProfit = (serviceForm.selling_price || 0) - (serviceForm.purchase_price || 0)
  const formProfitMargin = (serviceForm.selling_price || 0) > 0
    ? (formProfit / (serviceForm.selling_price || 1) * 100)
    : 0

  // Filter vendors by service type if possible
  const filteredVendors = vendors.filter(v => {
    // Map service types to vendor types
    const typeMap: Record<string, string[]> = {
      'Hotel': ['Hotel'],
      'Flight': ['Airline'],
      'Transport': ['Transport'],
      'Visa': ['Visa Service'],
      'Insurance': ['Insurance'],
      'Tours': ['Tour Operator'],
      'Other': ['Other']
    }
    const matchingTypes = typeMap[serviceForm.service_type] || []
    return matchingTypes.length === 0 || matchingTypes.includes(v.type)
  })

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-start justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="inline-block w-full max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all my-8">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-primary-600 to-accent-purple px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-2xl font-bold">Query #{query.query_number}</h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span>Client: {query.client_name}</span>
                  <span>•</span>
                  <span>Destination: {query.destination}</span>
                  <span>•</span>
                  <span>Passengers: {query.adults}A / {query.children}C / {query.infants}I</span>
                  {query.travel_date && (
                    <>
                      <span>•</span>
                      <span>Travel: {new Date(query.travel_date).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
                {query.service_type && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                      {query.service_type}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* ADD SERVICE FORM */}
            <div className="bg-white dark:bg-gray-700 rounded-lg border-2 border-primary-200 dark:border-primary-800 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingService ? 'Edit Service' : 'Add Service'}
              </h3>

              <form onSubmit={handleAddService} className="space-y-4">
                {/* Row 1: Service Type & Vendor */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Service Type *
                    </label>
                    <select
                      value={serviceForm.service_type}
                      onChange={(e) => setServiceForm({ ...serviceForm, service_type: e.target.value as ServiceType })}
                      className="input"
                      required
                    >
                      {SERVICE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Vendor *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={serviceForm.vendor_id || ''}
                        onChange={(e) => handleVendorChange(e.target.value)}
                        className="input flex-1"
                        required
                      >
                        <option value="">Select Vendor</option>
                        {filteredVendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name} ({vendor.type})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowVendorModal(true)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                        title="Add New Vendor"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: City & Service Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City/Location
                    </label>
                    <input
                      type="text"
                      value={serviceForm.city || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, city: e.target.value })}
                      placeholder="e.g., Makkah, Madinah, Jeddah"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Service Date
                    </label>
                    <input
                      type="date"
                      value={serviceForm.service_date || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value || null })}
                      className="input"
                    />
                  </div>
                </div>

                {/* Row 3: Service Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Description *
                  </label>
                  <textarea
                    rows={2}
                    value={serviceForm.service_description}
                    onChange={(e) => setServiceForm({ ...serviceForm, service_description: e.target.value })}
                    placeholder="e.g., Hilton Makkah - 5 Star Hotel, near Haram, 3 nights"
                    className="input"
                    required
                  />
                </div>

                {/* Row 4: Prices */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Purchase Price (PKR) *
                    </label>
                    <p className="text-xs text-gray-500 mb-1">What vendor charges us</p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.purchase_price}
                      onChange={(e) => setServiceForm({ ...serviceForm, purchase_price: parseFloat(e.target.value) || 0 })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Selling Price (PKR) *
                    </label>
                    <p className="text-xs text-gray-500 mb-1">What we quote to customer</p>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceForm.selling_price}
                      onChange={(e) => setServiceForm({ ...serviceForm, selling_price: parseFloat(e.target.value) || 0 })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Profit
                    </label>
                    <p className="text-xs text-gray-500 mb-1">Auto-calculated</p>
                    <div className={`input font-bold ${formProfit > 0 ? 'text-green-600' : formProfit < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      Rs {formProfit.toLocaleString('en-IN')} ({formProfitMargin.toFixed(1)}%)
                    </div>
                  </div>
                </div>

                {/* Warning for negative profit */}
                {formProfit < 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Warning: Selling price is lower than purchase price. This will result in a loss.
                    </p>
                  </div>
                )}

                {/* Row 5: Booking Reference & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Booking Reference
                    </label>
                    <input
                      type="text"
                      value={serviceForm.booking_reference || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, booking_reference: e.target.value })}
                      placeholder="PNR, Booking code, Confirmation #"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={serviceForm.notes || ''}
                      onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {editingService ? 'Update Service' : 'Add Service'}
                  </button>
                  {editingService && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(null)
                        setServiceForm({
                          query_id: query.id,
                          service_type: 'Hotel',
                          vendor_id: null,
                          vendor_name: '',
                          service_description: '',
                          city: '',
                          service_date: null,
                          purchase_price: 0,
                          selling_price: 0,
                          booking_reference: '',
                          status: 'Draft',
                          notes: ''
                        })
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* SERVICES LIST */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Added Services ({services.length})
              </h3>

              {services.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No services added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-primary-600 dark:text-primary-400">
                            {SERVICE_ICONS[service.service_type]}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {service.service_description}
                            </h4>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                              {service.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditService(service)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <span className="font-medium">Vendor:</span> {service.vendor_name}
                        </div>
                        {service.city && (
                          <div>
                            <span className="font-medium">City:</span> {service.city}
                          </div>
                        )}
                        {service.service_date && (
                          <div>
                            <span className="font-medium">Date:</span> {new Date(service.service_date).toLocaleDateString()}
                          </div>
                        )}
                        {service.booking_reference && (
                          <div>
                            <span className="font-medium">Booking Ref:</span> {service.booking_reference}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Purchase Price</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Rs {service.purchase_price.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Selling Price</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Rs {service.selling_price.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Profit</p>
                          <p className={`text-sm font-bold ${
                            service.profit > 0 ? 'text-green-600 dark:text-green-400' :
                            service.profit < 0 ? 'text-red-600 dark:text-red-400' :
                            'text-gray-600 dark:text-gray-400'
                          }`}>
                            Rs {service.profit.toLocaleString('en-IN')} ({service.profit_margin.toFixed(1)}%)
                          </p>
                        </div>
                      </div>

                      {service.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-sm italic text-gray-600 dark:text-gray-400">{service.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PACKAGE SUMMARY */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border-2 border-green-200 dark:border-green-800 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                PACKAGE SUMMARY
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Services</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalServices}</p>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Purchase Cost</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    Rs {totalPurchaseCost.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Selling Price</p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    Rs {totalSellingPrice.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Profit</p>
                  <p className={`text-2xl font-bold ${
                    totalProfit > 0 ? 'text-green-600 dark:text-green-400' :
                    totalProfit < 0 ? 'text-red-600 dark:text-red-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    Rs {totalProfit.toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ({profitMargin.toFixed(2)}% margin)
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Per Passenger Cost</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    Rs {perPassengerCost.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ({totalPassengers} passenger{totalPassengers !== 1 ? 's' : ''})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onUpdate()
                alert('Services saved successfully')
              }}
              className="btn btn-secondary"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Draft
            </button>
            <button
              onClick={handleSendProposal}
              className="btn btn-primary"
              disabled={services.length === 0}
            >
              <Send className="w-5 h-5 mr-2" />
              Send Proposal
            </button>
          </div>
        </div>
      </div>

      {/* NEW VENDOR MODAL */}
      {showVendorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Add Vendor</h3>
                <button
                  onClick={() => setShowVendorModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddNewVendor} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={newVendorForm.name}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  value={newVendorForm.type}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, type: e.target.value })}
                  className="input"
                  required
                >
                  <option value="Hotel">Hotel</option>
                  <option value="Airline">Airline</option>
                  <option value="Transport">Transport</option>
                  <option value="Visa Service">Visa Service</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Tour Operator">Tour Operator</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={newVendorForm.contact_person}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, contact_person: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newVendorForm.phone}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newVendorForm.email}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  Add Vendor
                </button>
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
