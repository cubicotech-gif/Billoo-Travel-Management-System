import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Users, Building2, FileText, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Stats {
  totalQueries: number
  totalPassengers: number
  totalVendors: number
  totalInvoices: number
  pendingAmount: number
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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQueries: 0,
    totalPassengers: 0,
    totalVendors: 0,
    totalInvoices: 0,
    pendingAmount: 0,
  })
  const [queryStats, setQueryStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [queries, passengers, vendors, invoices] = await Promise.all([
        supabase.from('queries').select('*', { count: 'exact' }),
        supabase.from('passengers').select('*', { count: 'exact' }),
        supabase.from('vendors').select('*', { count: 'exact' }),
        supabase.from('invoices').select('amount, paid_amount'),
      ])

      const pendingAmount = invoices.data?.reduce(
        (sum, inv) => sum + (inv.amount - inv.paid_amount),
        0
      ) || 0

      setStats({
        totalQueries: queries.count || 0,
        totalPassengers: passengers.count || 0,
        totalVendors: vendors.count || 0,
        totalInvoices: invoices.data?.length || 0,
        pendingAmount,
      })

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
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const statCards = [
    { name: 'Total Queries', value: stats.totalQueries, icon: Search, color: 'bg-blue-500' },
    { name: 'Passengers', value: stats.totalPassengers, icon: Users, color: 'bg-green-500' },
    { name: 'Vendors', value: stats.totalVendors, icon: Building2, color: 'bg-purple-500' },
    { name: 'Invoices', value: stats.totalInvoices, icon: FileText, color: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to Billoo Travel Management System
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Queries by Status</h3>
          {queryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={queryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No data available
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          {queryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={queryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
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

      <div className="card">
        <div className="flex items-center">
          <TrendingUp className="w-6 h-6 text-green-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-600">Pending Receivables</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹{stats.pendingAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
