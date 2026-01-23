import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Download, Calendar, TrendingUp, DollarSign, FileText,
  Filter, BarChart3
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'

interface ReportData {
  totalRevenue: number
  totalProfit: number
  totalQueries: number
  completedBookings: number
  pendingPayments: number
  averageBookingValue: number
  conversionRate: number
  topDestinations: Array<{ name: string; count: number; revenue: number }>
  monthlyRevenue: Array<{ month: string; revenue: number; bookings: number }>
  statusBreakdown: Array<{ status: string; count: number }>
  vendorSpending: Array<{ vendor: string; amount: number }>
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444']

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  useEffect(() => {
    loadReportData()
  }, [dateRange])

  const loadReportData = async () => {
    try {
      setLoading(true)

      // Fetch all data
      const [queriesRes, invoicesRes, vendorsRes] = await Promise.all([
        supabase.from('queries').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('vendors').select('*')
      ])

      const queries = queriesRes.data || []
      const invoices = invoicesRes.data || []
      const vendors = vendorsRes.data || []

      // Calculate metrics
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0)
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0)
      const totalProfit = totalRevenue * 0.15 // Assuming 15% margin
      const completedBookings = queries.filter(q => q.status === 'Completed').length
      const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0
      const conversionRate = queries.length > 0 ? (completedBookings / queries.length) * 100 : 0

      // Top destinations
      const destinationMap = queries.reduce((acc: any, q) => {
        if (!acc[q.destination]) {
          acc[q.destination] = { count: 0, revenue: 0 }
        }
        acc[q.destination].count++
        return acc
      }, {})

      const topDestinations = Object.entries(destinationMap)
        .map(([name, data]: [string, any]) => ({
          name,
          count: data.count,
          revenue: data.revenue
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Monthly revenue (last 6 months)
      const monthlyData: any = {}
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i)
        const key = format(month, 'MMM yyyy')
        monthlyData[key] = { revenue: 0, bookings: 0 }
      }

      invoices.forEach(inv => {
        const monthKey = format(parseISO(inv.created_at), 'MMM yyyy')
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].revenue += inv.amount
        }
      })

      queries.forEach(q => {
        if (q.status === 'Completed') {
          const monthKey = format(parseISO(q.created_at), 'MMM yyyy')
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].bookings++
          }
        }
      })

      const monthlyRevenue = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
        month,
        revenue: data.revenue,
        bookings: data.bookings
      }))

      // Status breakdown
      const statusMap = queries.reduce((acc: any, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1
        return acc
      }, {})

      const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
        status,
        count: count as number
      }))

      // Vendor spending
      const vendorSpending = vendors
        .map(v => ({
          vendor: v.name,
          amount: v.balance
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      setReportData({
        totalRevenue,
        totalProfit,
        totalQueries: queries.length,
        completedBookings,
        pendingPayments: totalRevenue - totalPaid,
        averageBookingValue,
        conversionRate,
        topDestinations,
        monthlyRevenue,
        statusBreakdown,
        vendorSpending
      })
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', `₹${reportData.totalRevenue.toLocaleString('en-IN')}`],
      ['Total Profit', `₹${reportData.totalProfit.toLocaleString('en-IN')}`],
      ['Total Queries', reportData.totalQueries],
      ['Completed Bookings', reportData.completedBookings],
      ['Conversion Rate', `${reportData.conversionRate.toFixed(1)}%`],
      ['Average Booking Value', `₹${reportData.averageBookingValue.toLocaleString('en-IN')}`],
      ['Pending Payments', `₹${reportData.pendingPayments.toLocaleString('en-IN')}`],
      [],
      ['Top Destinations', 'Count'],
      ...reportData.topDestinations.map(d => [d.name, d.count]),
      [],
      ['Month', 'Revenue', 'Bookings'],
      ...reportData.monthlyRevenue.map(m => [m.month, m.revenue, m.bookings])
    ]

    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `billoo-travel-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!reportData) {
    return <div className="text-center py-12 text-gray-600">No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <button onClick={exportToCSV} className="btn btn-primary">
          <Download className="w-5 h-5 mr-2" />
          Export to CSV
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="input"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="input"
            />
          </div>
          <button onClick={loadReportData} className="btn btn-secondary">
            <Filter className="w-4 h-4 mr-2" />
            Apply Filter
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">
                ₹{reportData.totalRevenue.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Profit</p>
              <p className="text-2xl font-bold text-blue-900">
                ₹{reportData.totalProfit.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-900">
                {reportData.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-700" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Avg. Booking Value</p>
              <p className="text-2xl font-bold text-orange-900">
                ₹{reportData.averageBookingValue.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-orange-200 rounded-lg">
              <FileText className="w-6 h-6 text-orange-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue & Bookings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue (₹)" />
              <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} name="Bookings" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Query Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.statusBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count }) => `${status}: ${count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {reportData.statusBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Destinations */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Destinations</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.topDestinations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" name="Queries" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendor Spending */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vendor Balances</h3>
          <div className="space-y-3">
            {reportData.vendorSpending.map((vendor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold`}
                       style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{vendor.vendor}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">
                  ₹{vendor.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Metric</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Total Queries</td>
                <td className="py-3 px-4 text-sm text-gray-900 font-medium text-right">{reportData.totalQueries}</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Completed Bookings</td>
                <td className="py-3 px-4 text-sm text-gray-900 font-medium text-right">{reportData.completedBookings}</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Conversion Rate</td>
                <td className="py-3 px-4 text-sm text-gray-900 font-medium text-right">{reportData.conversionRate.toFixed(1)}%</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Total Revenue</td>
                <td className="py-3 px-4 text-sm text-green-600 font-bold text-right">₹{reportData.totalRevenue.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Estimated Profit</td>
                <td className="py-3 px-4 text-sm text-blue-600 font-bold text-right">₹{reportData.totalProfit.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Pending Payments</td>
                <td className="py-3 px-4 text-sm text-orange-600 font-bold text-right">₹{reportData.pendingPayments.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-700">Average Booking Value</td>
                <td className="py-3 px-4 text-sm text-gray-900 font-medium text-right">₹{reportData.averageBookingValue.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
