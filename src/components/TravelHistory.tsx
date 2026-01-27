import { useEffect, useState } from 'react'
import { Calendar, MapPin, DollarSign, FileText, Users, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

interface TravelRecord {
  id: string
  query_id: string
  query_number: string
  destination: string
  travel_date: string | null
  return_date: string | null
  status: string
  selling_price: number
  is_primary: boolean
  passenger_type: 'adult' | 'child' | 'infant'
  created_at: string
}

interface TravelHistoryProps {
  passengerId: string
}

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Working: 'bg-yellow-100 text-yellow-800',
  Quoted: 'bg-purple-100 text-purple-800',
  Finalized: 'bg-green-100 text-green-800',
  Booking: 'bg-cyan-100 text-cyan-800',
  Issued: 'bg-teal-100 text-teal-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

export default function TravelHistory({ passengerId }: TravelHistoryProps) {
  const [travelRecords, setTravelRecords] = useState<TravelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTrips: 0,
    upcomingTrips: 0,
    totalSpent: 0,
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadTravelHistory()
  }, [passengerId])

  const loadTravelHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('query_passengers')
        .select(`
          id,
          query_id,
          is_primary,
          passenger_type,
          created_at,
          queries:query_id (
            id,
            query_number,
            destination,
            travel_date,
            return_date,
            status,
            selling_price
          )
        `)
        .eq('passenger_id', passengerId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform the data
      const records: TravelRecord[] = (data || []).map((item: any) => ({
        id: item.id,
        query_id: item.query_id,
        query_number: item.queries.query_number,
        destination: item.queries.destination,
        travel_date: item.queries.travel_date,
        return_date: item.queries.return_date,
        status: item.queries.status,
        selling_price: item.queries.selling_price,
        is_primary: item.is_primary,
        passenger_type: item.passenger_type,
        created_at: item.created_at,
      }))

      setTravelRecords(records)

      // Calculate stats
      const totalTrips = records.length
      const upcomingTrips = records.filter((r) => {
        if (!r.travel_date) return false
        return new Date(r.travel_date) > new Date()
      }).length
      const totalSpent = records.reduce((sum, r) => sum + (r.selling_price || 0), 0)

      setStats({ totalTrips, upcomingTrips, totalSpent })
    } catch (error) {
      console.error('Error loading travel history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewQuery = (queryId: string) => {
    navigate('/queries')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Trips</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalTrips}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Upcoming Trips</p>
              <p className="text-2xl font-bold text-green-900">{stats.upcomingTrips}</p>
            </div>
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Spent</p>
              <p className="text-2xl font-bold text-purple-900">
                ₹{stats.totalSpent.toLocaleString('en-IN')}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Travel Records */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h4>

        {travelRecords.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No travel history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {travelRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => handleViewQuery(record.query_id)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {record.is_primary ? (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Users className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          #{record.query_number}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            STATUS_COLORS[record.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {record.status}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            record.passenger_type === 'adult'
                              ? 'bg-blue-100 text-blue-800'
                              : record.passenger_type === 'child'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {record.passenger_type}
                        </span>
                        {record.is_primary && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center space-x-1 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{record.destination}</span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {record.travel_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(record.travel_date), 'MMM d, yyyy')}
                              {record.return_date &&
                                ` - ${format(new Date(record.return_date), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                        )}

                        {record.selling_price > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>₹{record.selling_price.toLocaleString('en-IN')}</span>
                            </div>
                          </>
                        )}

                        <span>•</span>
                        <span>Booked {format(new Date(record.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
