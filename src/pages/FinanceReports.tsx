import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, DollarSign, Building2, FileText,
  Loader, Calendar
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  fetchProfitLossReport, fetchReceivablesReport,
  fetchPayablesReport, fetchTransactionSummary,
} from '@/lib/api/finance'
import TabsContainer from '@/components/shared/TabsContainer'
import type {
  ProfitLossReport, ReceivablesReport, PayablesReport, TransactionSummary,
} from '@/types/finance'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444']

export default function FinanceReports() {
  const [activeTab, setActiveTab] = useState('pnl')
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [pnl, setPnl] = useState<ProfitLossReport | null>(null)
  const [receivables, setReceivables] = useState<ReceivablesReport | null>(null)
  const [payables, setPayables] = useState<PayablesReport | null>(null)
  const [txnSummary, setTxnSummary] = useState<TransactionSummary | null>(null)

  useEffect(() => {
    loadAllReports()
  }, [])

  const loadAllReports = async () => {
    setLoading(true)
    try {
      const [p, r, pa, ts] = await Promise.all([
        fetchProfitLossReport(dateFrom || undefined, dateTo || undefined),
        fetchReceivablesReport(),
        fetchPayablesReport(),
        fetchTransactionSummary(dateFrom || undefined, dateTo || undefined),
      ])
      setPnl(p)
      setReceivables(r)
      setPayables(pa)
      setTxnSummary(ts)
    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'pnl', label: 'Profit & Loss', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'receivables', label: 'Receivables', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'payables', label: 'Payables', icon: <Building2 className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transaction Summary', icon: <FileText className="w-4 h-4" /> },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="mt-1 text-sm text-gray-600">Detailed financial analysis and insights</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" />
          <span className="text-gray-500">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" />
          <button onClick={loadAllReports} className="btn btn-secondary btn-sm">Apply</button>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-sm text-primary-600">Clear</button>
          )}
        </div>
      </div>

      <TabsContainer tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {/* P&L Tab */}
        {activeTab === 'pnl' && pnl && (
          <div className="space-y-6">
            {/* P&L Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(pnl.totalRevenue)}</p>
              </div>
              <div className="card bg-gray-50 border border-gray-200">
                <p className="text-sm font-medium text-gray-700">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(pnl.totalCost)}</p>
              </div>
              <div className="card bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-700">Gross Profit</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(pnl.grossProfit)}</p>
              </div>
              <div className="card bg-orange-50 border border-orange-200">
                <p className="text-sm font-medium text-orange-700">Expenses</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(pnl.expenses)}</p>
              </div>
              <div className={`card border ${pnl.netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-medium ${pnl.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Net Profit</p>
                <p className={`text-2xl font-bold ${pnl.netProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                  {formatCurrency(pnl.netProfit)}
                </p>
              </div>
              <div className="card bg-purple-50 border border-purple-200">
                <p className="text-sm font-medium text-purple-700">Profit Margin</p>
                <p className="text-2xl font-bold text-purple-900">{pnl.profitMargin.toFixed(1)}%</p>
              </div>
            </div>

            {/* P&L Breakdown Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Revenue', value: pnl.totalRevenue, fill: '#3b82f6' },
                  { name: 'Cost', value: pnl.totalCost, fill: '#6b7280' },
                  { name: 'Gross Profit', value: pnl.grossProfit, fill: '#10b981' },
                  { name: 'Expenses', value: pnl.expenses, fill: '#f59e0b' },
                  { name: 'Net Profit', value: pnl.netProfit, fill: pnl.netProfit >= 0 ? '#059669' : '#ef4444' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#3b82f6">
                    {[
                      { fill: '#3b82f6' },
                      { fill: '#6b7280' },
                      { fill: '#10b981' },
                      { fill: '#f59e0b' },
                      { fill: pnl.netProfit >= 0 ? '#059669' : '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Receivables Tab */}
        {activeTab === 'receivables' && receivables && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Billed</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(receivables.totalBilled)}</p>
              </div>
              <div className="card bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-700">Received</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(receivables.totalReceived)}</p>
              </div>
              <div className="card bg-orange-50 border border-orange-200">
                <p className="text-sm font-medium text-orange-700">Outstanding</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(receivables.totalOutstanding)}</p>
              </div>
              <div className="card bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-700">Overdue</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(receivables.overdueAmount)}</p>
              </div>
            </div>

            {/* Aging Buckets */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoices</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {receivables.agingBuckets.map((bucket, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{bucket.label}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(bucket.amount)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{bucket.count}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {receivables.totalOutstanding > 0
                            ? `${((bucket.amount / receivables.totalOutstanding) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payables Tab */}
        {activeTab === 'payables' && payables && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Payable</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(payables.totalPayable)}</p>
              </div>
              <div className="card bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-700">Paid</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(payables.totalPaid)}</p>
              </div>
              <div className="card bg-orange-50 border border-orange-200">
                <p className="text-sm font-medium text-orange-700">Outstanding</p>
                <p className="text-2xl font-bold text-orange-900">{formatCurrency(payables.totalOutstanding)}</p>
              </div>
            </div>

            {/* Vendor Breakdown */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Breakdown</h3>
              {payables.vendorBreakdown.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">All vendors settled</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Business</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payables.vendorBreakdown.map(v => (
                        <tr key={v.vendorId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            <Link to={`/vendors/${v.vendorId}`} className="text-purple-600 hover:text-purple-800 font-medium">
                              {v.vendorName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(v.totalBusiness)}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(v.totalPaid)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{formatCurrency(v.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Summary Tab */}
        {activeTab === 'transactions' && txnSummary && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card bg-green-50 border border-green-200">
                <p className="text-sm font-medium text-green-700">Total In</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(txnSummary.totalIn)}</p>
              </div>
              <div className="card bg-red-50 border border-red-200">
                <p className="text-sm font-medium text-red-700">Total Out</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(txnSummary.totalOut)}</p>
              </div>
              <div className={`card border ${txnSummary.netBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                <p className={`text-sm font-medium ${txnSummary.netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Balance</p>
                <p className={`text-2xl font-bold ${txnSummary.netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                  {formatCurrency(Math.abs(txnSummary.netBalance))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Type */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">By Transaction Type</h3>
                {txnSummary.byType.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No transactions</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={txnSummary.byType}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="amount"
                          nameKey="label"
                          label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {txnSummary.byType.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {txnSummary.byType.map((t, idx) => (
                        <div key={t.type} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="text-gray-700">{t.label}</span>
                            <span className="text-xs text-gray-400">({t.count})</span>
                          </div>
                          <span className="font-medium">{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* By Payment Method */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">By Payment Method</h3>
                {txnSummary.byMethod.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No transactions</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={txnSummary.byMethod} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="label" type="category" width={100} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="amount" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4">
                      {txnSummary.byMethod.map(m => (
                        <div key={m.method} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{m.label} ({m.count})</span>
                          <span className="font-medium">{formatCurrency(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </TabsContainer>
    </div>
  )
}
