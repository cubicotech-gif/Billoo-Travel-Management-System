import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, Users, FileText, TrendingUp,
  Calendar, Clock, DollarSign, Activity
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import DocumentExpiryAlerts from '@/components/DocumentExpiryAlerts'

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="spinner w-16 h-16"></div>
          <p className="text-sm text-gray-600 mt-4 text-center">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Hero Section */}
      <div className="relative rounded-3xl bg-gradient-hero p-8 md:p-12 text-white shadow-xl overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-400 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3 animate-slide-up">
                Welcome to Your Dashboard
              </h1>
              <p className="text-lg md:text-xl text-primary-100 mb-6 max-w-2xl">
                Manage your premium travel business with world-class tools and insights.
              </p>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-accent btn-lg shadow-glow-accent">
                  <Search className="w-5 h-5" />
                  New Query
                </button>
                <button className="btn btn-secondary btn-lg bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
                  <FileText className="w-5 h-5" />
                  View Reports
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div className="glass p-4 rounded-2xl text-center shadow-large">
                <div className="text-3xl md:text-4xl font-bold mb-1">{conversionRate}%</div>
                <div className="text-sm text-primary-100">Conversion Rate</div>
              </div>
              <div className="glass p-4 rounded-2xl text-center shadow-large">
                <div className="text-3xl md:text-4xl font-bold mb-1">
                  ₹{(stats.revenue / 100000).toFixed(1)}L
                </div>
                <div className="text-sm text-primary-100">Total Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Stat */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-6 h-6 text-success-600" />
            </div>
            <span className="badge badge-success">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12.5%
            </span>
          </div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">₹{(stats.revenue / 100000).toFixed(1)}L</div>
          <p className="text-sm text-gray-500 mt-2">from last month</p>
        </div>

        {/* Queries Stat */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Search className="w-6 h-6 text-primary-600" />
            </div>
            <span className="badge badge-primary">
              This Month
            </span>
          </div>
          <div className="stat-label">Total Queries</div>
          <div className="stat-value">{stats.totalQueries}</div>
          <p className="text-sm text-gray-500 mt-2">active inquiries</p>
        </div>

        {/* Bookings Stat */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-accent-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-6 h-6 text-accent-600" />
            </div>
            <span className="badge badge-accent">
              {conversionRate}%
            </span>
          </div>
          <div className="stat-label">Completed Bookings</div>
          <div className="stat-value">{stats.completedBookings}</div>
          <p className="text-sm text-gray-500 mt-2">conversion rate</p>
        </div>

        {/* Pending Payments Stat */}
        <div className="stat-card group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
            <span className="badge badge-warning">
              Urgent
            </span>
          </div>
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value">₹{(stats.pendingAmount / 100000).toFixed(1)}L</div>
          <p className="text-sm text-gray-500 mt-2">follow up required</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="card-premium">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-gray-900">Revenue Trend</h3>
              <p className="text-sm text-gray-500 mt-1">Last 7 days performance</p>
            </div>
            <div className="p-2 bg-success-100 rounded-xl">
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#64748b"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Query Status Distribution */}
        <div className="card-premium">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-gray-900">Query Pipeline</h3>
              <p className="text-sm text-gray-500 mt-1">Status distribution overview</p>
            </div>
            <div className="p-2 bg-primary-100 rounded-xl">
              <Activity className="w-5 h-5 text-primary-600" />
            </div>
          </div>
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
                  style={{ fontSize: '13px', fontWeight: '600' }}
                >
                  {queryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <Activity className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500">No data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity & Quick Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 card-premium">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-display font-bold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500 mt-1">Latest updates from your business</p>
            </div>
            <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 hover:bg-gradient-card rounded-xl transition-all duration-200 cursor-pointer group border border-transparent hover:border-primary-100"
                >
                  <div className={`p-2.5 rounded-xl shadow-soft group-hover:scale-110 transition-transform duration-200 ${
                    activity.type === 'query' ? 'bg-primary-100' :
                    activity.type === 'invoice' ? 'bg-success-100' :
                    activity.type === 'passenger' ? 'bg-accent-100' :
                    'bg-warning-100'
                  }`}>
                    {activity.type === 'query' && <Search className="w-5 h-5 text-primary-600" />}
                    {activity.type === 'invoice' && <FileText className="w-5 h-5 text-success-600" />}
                    {activity.type === 'passenger' && <Users className="w-5 h-5 text-accent-600" />}
                    {activity.type === 'payment' && <DollarSign className="w-5 h-5 text-warning-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{activity.title}</p>
                    <p className="text-sm text-gray-600 mb-1.5">{activity.description}</p>
                    <p className="text-xs text-gray-400 font-medium">
                      {format(new Date(activity.timestamp), 'MMM dd, yyyy • HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-300 mb-3">
                  <Activity className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-1">Activity will appear here as you work</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card-premium">
          <div className="mb-6">
            <h3 className="text-xl font-display font-bold text-gray-900">Quick Stats</h3>
            <p className="text-sm text-gray-500 mt-1">Key performance metrics</p>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border-2 border-primary-200/50 hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-primary-700 font-semibold uppercase tracking-wide">Avg. Booking Value</p>
                <DollarSign className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-3xl font-bold text-primary-900">₹{avgBookingValue}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-xl border-2 border-success-200/50 hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-success-700 font-semibold uppercase tracking-wide">Conversion Rate</p>
                <TrendingUp className="w-5 h-5 text-success-600" />
              </div>
              <p className="text-3xl font-bold text-success-900">{conversionRate}%</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-accent-50 to-accent-100 rounded-xl border-2 border-accent-200/50 hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-accent-700 font-semibold uppercase tracking-wide">Est. Profit</p>
                <Activity className="w-5 h-5 text-accent-600" />
              </div>
              <p className="text-3xl font-bold text-accent-900">₹{(stats.profit / 100000).toFixed(1)}L</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl border-2 border-warning-200/50 hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-warning-700 font-semibold uppercase tracking-wide">Active Passengers</p>
                <Users className="w-5 h-5 text-warning-600" />
              </div>
              <p className="text-3xl font-bold text-warning-900">{stats.totalPassengers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Trend */}
      <div className="card-premium">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-display font-bold text-gray-900">Booking Trend</h3>
            <p className="text-sm text-gray-500 mt-1">Queries vs bookings over the last 7 days</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent-500"></div>
              <span className="text-sm text-gray-600 font-medium">Bookings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500"></div>
              <span className="text-sm text-gray-600 font-medium">Queries</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Line
              type="monotone"
              dataKey="bookings"
              stroke="#eab308"
              strokeWidth={3}
              dot={{ fill: '#eab308', r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="queries"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ fill: '#0ea5e9', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Document Expiry Alerts */}
      <DocumentExpiryAlerts />
    </div>
  )
}
