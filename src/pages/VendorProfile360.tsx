import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  ArrowLeft, Building2, Phone, Mail, MessageCircle, MapPin,
  Star, Tag, Edit2, Save, DollarSign, CreditCard,
  FileText, Activity, Loader, AlertTriangle,
  TrendingUp, Wallet, ExternalLink, ArrowRightLeft
} from 'lucide-react'
import { format } from 'date-fns'
import { Database } from '@/types/database'
import VendorForm from '@/components/VendorForm'
import VendorQuickActions from '@/components/vendors/VendorQuickActions'
import RecordVendorPaymentModal from '@/components/vendors/RecordVendorPaymentModal'
import RecordVendorRefundModal from '@/components/vendors/RecordVendorRefundModal'
import VendorStatement from '@/components/vendors/VendorStatement'
import VendorRunningLedger from '@/components/vendors/VendorRunningLedger'
import VendorPayablesBreakdown from '@/components/vendors/VendorPayablesBreakdown'
import {
  getVendorRunningAccount, getVendorLedgerEntries,
  getVendorServicesHistory, fetchVendorTransactions,
  type VendorRunningAccount, type VendorLedgerEntry,
} from '@/lib/api/vendors'
import { TRANSACTION_TYPE_CONFIG, PAYMENT_METHOD_LABELS } from '@/types/finance'

type Vendor = Database['public']['Tables']['vendors']['Row']

type TabId = 'overview' | 'financial' | 'services' | 'bank' | 'notes'

interface VendorTransaction {
  id: string
  query_id: string
  service_id: string
  transaction_date: string
  service_description: string
  service_type: string
  city: string | null
  currency: string
  purchase_amount_pkr: number
  selling_amount_pkr: number
  profit_pkr: number
  payment_status: string
  amount_paid: number
  booking_reference: string | null
  notes: string | null
  queries?: { query_number: string; client_name: string; destination: string }
  passengers?: { first_name: string; last_name: string }
}

interface QueryService {
  id: string
  query_id: string
  service_type: string
  service_description: string
  cost_price: number
  selling_price: number
  status: string
  booking_status: string
  booked_date: string | null
  created_at: string
  queries?: any
}

interface ActivityEntry {
  id: string
  action: string
  description: string
  created_at: string
  users?: any
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'financial', label: 'Financial History', icon: DollarSign },
  { id: 'services', label: 'Services Provided', icon: FileText },
  { id: 'bank', label: 'Bank & Payment Info', icon: CreditCard },
  { id: 'notes', label: 'Notes & Activity', icon: Activity },
]

const TYPE_COLORS: Record<string, string> = {
  'Airline': 'bg-sky-100 text-sky-800',
  'Hotel': 'bg-blue-100 text-blue-800',
  'Transport': 'bg-green-100 text-green-800',
  'Tour Operator': 'bg-orange-100 text-orange-800',
  'Visa Service': 'bg-purple-100 text-purple-800',
  'Insurance': 'bg-red-100 text-red-800',
  'Other': 'bg-gray-100 text-gray-800',
}

export default function VendorProfile360() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showEditForm, setShowEditForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showStatement, setShowStatement] = useState(false)

  // Tab data
  const [transactions, setTransactions] = useState<VendorTransaction[]>([])
  const [vendorTxns, setVendorTxns] = useState<any[]>([])
  const [queryServices, setQueryServices] = useState<QueryService[]>([])
  const [invoiceServices, setInvoiceServices] = useState<any[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Running account (computed from invoice_items + transactions)
  const [runningAccount, setRunningAccount] = useState<VendorRunningAccount | null>(null)
  const [ledgerEntries, setLedgerEntries] = useState<VendorLedgerEntry[]>([])
  const [financialSubTab, setFinancialSubTab] = useState<'ledger' | 'payments' | 'payables'>('ledger')

  const loadVendor = useCallback(async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setVendor(data)
      setNotes(data.notes || '')
    } catch (error) {
      console.error('Error loading vendor:', error)
      navigate('/vendors')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  const loadTransactions = useCallback(async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('vendor_transactions')
        .select(`
          *,
          queries:query_id (query_number, client_name, destination),
          passengers:passenger_id (first_name, last_name)
        `)
        .eq('vendor_id', id)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }, [id])

  const loadQueryServices = useCallback(async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('query_services')
        .select(`
          id, query_id, service_type, service_description, cost_price, selling_price,
          status, booking_status, booked_date, created_at,
          queries:query_id (query_number, client_name, destination)
        `)
        .eq('vendor_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQueryServices(data || [])
    } catch (error) {
      console.error('Error loading query services:', error)
    }
  }, [id])

  const loadActivities = useCallback(async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('id, action, description, created_at, users:user_id (full_name)')
        .eq('entity_type', 'vendor')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }, [id])

  const loadRunningAccount = useCallback(async () => {
    if (!id) return
    try {
      const [account, ledger, txns] = await Promise.all([
        getVendorRunningAccount(id),
        getVendorLedgerEntries(id),
        fetchVendorTransactions(id),
      ])
      setRunningAccount(account)
      setLedgerEntries(ledger)
      setVendorTxns(txns)
    } catch (err) {
      console.error('Error loading running account:', err)
    }
  }, [id])

  const loadInvoiceServices = useCallback(async () => {
    if (!id) return
    try {
      const data = await getVendorServicesHistory(id)
      setInvoiceServices(data)
    } catch (err) {
      console.error('Error loading invoice services:', err)
    }
  }, [id])

  useEffect(() => {
    loadVendor()
  }, [loadVendor])

  useEffect(() => {
    if (!vendor) return
    if (activeTab === 'overview') {
      loadActivities()
      loadRunningAccount()
    } else if (activeTab === 'financial') {
      loadTransactions()
      loadRunningAccount()
    } else if (activeTab === 'services') {
      loadQueryServices()
      loadInvoiceServices()
    } else if (activeTab === 'notes') {
      loadActivities()
    }
  }, [activeTab, vendor, loadTransactions, loadQueryServices, loadActivities, loadRunningAccount, loadInvoiceServices])

  const handleActionSuccess = async () => {
    setShowPaymentModal(false)
    setShowRefundModal(false)
    await Promise.all([loadVendor(), loadRunningAccount()])
  }

  const handleSaveNotes = async () => {
    if (!id) return
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ notes })
        .eq('id', id)

      if (error) throw error
      setVendor(prev => prev ? { ...prev, notes } : prev)
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Vendor not found</p>
        <button onClick={() => navigate('/vendors')} className="btn btn-primary mt-4">Back to Vendors</button>
      </div>
    )
  }

  const serviceTypes = vendor.service_types?.length ? vendor.service_types : [vendor.type]

  // Use running account if available (computed from actual data), fallback to vendor fields
  const totalOwed = runningAccount?.totalOwed ?? vendor.total_business
  const totalPaid = runningAccount?.totalPaid ?? vendor.total_paid
  const balanceDue = runningAccount?.balanceDue ?? vendor.total_pending
  const creditLimit = runningAccount?.creditLimit ?? vendor.credit_limit
  const creditUsagePercent = creditLimit > 0
    ? Math.min(100, (balanceDue / creditLimit) * 100)
    : 0
  const isOverCreditLimit = creditLimit > 0 && balanceDue > creditLimit

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/vendors')}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Vendors
      </button>

      {/* Header Card */}
      <div className="card bg-gradient-to-r from-purple-600 to-purple-800 text-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{vendor.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {serviceTypes.map(t => (
                  <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t] || TYPE_COLORS['Other']}`}>
                    {t}
                  </span>
                ))}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {vendor.is_active ? 'Active' : 'Inactive'}
                </span>
                {vendor.rating && (
                  <span className="flex items-center bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    <Star className="w-3 h-3 mr-1 fill-current" />{vendor.rating}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-purple-100">
                {vendor.contact_person && (
                  <span>{vendor.contact_person}</span>
                )}
                {vendor.phone && (
                  <span className="flex items-center"><Phone className="w-3 h-3 mr-1" />{vendor.phone}</span>
                )}
                {vendor.whatsapp_number && (
                  <span className="flex items-center"><MessageCircle className="w-3 h-3 mr-1" />{vendor.whatsapp_number}</span>
                )}
                {vendor.email && (
                  <span className="flex items-center"><Mail className="w-3 h-3 mr-1" />{vendor.email}</span>
                )}
                {(vendor.location || vendor.country) && (
                  <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{[vendor.location, vendor.country].filter(Boolean).join(', ')}</span>
                )}
              </div>
              {(vendor.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {vendor.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white bg-opacity-20 text-white">
                      <Tag className="w-3 h-3 mr-1" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <VendorQuickActions
              onRecordPayment={() => setShowPaymentModal(true)}
              onRecordRefund={() => setShowRefundModal(true)}
              onDownloadStatement={() => setShowStatement(true)}
              hasBalance={balanceDue > 0}
            />
            <button
              onClick={() => setShowEditForm(true)}
              className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white text-sm transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Total Owed</p>
            <p className="text-xl font-bold">{formatCurrency(totalOwed)}</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Total Paid</p>
            <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Balance Due</p>
            <p className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-300' : ''}`}>
              {formatCurrency(balanceDue)}
            </p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3">
            <p className="text-xs text-purple-200">Credit Limit</p>
            <p className="text-xl font-bold">
              {creditLimit > 0 ? formatCurrency(creditLimit) : '—'}
            </p>
            {creditLimit > 0 && (
              <div className="mt-1">
                <div className="bg-white bg-opacity-20 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${isOverCreditLimit ? 'bg-red-400' : 'bg-green-400'}`}
                    style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                  />
                </div>
                <p className="text-xs text-purple-200 mt-1">{creditUsagePercent.toFixed(0)}% used</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit Limit Warning */}
      {isOverCreditLimit && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Credit Limit Exceeded</p>
            <p className="text-sm text-red-700">
              Balance due ({formatCurrency(balanceDue)}) exceeds credit limit ({formatCurrency(creditLimit)}) by {formatCurrency(balanceDue - creditLimit)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab vendor={vendor} activities={activities}
            totalOwed={totalOwed} totalPaid={totalPaid} balanceDue={balanceDue} creditLimit={creditLimit}
            onRecordPayment={() => setShowPaymentModal(true)} />
        )}
        {activeTab === 'financial' && (
          <FinancialTab vendor={vendor} vendorId={vendor.id}
            totalOwed={totalOwed} totalPaid={totalPaid} balanceDue={balanceDue}
            transactions={transactions} vendorTxns={vendorTxns}
            financialSubTab={financialSubTab} setFinancialSubTab={setFinancialSubTab}
            onRecordPayment={() => setShowPaymentModal(true)} />
        )}
        {activeTab === 'services' && <ServicesTab services={queryServices} invoiceServices={invoiceServices} />}
        {activeTab === 'bank' && <BankTab vendor={vendor} />}
        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            setNotes={setNotes}
            savingNotes={savingNotes}
            onSave={handleSaveNotes}
            activities={activities}
          />
        )}
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <VendorForm
          vendor={vendor}
          onSuccess={() => {
            setShowEditForm(false)
            loadVendor()
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <RecordVendorPaymentModal
          vendorId={vendor.id}
          vendorName={vendor.name}
          balanceDue={balanceDue}
          onSuccess={handleActionSuccess}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <RecordVendorRefundModal
          vendorId={vendor.id}
          vendorName={vendor.name}
          onSuccess={handleActionSuccess}
          onCancel={() => setShowRefundModal(false)}
        />
      )}

      {/* Statement */}
      {showStatement && (
        <VendorStatement
          vendorName={vendor.name}
          vendorPhone={vendor.phone}
          vendorEmail={vendor.email}
          vendorContact={vendor.contact_person}
          ledgerEntries={ledgerEntries}
          totalOwed={totalOwed}
          totalPaid={totalPaid}
          balanceDue={balanceDue}
          onClose={() => setShowStatement(false)}
        />
      )}
    </div>
  )
}

// ─── Tab 1: Overview ────────────────────────────────────────────────
function OverviewTab({ activities, totalOwed, totalPaid, balanceDue, creditLimit, onRecordPayment }: {
  vendor?: Vendor; activities: ActivityEntry[];
  totalOwed: number; totalPaid: number; balanceDue: number; creditLimit: number;
  onRecordPayment: () => void
}) {
  const creditUsagePercent = creditLimit > 0
    ? Math.min(100, (balanceDue / creditLimit) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Total Owed</span>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalOwed)}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Total Paid</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-green-700 mt-1">
            {totalOwed > 0
              ? `${((totalPaid / totalOwed) * 100).toFixed(1)}% of total`
              : 'No business yet'}
          </p>
        </div>

        <div className={`border rounded-lg p-4 ${balanceDue > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${balanceDue > 0 ? 'text-red-800' : 'text-gray-800'}`}>Balance Due</span>
            <CreditCard className={`w-5 h-5 ${balanceDue > 0 ? 'text-red-600' : 'text-gray-600'}`} />
          </div>
          <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-gray-900'}`}>
            {formatCurrency(balanceDue)}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-800">Credit Limit Usage</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          {creditLimit > 0 ? (
            <>
              <p className="text-2xl font-bold text-purple-900">{creditUsagePercent.toFixed(0)}%</p>
              <div className="mt-2 bg-purple-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${creditUsagePercent > 100 ? 'bg-red-500' : creditUsagePercent > 80 ? 'bg-yellow-500' : 'bg-purple-600'}`}
                  style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                />
              </div>
              <p className="text-xs text-purple-700 mt-1">
                {formatCurrency(balanceDue)} / {formatCurrency(creditLimit)}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-purple-900">No limit set</p>
          )}
        </div>
      </div>

      {/* Quick Action */}
      {balanceDue > 0 && (
        <div className="flex justify-end">
          <button onClick={onRecordPayment} className="btn btn-primary">
            <DollarSign className="w-4 h-4 mr-2" />
            Record Payment to Vendor
          </button>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No activity recorded yet</p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 10).map(act => (
              <div key={act.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{act.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(act.created_at), 'MMM d, yyyy h:mm a')}
                    {act.users?.full_name && ` · ${act.users.full_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 2: Financial History ───────────────────────────────────────
function FinancialTab({ vendorId, totalOwed, totalPaid, balanceDue, vendorTxns, financialSubTab, setFinancialSubTab, onRecordPayment }: {
  vendor?: Vendor; vendorId: string;
  totalOwed: number; totalPaid: number; balanceDue: number;
  transactions?: VendorTransaction[]; vendorTxns: any[];
  financialSubTab: string; setFinancialSubTab: (v: any) => void;
  onRecordPayment: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-700">Total Owed</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-700">Total Paid</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${balanceDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-sm font-medium ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>Balance Due</p>
          <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-green-900'}`}>
            {formatCurrency(balanceDue)}
          </p>
        </div>
      </div>

      {/* Record Payment button */}
      {balanceDue > 0 && (
        <div className="flex justify-end">
          <button onClick={onRecordPayment} className="btn btn-primary bg-purple-600 hover:bg-purple-700">
            <DollarSign className="w-4 h-4 mr-2" /> Record Payment
          </button>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {[
            { key: 'ledger', label: 'Ledger View' },
            { key: 'payments', label: 'Payment History' },
            { key: 'payables', label: 'Payables Breakdown' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFinancialSubTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                financialSubTab === tab.key
                  ? 'bg-white border border-b-white border-gray-200 text-purple-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tab content */}
      {financialSubTab === 'ledger' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Running Account Ledger</h3>
          <VendorRunningLedger vendorId={vendorId} />
        </div>
      )}

      {financialSubTab === 'payments' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
          {vendorTxns.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No payment transactions recorded</p>
          ) : (
            <div className="space-y-3">
              {vendorTxns.map((txn: any) => {
                const config = TRANSACTION_TYPE_CONFIG[txn.type as keyof typeof TRANSACTION_TYPE_CONFIG]
                const isRefund = txn.type === 'refund_from_vendor'
                const hasROE = txn.original_currency && txn.original_currency !== 'PKR'
                return (
                  <div key={txn.id} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isRefund ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      <DollarSign className={`w-5 h-5 ${isRefund ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                          {config?.label || txn.type}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">{txn.transaction_number}</span>
                        {txn.payment_mode && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            txn.payment_mode === 'collective' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {txn.payment_mode === 'collective' ? 'Collective' : 'Specific'}
                          </span>
                        )}
                        {txn.passengers && (
                          <span className="text-xs text-purple-600">{txn.passengers.first_name} {txn.passengers.last_name}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{txn.description || '—'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{format(new Date(txn.transaction_date), 'dd MMM yyyy')}</span>
                        {txn.payment_method && <span>{PAYMENT_METHOD_LABELS[txn.payment_method] || txn.payment_method}</span>}
                        {txn.reference_number && <span>Ref: {txn.reference_number}</span>}
                        {hasROE && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <ArrowRightLeft className="w-3 h-3" />
                            {txn.original_currency} {Number(txn.original_amount).toLocaleString()} @ {txn.exchange_rate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-right flex-shrink-0 ${isRefund ? 'text-blue-600' : 'text-red-600'}`}>
                      <p className="text-lg font-semibold">{isRefund ? '+' : '-'}{formatCurrency(txn.amount)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {financialSubTab === 'payables' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payables Breakdown by Passenger</h3>
          <VendorPayablesBreakdown vendorId={vendorId} />
        </div>
      )}
    </div>
  )
}

// ─── Tab 3: Services Provided ───────────────────────────────────────
function ServicesTab({ services, invoiceServices }: { services: QueryService[]; invoiceServices: any[] }) {
  return (
    <div className="space-y-6">
    {/* Invoice-based services (from invoice_items) */}
    {invoiceServices.length > 0 && (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Services via Invoices ({invoiceServices.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost (PKR)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selling</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoiceServices.map((svc: any) => {
                const invoice = svc.invoices as any
                const passenger = invoice?.passengers
                return (
                  <tr key={svc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {invoice?.invoice_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {passenger ? (
                        <Link to={`/passengers/${passenger.id}`} className="text-purple-600 hover:text-purple-800">
                          {passenger.first_name} {passenger.last_name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{svc.description}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[svc.service_type] || TYPE_COLORS['Other']}`}>
                        {svc.service_type || 'Service'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(svc.purchase_price)}
                      {svc.original_currency && svc.original_currency !== 'PKR' && (
                        <span className="block text-xs text-blue-600">
                          {svc.original_currency} {Number(svc.purchase_price_original).toLocaleString()} @ {svc.exchange_rate}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(svc.selling_price)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${svc.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(svc.profit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {format(new Date(invoice?.created_at || svc.created_at), 'dd MMM yyyy')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Query-based services */}
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Query Services ({services.length})
      </h3>
      {services.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No services found for this vendor</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Query</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selling</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Booking Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {services.map(svc => (
                <tr key={svc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {svc.queries ? (
                      <Link
                        to={`/queries/${svc.query_id}`}
                        className="text-purple-600 hover:text-purple-800 font-medium flex items-center"
                      >
                        {svc.queries.query_number}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {svc.queries?.client_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {svc.service_description}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[svc.service_type] || TYPE_COLORS['Other']}`}>
                      {svc.service_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(svc.cost_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatCurrency(svc.selling_price)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {svc.booked_date ? format(new Date(svc.booked_date), 'MMM d, yyyy') : format(new Date(svc.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      svc.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      svc.booking_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      svc.booking_status === 'payment_sent' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {svc.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </div>
  )
}

// ─── Tab 4: Bank & Payment Info ─────────────────────────────────────
function BankTab({ vendor }: { vendor: Vendor }) {
  return (
    <div className="space-y-6">
      {/* Banking Details */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Details</h3>
        {vendor.bank_name || vendor.account_number || vendor.iban || vendor.swift_code || vendor.ifsc_code ? (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {[
              { label: 'Bank Name', value: vendor.bank_name },
              { label: 'Account Number', value: vendor.account_number, mono: true },
              { label: 'IBAN', value: vendor.iban, mono: true },
              { label: 'SWIFT Code', value: vendor.swift_code, mono: true },
              { label: 'IFSC Code', value: vendor.ifsc_code, mono: true },
              { label: 'PAN Number', value: vendor.pan_number, mono: true },
              { label: 'GST Number', value: vendor.gst_number, mono: true },
            ].filter(item => item.value).map(item => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">{item.label}</span>
                <span className={`text-base text-gray-900 ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">No banking details provided</p>
        )}
      </div>

      {/* Payment Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Credit Limit</span>
            <span className="text-base font-semibold text-gray-900">
              {vendor.credit_limit > 0 ? formatCurrency(vendor.credit_limit) : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Credit Days</span>
            <span className="text-base font-semibold text-gray-900">
              {vendor.credit_days} {vendor.credit_days === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Payment Terms</span>
            <span className="text-base font-semibold text-gray-900">
              {vendor.payment_terms} days
            </span>
          </div>
          {vendor.payment_method_preference && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Preferred Method</span>
              <span className="text-base text-gray-900">{vendor.payment_method_preference}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 5: Notes & Activity ────────────────────────────────────────
function NotesTab({
  notes, setNotes, savingNotes, onSave, activities
}: {
  notes: string
  setNotes: (v: string) => void
  savingNotes: boolean
  onSave: () => void
  activities: ActivityEntry[]
}) {
  return (
    <div className="space-y-6">
      {/* Editable Notes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
          <button
            onClick={onSave}
            disabled={savingNotes}
            className="btn btn-primary btn-sm"
          >
            {savingNotes ? (
              <><Loader className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-1" /> Save Notes</>
            )}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Add notes about this vendor..."
        />
      </div>

      {/* Activity Log */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No activity recorded yet</p>
        ) : (
          <div className="space-y-3">
            {activities.map(act => (
              <div key={act.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{act.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(act.created_at), 'MMM d, yyyy h:mm a')}
                    {act.users?.full_name && ` · ${act.users.full_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
