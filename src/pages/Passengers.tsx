import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  Plus, Search, User, Phone, X,
  MessageCircle, AlertCircle, Tag, MapPin, Filter
} from 'lucide-react'

interface Passenger {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  whatsapp: string | null
  cnic: string | null
  gender: 'male' | 'female' | null
  city: string | null
  address: string | null
  country: string | null
  passport_number: string | null
  passport_expiry: string | null
  date_of_birth: string | null
  nationality: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  referred_by: string | null
  tags: string[]
  status: 'active' | 'inactive'
  notes: string | null
  created_at: string
  updated_at: string
}

// Computed from invoices join
interface PassengerWithFinancials extends Passenger {
  total_billed: number
  total_paid: number
  total_pending: number
  query_count: number
}

export default function Passengers() {
  const navigate = useNavigate()
  const [passengers, setPassengers] = useState<PassengerWithFinancials[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterCity, setFilterCity] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cnic: '',
    gender: '' as string,
    city: '',
    address: '',
    country: 'Pakistan',
    passport_number: '',
    passport_expiry: '',
    date_of_birth: '',
    nationality: 'Pakistani',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    referred_by: '',
    tags: [] as string[],
    status: 'active' as 'active' | 'inactive',
    notes: '',
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    loadPassengers()
  }, [])

  const loadPassengers = async () => {
    try {
      // Load passengers
      const { data: passengersData, error } = await supabase
        .from('passengers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Load financials: invoices linked to each passenger
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('passenger_id, amount, paid_amount')

      // Load query counts from query_passengers
      const { data: queryLinks } = await supabase
        .from('query_passengers')
        .select('passenger_id')

      const invoiceMap: Record<string, { billed: number; paid: number }> = {}
      for (const inv of invoiceData || []) {
        if (!inv.passenger_id) continue
        if (!invoiceMap[inv.passenger_id]) invoiceMap[inv.passenger_id] = { billed: 0, paid: 0 }
        invoiceMap[inv.passenger_id].billed += Number(inv.amount) || 0
        invoiceMap[inv.passenger_id].paid += Number(inv.paid_amount) || 0
      }

      const queryCountMap: Record<string, number> = {}
      for (const link of queryLinks || []) {
        queryCountMap[link.passenger_id] = (queryCountMap[link.passenger_id] || 0) + 1
      }

      const enriched: PassengerWithFinancials[] = (passengersData || []).map((p: any) => ({
        ...p,
        tags: p.tags || [],
        status: p.status || 'active',
        total_billed: invoiceMap[p.id]?.billed || 0,
        total_paid: invoiceMap[p.id]?.paid || 0,
        total_pending: (invoiceMap[p.id]?.billed || 0) - (invoiceMap[p.id]?.paid || 0),
        query_count: queryCountMap[p.id] || 0,
      }))

      setPassengers(enriched)
    } catch (error) {
      console.error('Error loading passengers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const insertData: any = { ...formData }
      // Clean empty strings to null
      if (!insertData.email) insertData.email = null
      if (!insertData.whatsapp) insertData.whatsapp = null
      if (!insertData.cnic) insertData.cnic = null
      if (!insertData.gender) insertData.gender = null
      if (!insertData.city) insertData.city = null
      if (!insertData.address) insertData.address = null
      if (!insertData.passport_number) insertData.passport_number = null
      if (!insertData.passport_expiry) insertData.passport_expiry = null
      if (!insertData.date_of_birth) insertData.date_of_birth = null
      if (!insertData.emergency_contact_name) insertData.emergency_contact_name = null
      if (!insertData.emergency_contact_phone) insertData.emergency_contact_phone = null
      if (!insertData.referred_by) insertData.referred_by = null
      if (!insertData.notes) insertData.notes = null

      const { error } = await supabase.from('passengers').insert([insertData])
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
      first_name: '', last_name: '', email: '', phone: '', whatsapp: '',
      cnic: '', gender: '', city: '', address: '', country: 'Pakistan',
      passport_number: '', passport_expiry: '', date_of_birth: '',
      nationality: 'Pakistani', emergency_contact_name: '', emergency_contact_phone: '',
      referred_by: '', tags: [], status: 'active', notes: '',
    })
    setTagInput('')
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  // Collect all unique cities and tags for filter dropdowns
  const allCities = [...new Set(passengers.map(p => p.city).filter(Boolean))] as string[]
  const allTags = [...new Set(passengers.flatMap(p => p.tags || []))]

  const filteredPassengers = passengers.filter((p) => {
    const matchesSearch =
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.cnic?.includes(searchTerm) ||
      p.passport_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      filterStatus === 'all' ||
      p.status === filterStatus

    const matchesCity = !filterCity || p.city === filterCity
    const matchesTag = !filterTag || (p.tags || []).includes(filterTag)

    return matchesSearch && matchesStatus && matchesCity && matchesTag
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
            {passengers.length} passengers &middot; {passengers.filter(p => p.total_pending > 0).length} with pending payments
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Passenger
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card space-y-4">
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
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === s
                    ? s === 'active' ? 'bg-green-600 text-white'
                      : s === 'inactive' ? 'bg-gray-600 text-white'
                      : 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? `All (${passengers.length})` :
                 s === 'active' ? `Active (${passengers.filter(p => p.status === 'active').length})` :
                 `Inactive (${passengers.filter(p => p.status === 'inactive').length})`}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters || filterCity || filterTag
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-4 h-4 inline-block mr-1" />
              Filters
              {(filterCity || filterTag) && (
                <span className="ml-1 bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {(filterCity ? 1 : 0) + (filterTag ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-200">
            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">All Cities</option>
                {allCities.sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tag</label>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="">All Tags</option>
                {allTags.sort().map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {(filterCity || filterTag) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setFilterCity(''); setFilterTag('') }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Passengers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passenger</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Queries</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPassengers.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/passengers/${p.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {p.first_name} {p.last_name}
                          {p.status === 'inactive' && (
                            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">Inactive</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.passport_number && <span>Passport: {p.passport_number}</span>}
                          {p.cnic && <span>{p.passport_number ? ' · ' : ''}CNIC: {p.cnic}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {p.phone}
                    </div>
                    {p.whatsapp && (
                      <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                        <MessageCircle className="w-3 h-3" />
                        {p.whatsapp}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {p.city ? (
                      <div className="text-sm text-gray-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {p.city}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {(p.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {tag}
                        </span>
                      ))}
                      {(p.tags || []).length > 3 && (
                        <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-medium text-gray-900">{p.query_count}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {p.total_pending > 0 ? (
                      <span className="text-sm font-semibold text-red-600 flex items-center justify-end gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Rs {p.total_pending.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPassengers.length === 0 && (
          <div className="text-center py-12">
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
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add New Passenger</h3>
                    <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Basic Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input type="text" required value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="input" placeholder="Muhammad" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input type="text" required value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="input" placeholder="Ahmed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="input">
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                        <input type="text" value={formData.cnic}
                          onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                          className="input" placeholder="42101-1234567-8" maxLength={15} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input type="date" value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          className="input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                        <input type="text" value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          className="input" placeholder="Pakistani" />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone *</label>
                        <input type="tel" required value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="input" placeholder="0300-1234567" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                        <input type="tel" value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="input" placeholder="0321-9876543" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="input" placeholder="passenger@email.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input type="text" value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="input" placeholder="Karachi" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="input" rows={2} placeholder="House #, Street, Area, City" />
                      </div>
                    </div>
                  </div>

                  {/* Passport */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Passport Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                        <input type="text" value={formData.passport_number}
                          onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                          className="input" placeholder="AA1234567" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Expiry</label>
                        <input type="date" value={formData.passport_expiry}
                          onChange={(e) => setFormData({ ...formData, passport_expiry: e.target.value })}
                          className="input" />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                        <input type="text" value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                          className="input" placeholder="Relative/Friend Name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                        <input type="tel" value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                          className="input" placeholder="0300-1234567" />
                      </div>
                    </div>
                  </div>

                  {/* Tags & Other */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Additional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                        <input type="text" value={formData.referred_by}
                          onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                          className="input" placeholder="Referral name or source" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                          className="input">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {formData.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {tag}
                              <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                            className="input flex-1" placeholder="Type tag and press Enter (e.g. VIP, Umrah, Corporate)" />
                          <button type="button" onClick={addTag} className="btn btn-secondary">
                            <Tag className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input" rows={3} placeholder="Any additional notes..." />
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button type="submit" className="btn btn-primary w-full sm:w-auto sm:ml-3">Save Passenger</button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="btn btn-secondary w-full sm:w-auto mt-3 sm:mt-0">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
