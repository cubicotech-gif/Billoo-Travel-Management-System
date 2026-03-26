import { useState, useEffect, useCallback } from 'react'
import { User, X, Star, Plus, Search, Check, Loader, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { findDuplicatePassenger, createPassengerFromQuery, type CreatePassengerFromQueryInput } from '@/lib/api/passengers'

interface Passenger {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  passport_number: string | null
  nationality: string | null
}

interface LinkedPassenger {
  id: string
  passenger_id: string
  is_primary: boolean
  passenger_type: 'adult' | 'child' | 'infant'
  seat_preference: string | null
  meal_preference: string | null
  special_requirements: string | null
  passenger?: Passenger
}

interface PassengerSelectorProps {
  queryId: string
  queryNumber?: string
  onPassengersChange?: () => void
}

const EMPTY_CREATE: CreatePassengerFromQueryInput = {
  first_name: '', last_name: '', phone: '', whatsapp: '', email: '',
  passport_number: '', passport_expiry: '', date_of_birth: '', cnic: '',
  gender: '', nationality: 'Pakistani',
}

export default function PassengerSelector({ queryId, queryNumber, onPassengersChange }: PassengerSelectorProps) {
  const [linkedPassengers, setLinkedPassengers] = useState<LinkedPassenger[]>([])
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setSaving] = useState(false)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createData, setCreateData] = useState<CreatePassengerFromQueryInput>({ ...EMPTY_CREATE })
  const [createSaving, setCreateSaving] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<Passenger | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  useEffect(() => {
    loadLinkedPassengers()
    loadAllPassengers()
  }, [queryId])

  const loadLinkedPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('query_passengers')
        .select(`
          id, passenger_id, is_primary, passenger_type,
          seat_preference, meal_preference, special_requirements,
          passengers:passenger_id (id, first_name, last_name, email, phone, passport_number, nationality)
        `)
        .eq('query_id', queryId)

      if (error) throw error

      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        passenger_id: item.passenger_id,
        is_primary: item.is_primary,
        passenger_type: item.passenger_type,
        seat_preference: item.seat_preference,
        meal_preference: item.meal_preference,
        special_requirements: item.special_requirements,
        passenger: item.passengers,
      }))

      setLinkedPassengers(transformed)
    } catch (error) {
      console.error('Error loading linked passengers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('passengers')
        .select('id, first_name, last_name, email, phone, passport_number, nationality')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAllPassengers(data || [])
    } catch (error) {
      console.error('Error loading passengers:', error)
    }
  }

  const handleAddPassenger = async (passenger: Passenger, type: 'adult' | 'child' | 'infant' = 'adult') => {
    setSaving(true)
    try {
      const alreadyLinked = linkedPassengers.some((lp) => lp.passenger_id === passenger.id)
      if (alreadyLinked) {
        alert('This passenger is already added to this query')
        setSaving(false)
        return
      }

      const { error } = await supabase.from('query_passengers').insert({
        query_id: queryId,
        passenger_id: passenger.id,
        is_primary: linkedPassengers.length === 0,
        passenger_type: type,
      })

      if (error) throw error

      await loadLinkedPassengers()
      setShowSearchModal(false)
      setSearchTerm('')

      if (onPassengersChange) onPassengersChange()
    } catch (error) {
      console.error('Error adding passenger:', error)
      alert('Failed to add passenger')
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePassenger = async (linkId: string) => {
    if (!confirm('Remove this passenger from the query?')) return

    try {
      const { error } = await supabase.from('query_passengers').delete().eq('id', linkId)
      if (error) throw error
      await loadLinkedPassengers()
      if (onPassengersChange) onPassengersChange()
    } catch (error) {
      console.error('Error removing passenger:', error)
      alert('Failed to remove passenger')
    }
  }

  const handleSetPrimary = async (linkId: string) => {
    try {
      await supabase.from('query_passengers').update({ is_primary: false }).eq('query_id', queryId)
      const { error } = await supabase.from('query_passengers').update({ is_primary: true }).eq('id', linkId)
      if (error) throw error
      await loadLinkedPassengers()
    } catch (error) {
      console.error('Error setting primary passenger:', error)
    }
  }

  const handleUpdateDetails = async (linkId: string, field: string, value: string) => {
    try {
      const { error } = await supabase
        .from('query_passengers')
        .update({ [field]: value || null })
        .eq('id', linkId)
      if (error) throw error
      await loadLinkedPassengers()
    } catch (error) {
      console.error('Error updating passenger details:', error)
    }
  }

  // Debounced duplicate check when name+phone change in create form
  const checkDuplicate = useCallback(async () => {
    const { first_name, last_name, phone, passport_number } = createData
    if (!first_name.trim() || !last_name.trim()) {
      setDuplicateWarning(null)
      return
    }
    setCheckingDuplicate(true)
    try {
      const dup = await findDuplicatePassenger(first_name, last_name, phone || undefined, passport_number || undefined)
      setDuplicateWarning(dup)
    } catch {
      setDuplicateWarning(null)
    } finally {
      setCheckingDuplicate(false)
    }
  }, [createData.first_name, createData.last_name, createData.phone, createData.passport_number])

  useEffect(() => {
    if (!showCreateForm) return
    const timer = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timer)
  }, [checkDuplicate, showCreateForm])

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createData.first_name.trim() || !createData.last_name.trim() || !createData.phone.trim()) return

    setCreateSaving(true)
    try {
      // Clean empty strings to undefined
      const cleaned: CreatePassengerFromQueryInput = {
        first_name: createData.first_name.trim(),
        last_name: createData.last_name.trim(),
        phone: createData.phone.trim(),
      }
      if (createData.whatsapp?.trim()) cleaned.whatsapp = createData.whatsapp.trim()
      if (createData.email?.trim()) cleaned.email = createData.email.trim()
      if (createData.passport_number?.trim()) cleaned.passport_number = createData.passport_number.trim()
      if (createData.passport_expiry?.trim()) cleaned.passport_expiry = createData.passport_expiry.trim()
      if (createData.date_of_birth?.trim()) cleaned.date_of_birth = createData.date_of_birth.trim()
      if (createData.cnic?.trim()) cleaned.cnic = createData.cnic.trim()
      if (createData.gender?.trim()) cleaned.gender = createData.gender.trim()
      if (createData.nationality?.trim()) cleaned.nationality = createData.nationality.trim()

      await createPassengerFromQuery(cleaned, queryId, queryNumber || '')

      await loadLinkedPassengers()
      await loadAllPassengers()

      setShowCreateForm(false)
      setShowSearchModal(false)
      setCreateData({ ...EMPTY_CREATE })
      setDuplicateWarning(null)

      if (onPassengersChange) onPassengersChange()
    } catch (error: any) {
      console.error('Error creating passenger:', error)
      alert('Failed to create passenger: ' + (error.message || 'Unknown error'))
    } finally {
      setCreateSaving(false)
    }
  }

  const handleLinkExistingDuplicate = () => {
    if (duplicateWarning) {
      handleAddPassenger(duplicateWarning as Passenger)
      setDuplicateWarning(null)
      setShowCreateForm(false)
    }
  }

  const updateCreate = (field: keyof CreatePassengerFromQueryInput, value: string) => {
    setCreateData(prev => ({ ...prev, [field]: value }))
  }

  const filteredPassengers = allPassengers.filter(
    (p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone.includes(searchTerm) ||
      p.passport_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Passengers</h3>
        <button onClick={() => setShowSearchModal(true)} className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4 mr-2" /> Add Passenger
        </button>
      </div>

      {linkedPassengers.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No passengers added yet</p>
          <button onClick={() => setShowSearchModal(true)} className="mt-4 btn btn-secondary btn-sm">
            Add First Passenger
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedPassengers.map((lp) => (
            <div key={lp.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">
                    {lp.is_primary ? (
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {lp.passenger?.first_name} {lp.passenger?.last_name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        lp.passenger_type === 'adult' ? 'bg-blue-100 text-blue-800' :
                        lp.passenger_type === 'child' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {lp.passenger_type}
                      </span>
                      {lp.is_primary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Primary</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{lp.passenger?.phone}</span>
                      {lp.passenger?.email && <><span>&middot;</span><span>{lp.passenger.email}</span></>}
                      {lp.passenger?.passport_number && <><span>&middot;</span><span>Passport: {lp.passenger.passport_number}</span></>}
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Seat Preference</label>
                        <select value={lp.seat_preference || ''} onChange={(e) => handleUpdateDetails(lp.id, 'seat_preference', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                          <option value="">Not specified</option>
                          <option value="Window">Window</option>
                          <option value="Aisle">Aisle</option>
                          <option value="Middle">Middle</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Meal Preference</label>
                        <select value={lp.meal_preference || ''} onChange={(e) => handleUpdateDetails(lp.id, 'meal_preference', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500">
                          <option value="">Not specified</option>
                          <option value="Vegetarian">Vegetarian</option>
                          <option value="Non-Vegetarian">Non-Vegetarian</option>
                          <option value="Halal">Halal</option>
                          <option value="Vegan">Vegan</option>
                          <option value="Kosher">Kosher</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Special Requirements</label>
                        <input type="text" value={lp.special_requirements || ''}
                          onChange={(e) => handleUpdateDetails(lp.id, 'special_requirements', e.target.value)}
                          placeholder="Wheelchair, allergies, etc."
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!lp.is_primary && (
                    <button onClick={() => handleSetPrimary(lp.id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors" title="Set as primary">
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleRemovePassenger(lp.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search / Create Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => { setShowSearchModal(false); setShowCreateForm(false); setDuplicateWarning(null) }} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {showCreateForm ? 'Create New Passenger' : 'Select Passenger'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowCreateForm(!showCreateForm); setDuplicateWarning(null) }}
                      className={`btn btn-sm ${showCreateForm ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {showCreateForm ? (
                        <><Search className="w-4 h-4 mr-1" /> Search Existing</>
                      ) : (
                        <><Plus className="w-4 h-4 mr-1" /> Create New</>
                      )}
                    </button>
                    <button onClick={() => { setShowSearchModal(false); setShowCreateForm(false); setDuplicateWarning(null) }}
                      className="text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Create New Passenger Form */}
                {showCreateForm ? (
                  <form onSubmit={handleCreateAndAdd} className="space-y-4">
                    {/* Duplicate Warning */}
                    {duplicateWarning && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800">Similar passenger found!</p>
                            <p className="text-sm text-amber-700 mt-1">
                              {duplicateWarning.first_name} {duplicateWarning.last_name} — {duplicateWarning.phone}
                              {duplicateWarning.passport_number && ` — Passport: ${duplicateWarning.passport_number}`}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button type="button" onClick={handleLinkExistingDuplicate}
                                className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700">
                                Link Existing
                              </button>
                              <button type="button" onClick={() => setDuplicateWarning(null)}
                                className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                                Create New Anyway
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {checkingDuplicate && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Loader className="w-3 h-3 animate-spin" /> Checking for duplicates...
                      </div>
                    )}

                    {/* Required fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input type="text" required value={createData.first_name}
                          onChange={e => updateCreate('first_name', e.target.value)}
                          className="input text-sm" placeholder="First Name" autoFocus />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input type="text" required value={createData.last_name}
                          onChange={e => updateCreate('last_name', e.target.value)}
                          className="input text-sm" placeholder="Last Name" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input type="tel" required value={createData.phone}
                          onChange={e => updateCreate('phone', e.target.value)}
                          className="input text-sm" placeholder="03001234567" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                        <input type="tel" value={createData.whatsapp || ''}
                          onChange={e => updateCreate('whatsapp', e.target.value)}
                          className="input text-sm" placeholder="Same as phone or different" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={createData.email || ''}
                        onChange={e => updateCreate('email', e.target.value)}
                        className="input text-sm" placeholder="email@example.com" />
                    </div>

                    {/* Optional fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number</label>
                        <input type="text" value={createData.passport_number || ''}
                          onChange={e => updateCreate('passport_number', e.target.value)}
                          className="input text-sm" placeholder="AB1234567" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passport Expiry</label>
                        <input type="date" value={createData.passport_expiry || ''}
                          onChange={e => updateCreate('passport_expiry', e.target.value)}
                          className="input text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input type="date" value={createData.date_of_birth || ''}
                          onChange={e => updateCreate('date_of_birth', e.target.value)}
                          className="input text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                        <input type="text" value={createData.cnic || ''}
                          onChange={e => updateCreate('cnic', e.target.value)}
                          className="input text-sm" placeholder="12345-1234567-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select value={createData.gender || ''} onChange={e => updateCreate('gender', e.target.value)} className="input text-sm">
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                      <input type="text" value={createData.nationality || 'Pakistani'}
                        onChange={e => updateCreate('nationality', e.target.value)}
                        className="input text-sm" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button type="button" onClick={() => { setShowCreateForm(false); setDuplicateWarning(null) }}
                        className="btn btn-secondary">Cancel</button>
                      <button type="submit" disabled={createSaving} className="btn btn-primary">
                        {createSaving ? (
                          <><Loader className="w-4 h-4 animate-spin mr-1" /> Creating...</>
                        ) : (
                          <><Plus className="w-4 h-4 mr-1" /> Create & Add to Query</>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Search existing passengers */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search passengers by name, email, phone, or passport..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredPassengers.length === 0 ? (
                        <div className="text-center py-8">
                          <User className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No passengers found</p>
                          <button onClick={() => setShowCreateForm(true)} className="mt-3 btn btn-primary btn-sm">
                            <Plus className="w-4 h-4 mr-1" /> Create New Passenger
                          </button>
                        </div>
                      ) : (
                        filteredPassengers.map((passenger) => {
                          const isLinked = linkedPassengers.some((lp) => lp.passenger_id === passenger.id)
                          return (
                            <div key={passenger.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                isLinked ? 'bg-gray-50 border-gray-300 cursor-not-allowed' : 'hover:bg-primary-50 border-gray-200'
                              }`}
                              onClick={() => !isLinked && handleAddPassenger(passenger)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {passenger.first_name} {passenger.last_name}
                                    </p>
                                    <div className="flex items-center gap-x-2 text-xs text-gray-500">
                                      <span>{passenger.phone}</span>
                                      {passenger.email && <><span>&middot;</span><span>{passenger.email}</span></>}
                                      {passenger.passport_number && <><span>&middot;</span><span>PP: {passenger.passport_number}</span></>}
                                    </div>
                                  </div>
                                </div>
                                {isLinked && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Check className="h-4 w-4 mr-1" /> Already added
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {!showCreateForm && (
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                  <button onClick={() => { setShowSearchModal(false); setShowCreateForm(false) }} className="btn btn-secondary">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
