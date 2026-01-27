import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  Utensils,
  MapPin,
  Star,
  ArrowRight,
} from 'lucide-react'
import BookingSearchCard from '@/components/BookingSearchCard'
import { useNavigate } from 'react-router-dom'

interface Stats {
  totalQueries: number
  totalPassengers: number
  totalVendors: number
  totalBookings: number
}

interface FeaturedDestination {
  id: string
  destination: string
  count: number
  image: string
}

export default function ModernDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQueries: 0,
    totalPassengers: 0,
    totalVendors: 0,
    totalBookings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [featuredDestinations, setFeaturedDestinations] = useState<FeaturedDestination[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    loadStats()
    loadFeaturedDestinations()
  }, [])

  const loadStats = async () => {
    try {
      const [queriesRes, passengersRes, vendorsRes] = await Promise.all([
        supabase.from('queries').select('id', { count: 'exact', head: true }),
        supabase.from('passengers').select('id', { count: 'exact', head: true }),
        supabase.from('vendors').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        totalQueries: queriesRes.count || 0,
        totalPassengers: passengersRes.count || 0,
        totalVendors: vendorsRes.count || 0,
        totalBookings: queriesRes.count || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFeaturedDestinations = async () => {
    try {
      const { data } = await supabase
        .from('queries')
        .select('destination')
        .limit(100)

      if (data) {
        const destCounts: { [key: string]: number } = {}
        data.forEach((q) => {
          if (q.destination) {
            destCounts[q.destination] = (destCounts[q.destination] || 0) + 1
          }
        })

        const featured = Object.entries(destCounts)
          .map(([dest, count]) => ({
            id: dest,
            destination: dest,
            count,
            image: `https://source.unsplash.com/400x300/?${encodeURIComponent(dest)},travel`,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

        setFeaturedDestinations(featured)
      }
    } catch (error) {
      console.error('Error loading destinations:', error)
    }
  }

  const statCards = [
    {
      title: 'Available Hotels',
      value: `${stats.totalVendors}+`,
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Total Restaurants',
      value: `${Math.floor(stats.totalVendors / 2)}+`,
      icon: Utensils,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      title: 'Happy Travelers',
      value: `${stats.totalPassengers}+`,
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Total Bookings',
      value: `${stats.totalQueries}+`,
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Hello, Travel Manager!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, ready to manage your bookings?
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
              New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats & Featured */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Banner with Search */}
            <div className="relative bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-20">
                <img
                  src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200"
                  alt="Hotel"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative p-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                  <Star className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">
                  World's best hotels—
                  <br />
                  chosen by you
                </h2>
                <button className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors inline-flex items-center space-x-2">
                  <span>EXPLORE NOW</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <div
                  key={stat.title}
                  className={`${stat.bgColor} p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                </div>
              ))}
            </div>

            {/* Featured Destinations */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Find a Cozy Stay Nearby
                </h3>
                <button className="text-red-600 font-medium hover:underline flex items-center space-x-1">
                  <span>EXPLORE ALL</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {featuredDestinations.map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => navigate('/queries')}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={dest.image}
                        alt={dest.destination}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{dest.destination}</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Luxury Hotels
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {dest.count} available properties
                      </p>
                      <div className="flex items-center mt-2">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white dark:border-gray-800"
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          +{dest.count} bookings
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promotional Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-2xl text-white">
                <h3 className="text-2xl font-bold mb-2">Book Family Getaway</h3>
                <p className="mb-4 text-white/90">Save 25%+</p>
                <button className="px-6 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center space-x-2">
                  <span>TRY IT NOW</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-gradient-purple p-6 rounded-2xl text-white">
                <h3 className="text-2xl font-bold mb-2">Get alerts on flight prices</h3>
                <p className="mb-4 text-white/90">Save on your next booking</p>
                <button className="px-6 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center space-x-2">
                  <span>TRY IT NOW</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Search Card */}
          <div className="space-y-6">
            <BookingSearchCard />

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Today's Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        New Queries
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.floor(stats.totalQueries / 10)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Active Bookings
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">This week</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.floor(stats.totalQueries / 5)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        New Travelers
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">This month</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.floor(stats.totalPassengers / 3)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
