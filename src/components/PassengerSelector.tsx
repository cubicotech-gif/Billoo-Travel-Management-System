import { useState, useEffect } from 'react'
import { User, X, Star, Plus, Search, Check, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  onPassengersChange?: () => void
}

export default function PassengerSelector({ queryId, onPassengersChange }: PassengerSelectorProps) {
  const [linkedPassengers, setLinkedPassengers] = useState<LinkedPassenger[]>([])
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setSaving] = useState(false)

  // Quick-create state
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateData, setQuickCreateData] = useState({ first_name: '', last_name: '', phone: '' })
  const [quickCreateSaving, setQuickCreateSaving] = useState(false)

  useEffect(() => {
    loadLinkedPassengers()
    loadAllPassengers()
  }, [queryId])

  const loadLinkedPassengers = async () => {
    try {
      const { data, error } = await supabase
        .from('query_passengers')
        .select(`
          id,
          passenger_id,
          is_primary,
          passenger_type,
          seat_preference,
          meal_preference,
          special_requirements,
          passengers:passenger_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            passport_number,
            nationality
          )
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

      if (onPassengersChange) {
        onPassengersChange()
      }
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

      if (onPassengersChange) {
        onPassengersChange()
      }
    } catch (error) {
      console.error('Error removing passenger:', error)
      alert('Failed to remove passenger')
    }
  }

  const handleSetPrimary = async (linkId: string) => {
    try {
      await supabase
        .from('query_passengers')
        .update({ is_primary: false })
        .eq('query_id', queryId)

      const { error } = await supabase
        .from('query_passengers')
        .update({ is_primary: true })
        .eq('id', linkId)

      if (error) throw error

      await loadLinkedPassengers()
    } catch (error) {
      console.error('Error setting primary passenger:', error)
      alert('Failed to set primary passenger')
    }
  }

  const handleUpdateDetails = async (
    linkId: string,
    field: string,
    value: string
  ) => {
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

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCreateData.first_name.trim() || !quickCreateData.last_name.trim() || !quickCreateData.phone.trim()) return

    setQuickCreateSaving(true)
    try {
      const { data, error } = await supabase
        .from('passengers')
        .insert([{
          first_name: quickCreateData.first_name.trim(),
          last_name: quickCreateData.last_name.trim(),
          phone: quickCreateData.phone.trim(),
        }])
        .select('id, first_name, last_name, email, phone, passport_number, nationality')
        .single()

      if (error) throw error

      // Refresh the all-passengers list
      await loadAllPassengers()

      // Auto-add to the query
      if (data) {
        await handleAddPassenger(data)
      }

      // Reset quick-create
      setShowQuickCreate(false)
      setQuickCreateData({ first_name: '', last_name: '', phone: '' })
    } catch (error) {
      console.error('Error quick-creating passenger:', error)
      alert('Failed to create passenger')
    } finally {
      setQuickCreateSaving(false)
    }
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
        <button
          onClick={() => setShowSearchModal(true)}
          className="btn btn-primary btn-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Passenger
        </button>
      </div>

      {linkedPassengers.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">No passengers added yet</p>
          <button
            onClick={() => setShowSearchModal(true)}
            className="mt-4 btn btn-secondary btn-sm"
          >
            Add First Passenger
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedPassengers.map((lp) => (
            <div
              key={lp.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
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
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          lp.passenger_type === 'adult'
                            ? 'bg-blue-100 text-blue-800'
                            : lp.passenger_type === 'child'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {lp.passenger_type}
                      </span>
                      {lp.is_primary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Primary
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span>{lp.passenger?.phone}</span>
                      {lp.passenger?.email && (
                        <>
                          <span>&middot;</span>
                          <span>{lp.passenger.email}</span>
                        </>
                      )}
                      {lp.passenger?.passport_number && (
                        <>
                          <span>&middot;</span>
                          <span>Passport: {lp.passenger.passport_number}</span>
                        </>
                      )}
                    </div>

                    {/* Passenger-specific details */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Seat Preference</label>
                        <select
                          value={lp.seat_preference || ''}
                          onChange={(e) => handleUpdateDetails(lp.id, 'seat_preference', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Not specified</option>
                          <option value="Window">Window</option>
                          <option value="Aisle">Aisle</option>
                          <option value="Middle">Middle</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Meal Preference</label>
                        <select
                          value={lp.meal_preference || ''}
                          onChange={(e) => handleUpdateDetails(lp.id, 'meal_preference', e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Not specified</option>
                          <option value="Vegetarian">Vegetarian</option>
                          <option value="Non-Vegetarian">Non-Vegetarian</option>
                          <option value="Halal">Halal</option>
                          <option value="Vegan">Vegan</option>
                          <option value="Kosher">Kosher</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Special Requirements</label>
                        <input
                          type="text"
                          value={lp.special_requirements || ''}
                          onChange={(e) => handleUpdateDetails(lp.id, 'special_requirements', e.target.value)}
                          placeholder="Wheelchair, allergies, etc."
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {!lp.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(lp.id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title="Set as primary passenger"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemovePassenger(lp.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove passenger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => { setShowSearchModal(false); setShowQuickCreate(false) }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select Passenger</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowQuickCreate(!showQuickCreate)}
                      className={`btn btn-sm ${showQuickCreate ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Quick Create
                    </button>
                    <button
                      onClick={() => { setShowSearchModal(false); setShowQuickCreate(false) }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Quick Create Inline Form */}
                {showQuickCreate && (
                  <form onSubmit={handleQuickCreate} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-3">Create & Add New Passenger</p>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="First Name *"
                        value={quickCreateData.first_name}
                        onChange={(e) => setQuickCreateData({ ...quickCreateData, first_name: e.target.value })}
                        className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        required
                        placeholder="Last Name *"
                        value={quickCreateData.last_name}
                        onChange={(e) => setQuickCreateData({ ...quickCreateData, last_name: e.target.value })}
                        className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="tel"
                        required
                        placeholder="Phone *"
                        value={quickCreateData.phone}
                        onChange={(e) => setQuickCreateData({ ...quickCreateData, phone: e.target.value })}
                        className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex justify-end mt-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickCreate(false)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={quickCreateSaving}
                        className="btn btn-primary btn-sm"
                      >
                        {quickCreateSaving ? (
                          <><Loader className="w-4 h-4 animate-spin mr-1" /> Creating...</>
                        ) : (
                          <><Plus className="w-4 h-4 mr-1" /> Create & Add</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search passengers by name, email, phone, or passport..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus={!showQuickCreate}
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredPassengers.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No passengers found</p>
                      {!showQuickCreate && (
                        <button
                          onClick={() => setShowQuickCreate(true)}
                          className="mt-3 btn btn-secondary btn-sm"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Create New Passenger
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredPassengers.map((passenger) => {
                      const isLinked = linkedPassengers.some(
                        (lp) => lp.passenger_id === passenger.id
                      )

                      return (
                        <div
                          key={passenger.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isLinked
                              ? 'bg-gray-50 border-gray-300 cursor-not-allowed'
                              : 'hover:bg-primary-50 border-gray-200'
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
                                  {passenger.email && (
                                    <>
                                      <span>&middot;</span>
                                      <span>{passenger.email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isLinked && (
                              <div className="flex items-center text-xs text-gray-500">
                                <Check className="h-4 w-4 mr-1" />
                                Already added
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                <button onClick={() => { setShowSearchModal(false); setShowQuickCreate(false) }} className="btn btn-secondary">
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
