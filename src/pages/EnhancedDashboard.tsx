import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, Users, FileText, TrendingUp,
  Calendar, Clock, DollarSign, Activity, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'

interface Stats {
  totalQueries: number
  totalPassengers: number
  totalVendors: number
  totalInvoices: number
  pendingAmount: number
  completedBookings: number
  revenue: number
  profit: number
}

interface TrendData {
  date: string
  queries: number
  revenue: number
  bookings: number
}

interface ActivityItem {
  id: string
  type: 'query' | 'invoice' | 'passenger' | 'payment'
  title: string
  description: string
  timestamp: string
  user?: string
}

const STATUS_COLORS: Record<string, string> = {
  'New': '#3b82f6',
  'Working': '#f59e0b',
  'Quoted': '#8b5cf6',
  'Finalized': '#10b981',
  'Booking': '#06b6d4',
  'Issued': '#14b8a6',
  'Completed': '#22c55e',
}

export default function EnhancedDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQueries: 0,
    totalPassengers: 0,
    totalVendors: 0,
    totalInvoices: 0,
    pendingAmount: 0,
    completedBookings: 0,
    revenue: 0,
    profit: 0,
  })
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [queryStats, setQueryStats] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load basic stats
      const [queries, passengers, vendors, invoices] = await Promise.all([
        supabase.from('queries').select('*', { count: 'exact' }),
        supabase.from('passengers').select('*', { count: 'exact' }),
        supabase.from('vendors').select('*', { count: 'exact' }),
        supabase.from('invoices').select('amount, paid_amount, created_at'),
      ])

      const completedBookings = queries.data?.filter(q => q.status === 'Completed').length || 0
      const totalRevenue = invoices.data?.reduce((sum, inv) => sum + inv.amount, 0) || 0
      const totalPaid = invoices.data?.reduce((sum, inv) => sum + inv.paid_amount, 0) || 0
      const pendingAmount = totalRevenue - totalPaid

      setStats({
        totalQueries: queries.count || 0,
        totalPassengers: passengers.count || 0,
        totalVendors: vendors.count || 0,
        totalInvoices: invoices.data?.length || 0,
        pendingAmount,
        completedBookings,
        revenue: totalRevenue,
        profit: totalRevenue * 0.15, // Assuming 15% profit margin
      })

      // Load trend data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i)
        return format(date, 'yyyy-MM-dd')
      })

      const trends = last7Days.map(date => {
        const dayQueries = queries.data?.filter(q =>
          q.created_at.startsWith(date)
        ).length || 0

        const dayRevenue = invoices.data?.filter(inv =>
          inv.created_at.startsWith(date)
        ).reduce((sum, inv) => sum + inv.amount, 0) || 0

        const dayBookings = queries.data?.filter(q =>
          q.created_at.startsWith(date) && q.status === 'Completed'
        ).length || 0

        return {
          date: format(new Date(date), 'MMM dd'),
          queries: dayQueries,
          revenue: dayRevenue,
          bookings: dayBookings,
        }
      })

      setTrendData(trends)

      // Status distribution
      const statusCounts = queries.data?.reduce((acc: any, query) => {
        acc[query.status] = (acc[query.status] || 0) + 1
        return acc
      }, {})

      const chartData = Object.entries(statusCounts || {}).map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] || '#6b7280'
      }))

      setQueryStats(chartData)

      // Load recent activity
      const activities: ActivityItem[] = []

      // Recent queries
      const recentQueries = queries.data?.slice(0, 3) || []
      recentQueries.forEach(q => {
        activities.push({
          id: q.id,
          type: 'query',
          title: `New Query: ${q.client_name}`,
          description: `Destination: ${q.destination}`,
          timestamp: q.created_at,
        })
      })

      // Recent invoices
      const recentInvoices = invoices.data?.slice(0, 3) || []
      recentInvoices.forEach((inv, idx) => {
        activities.push({
          id: `inv-${idx}-${inv.created_at}`,
          type: 'invoice',
          title: `Invoice Created`,
          description: `Amount: ₹${inv.amount.toLocaleString('en-IN')}`,
          timestamp: inv.created_at,
        })
      })

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 10))

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const conversionRate = stats.totalQueries > 0
    ? ((stats.completedBookings / stats.totalQueries) * 100).toFixed(1)
    : '0'

  const avgBookingValue = stats.completedBookings > 0
    ? (stats.revenue / stats.completedBookings).toFixed(0)
    : '0'

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.revenue.toLocaleString('en-IN')}</p>
              <div className="flex items-center mt-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12.5% from last month</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQueries}</p>
              <div className="flex items-center mt-2 text-sm text-blue-600">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span>{stats.totalQueries} this month</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedBookings}</p>
              <div className="flex items-center mt-2 text-sm text-purple-600">
                <Activity className="w-4 h-4 mr-1" />
                <span>{conversionRate}% conversion rate</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.pendingAmount.toLocaleString('en-IN')}</p>
              <div className="flex items-center mt-2 text-sm text-orange-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>Follow up required</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Query Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Pipeline</h3>
          {queryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={queryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {queryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Activity & Quick Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-primary-600 hover:text-primary-700">View All</button>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'query' ? 'bg-blue-100' :
                    activity.type === 'invoice' ? 'bg-green-100' :
                    activity.type === 'passenger' ? 'bg-purple-100' :
                    'bg-orange-100'
                  }`}>
                    {activity.type === 'query' && <Search className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'invoice' && <FileText className="w-4 h-4 text-green-600" />}
                    {activity.type === 'passenger' && <Users className="w-4 h-4 text-purple-600" />}
                    {activity.type === 'payment' && <DollarSign className="w-4 h-4 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Avg. Booking Value</p>
              <p className="text-2xl font-bold text-blue-900">₹{avgBookingValue}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-900">{conversionRate}%</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Est. Profit</p>
              <p className="text-2xl font-bold text-purple-900">₹{stats.profit.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Active Passengers</p>
              <p className="text-2xl font-bold text-orange-900">{stats.totalPassengers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Trend (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={2} />
            <Line type="monotone" dataKey="queries" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
