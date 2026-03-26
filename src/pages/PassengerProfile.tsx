import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'
import {
  ArrowLeft, User, Phone, Mail, MessageCircle, CreditCard, Calendar,
  MapPin, Shield, Tag, Edit2, Save, X, FileText, DollarSign,
  ClipboardList, Activity, ChevronRight, ExternalLink, Loader, ArrowRightLeft
} from 'lucide-react'
import { format } from 'date-fns'
import DocumentUpload from '@/components/DocumentUpload'
import DocumentList from '@/components/DocumentList'
import CommunicationLog from '@/components/CommunicationLog'
import AddCommunication from '@/components/AddCommunication'
import OutstandingBalance from '@/components/passengers/OutstandingBalance'
import PassengerQuickActions from '@/components/passengers/PassengerQuickActions'
import RecordPaymentModal from '@/components/passengers/RecordPaymentModal'
import RecordRefundModal from '@/components/passengers/RecordRefundModal'
import PaymentReminderModal from '@/components/passengers/PaymentReminderModal'
import PassengerStatement from '@/components/passengers/PassengerStatement'
import { fetchPassengerTransactions } from '@/lib/api/passengers'
import { TRANSACTION_TYPE_CONFIG, PAYMENT_METHOD_LABELS } from '@/types/finance'

interface Passenger {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  whatsapp: string | null
  cnic: string | null
  gender: 'male' | 'female' | null
  city: string | null
  address: string | null
  country: string | null
  passport_number: string | null
  passport_expiry: string | null
  date_of_birth: string | null
  nationality: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  referred_by: string | null
  tags: string[]
  status: 'active' | 'inactive'
  notes: string | null
  credit_balance: number
  created_at: string
  updated_at: string
}

interface QueryLink {
  id: string
  query_id: string
  is_primary: boolean
  passenger_type: string
  query: {
    id: string
    query_number: string
    client_name: string
    destination: string
    travel_date: string | null
    return_date: string | null
    status: string
    selling_price: number
  }
}

interface Invoice {
  id: string
  invoice_number: string
  query_id: string | null
  amount: number
  paid_amount: number
  status: string
  due_date: string | null
  created_at: string
}

interface ActivityItem {
  id: string
  action: string
  description: string
  metadata: any
  created_at: string
}

type TabKey = 'overview' | 'financial' | 'queries' | 'documents' | 'notes'

export default function PassengerProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [passenger, setPassenger] = useState<Passenger | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  // Financial data
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [queryLinks, setQueryLinks] = useState<QueryLink[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])

  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showStatement, setShowStatement] = useState(false)

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const loadPassenger = useCallback(async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setPassenger({ ...data, tags: data.tags || [], status: data.status || 'active', credit_balance: Number(data.credit_balance || 0) })
      setNotesValue(data.notes || '')
    } catch (error) {
      console.error('Error loading passenger:', error)
      navigate('/passengers')
    }
  }, [id, navigate])

  const loadFinancials = useCallback(async () => {
    if (!id) return
    try {
      // Invoices for this passenger
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .eq('passenger_id', id)
        .order('created_at', { ascending: false })
      setInvoices(invData || [])

      // Linked queries
      const { data: qlData } = await supabase
        .from('query_passengers')
        .select(`
          id, query_id, is_primary, passenger_type,
          queries:query_id (
            id, query_number, client_name, destination,
            travel_date, return_date, status, selling_price
          )
        `)
        .eq('passenger_id', id)

      const transformed = (qlData || [])
        .filter((item: any) => item.queries)
        .map((item: any) => ({
          id: item.id,
          query_id: item.query_id,
          is_primary: item.is_primary,
          passenger_type: item.passenger_type,
          query: item.queries,
        }))
      setQueryLinks(transformed)

      // Transactions for this passenger
      const txnData = await fetchPassengerTransactions(id)
      setTransactions(txnData)

      // Activities
      const { data: actData } = await supabase
        .from('activities')
        .select('id, action, description, metadata, created_at')
        .eq('entity_type', 'passenger')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      setActivities(actData || [])
    } catch (error) {
      console.error('Error loading financials:', error)
    }
  }, [id])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadPassenger(), loadFinancials()])
      setLoading(false)
    }
    load()
  }, [loadPassenger, loadFinancials])

  const handleSaveNotes = async () => {
    if (!id) return
    setSavingNotes(true)
    try {
      const { error } = await supabase
        .from('passengers')
        .update({ notes: notesValue || null })
        .eq('id', id)
      if (error) throw error
      setEditingNotes(false)
      await loadPassenger()
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setSavingNotes(false)
    }
  }

  // Financial calculations — totalPaid from actual transactions, not invoice.paid_amount
  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const totalPaidFromTxns = transactions
    .filter(t => t.type === 'payment_received')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalRefunds = transactions
    .filter(t => t.type === 'refund_to_client')
    .reduce((s, t) => s + Number(t.amount), 0)
  const totalPaid = totalPaidFromTxns - totalRefunds
  const totalPending = Math.max(0, totalBilled - totalPaid)
  const creditBalance = passenger?.credit_balance || 0

  // Modal callback: reload all data after action
  const handleActionSuccess = async () => {
    setShowPaymentModal(false)
    setShowRefundModal(false)
    setShowReminderModal(false)
    await Promise.all([loadPassenger(), loadFinancials()])
  }

  if (loading || !passenger) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { key: 'financial', label: 'Financial History', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'queries', label: 'Queries & Services', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { key: 'notes', label: 'Notes & Activity', icon: <Activity className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/passengers')}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Passengers
      </button>

      {/* Header Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar + Name */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {passenger.first_name} {passenger.last_name}
                </h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  passenger.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {passenger.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact info row */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {passenger.phone}
                </span>
                {passenger.whatsapp && (
                  <span className="flex items-center gap-1 text-green-600">
                    <MessageCircle className="w-3.5 h-3.5" /> {passenger.whatsapp}
                  </span>
                )}
                {passenger.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {passenger.email}
                  </span>
                )}
                {passenger.passport_number && (
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" /> {passenger.passport_number}
                  </span>
                )}
                {passenger.cnic && (
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-gray-400" /> {passenger.cnic}
                  </span>
                )}
              </div>

              {/* Tags + Outstanding Badge */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <OutstandingBalance totalBilled={totalBilled} totalPaid={totalPaid} creditBalance={creditBalance} />
                {passenger.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <Tag className="w-3 h-3 mr-1" />{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats + Actions */}
          <div className="flex flex-col items-end gap-4 flex-shrink-0">
            <PassengerQuickActions
              onRecordPayment={() => setShowPaymentModal(true)}
              onRecordRefund={() => setShowRefundModal(true)}
              onSendReminder={() => setShowReminderModal(true)}
              onDownloadStatement={() => setShowStatement(true)}
              onCreateInvoice={() => navigate(`/finance/invoices/new?passenger_id=${passenger.id}`)}
              hasOutstanding={totalPending > 0}
            />
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBilled)}</p>
                <p className="text-xs text-gray-500">Total Billed</p>
              </div>
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                <p className="text-xs text-gray-500">Total Paid</p>
              </div>
              <div className="text-center px-4">
                <p className={`text-2xl font-bold ${totalPending > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {formatCurrency(totalPending)}
                </p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="text-center px-4">
                <p className="text-2xl font-bold text-primary-600">{queryLinks.length}</p>
                <p className="text-xs text-gray-500">Queries</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Financial Summary + Quick Actions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Financial cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
                  <p className="text-sm text-blue-600 mb-1">Total Billed</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalBilled)}</p>
                </div>
                <div className="card bg-gradient-to-br from-green-50 to-green-100">
                  <p className="text-sm text-green-600 mb-1">Total Paid</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
                </div>
                <div className={`card bg-gradient-to-br ${totalPending > 0 ? 'from-red-50 to-red-100' : 'from-gray-50 to-gray-100'}`}>
                  <p className={`text-sm mb-1 ${totalPending > 0 ? 'text-red-600' : 'text-gray-600'}`}>Outstanding</p>
                  <p className={`text-2xl font-bold ${totalPending > 0 ? 'text-red-900' : 'text-gray-400'}`}>{formatCurrency(totalPending)}</p>
                </div>
              </div>

              {/* Personal details */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {passenger.gender && (
                    <div>
                      <span className="text-gray-500">Gender:</span>
                      <span className="ml-2 text-gray-900 capitalize">{passenger.gender}</span>
                    </div>
                  )}
                  {passenger.date_of_birth && (
                    <div>
                      <span className="text-gray-500">Date of Birth:</span>
                      <span className="ml-2 text-gray-900">{format(new Date(passenger.date_of_birth), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  {passenger.nationality && (
                    <div>
                      <span className="text-gray-500">Nationality:</span>
                      <span className="ml-2 text-gray-900">{passenger.nationality}</span>
                    </div>
                  )}
                  {passenger.passport_expiry && (
                    <div>
                      <span className="text-gray-500">Passport Expiry:</span>
                      <span className="ml-2 text-gray-900">{format(new Date(passenger.passport_expiry), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  {passenger.city && (
                    <div>
                      <span className="text-gray-500">City:</span>
                      <span className="ml-2 text-gray-900">{passenger.city}{passenger.country ? `, ${passenger.country}` : ''}</span>
                    </div>
                  )}
                  {passenger.address && (
                    <div className="md:col-span-2">
                      <span className="text-gray-500">Address:</span>
                      <span className="ml-2 text-gray-900">{passenger.address}</span>
                    </div>
                  )}
                  {passenger.referred_by && (
                    <div>
                      <span className="text-gray-500">Referred By:</span>
                      <span className="ml-2 text-gray-900">{passenger.referred_by}</span>
                    </div>
                  )}
                  {(passenger.emergency_contact_name || passenger.emergency_contact_phone) && (
                    <div className="md:col-span-2 pt-3 border-t border-gray-200">
                      <span className="text-gray-500">Emergency Contact:</span>
                      <span className="ml-2 text-gray-900">
                        {passenger.emergency_contact_name}
                        {passenger.emergency_contact_phone && ` (${passenger.emergency_contact_phone})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Recent Activity */}
            <div className="space-y-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No activity recorded yet</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activities.slice(0, 10).map(act => (
                      <div key={act.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 mt-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-gray-900">{act.description}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(new Date(act.created_at), 'dd MMM yyyy, hh:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick recent queries */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Queries</h3>
                {queryLinks.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No queries linked yet</p>
                ) : (
                  <div className="space-y-2">
                    {queryLinks.slice(0, 5).map(ql => (
                      <Link
                        key={ql.id}
                        to={`/queries/${ql.query.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ql.query.query_number}</p>
                          <p className="text-xs text-gray-500">{ql.query.destination}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== FINANCIAL HISTORY TAB ===== */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="card grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Total Billed</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBilled)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className={`text-2xl font-bold ${totalPending > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {formatCurrency(totalPending)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Credit Balance</p>
                <p className={`text-2xl font-bold ${creditBalance > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {formatCurrency(creditBalance)}
                </p>
              </div>
            </div>

            {/* Invoices */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices</h3>
              {invoices.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No invoices found for this passenger</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Due</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map(inv => {
                        const due = Number(inv.amount) - Number(inv.paid_amount)
                        return (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {format(new Date(inv.created_at), 'dd MMM yyyy')}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(Number(inv.amount))}</td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(Number(inv.paid_amount))}</td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${due > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {formatCurrency(due)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                inv.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment History Timeline */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No transactions recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(txn => {
                    const config = TRANSACTION_TYPE_CONFIG[txn.type as keyof typeof TRANSACTION_TYPE_CONFIG]
                    const isIn = txn.direction === 'in'
                    const hasROE = txn.original_currency && txn.original_currency !== 'PKR'
                    return (
                      <div key={txn.id} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isIn ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <DollarSign className={`w-5 h-5 ${isIn ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                              {config?.label || txn.type}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">{txn.transaction_number}</span>
                            {txn.invoices?.invoice_number && (
                              <span className="text-xs text-blue-600">
                                {txn.invoices.invoice_number}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{txn.description || '—'}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{format(new Date(txn.transaction_date), 'dd MMM yyyy')}</span>
                            {txn.payment_method && (
                              <span>{PAYMENT_METHOD_LABELS[txn.payment_method] || txn.payment_method}</span>
                            )}
                            {hasROE && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <ArrowRightLeft className="w-3 h-3" />
                                {txn.original_currency} {Number(txn.original_amount).toLocaleString()} @ {txn.exchange_rate}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`text-right flex-shrink-0 ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="text-lg font-semibold">{isIn ? '+' : '-'}{formatCurrency(txn.amount)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ledger View */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ledger View</h3>
              {(invoices.length === 0 && transactions.length === 0) ? (
                <p className="text-sm text-gray-500 py-8 text-center">No transactions to display</p>
              ) : (
                <TransactionLedgerTable invoices={invoices} transactions={transactions} />
              )}
            </div>
          </div>
        )}

        {/* ===== QUERIES & SERVICES TAB ===== */}
        {activeTab === 'queries' && (
          <div className="space-y-4">
            {queryLinks.length === 0 ? (
              <div className="card text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No queries linked yet</p>
                <p className="text-sm text-gray-500 mt-1">This passenger hasn't been added to any travel queries</p>
              </div>
            ) : (
              queryLinks.map(ql => (
                <Link
                  key={ql.id}
                  to={`/queries/${ql.query.id}`}
                  className="card flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{ql.query.query_number}</p>
                        {ql.is_primary && (
                          <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Primary</span>
                        )}
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                          {ql.passenger_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                        {ql.query.destination}
                        {ql.query.travel_date && (
                          <span className="ml-2">
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />
                            {format(new Date(ql.query.travel_date), 'dd MMM yyyy')}
                            {ql.query.return_date && ` — ${format(new Date(ql.query.return_date), 'dd MMM yyyy')}`}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(Number(ql.query.selling_price))}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ql.query.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        ql.query.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {ql.query.status}
                      </span>
                    </div>
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* ===== DOCUMENTS TAB ===== */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h3>
              <DocumentUpload entityType="passenger" entityId={passenger.id} onUploadComplete={loadPassenger} />
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
              <DocumentList entityType="passenger" entityId={passenger.id} />
            </div>
          </div>
        )}

        {/* ===== NOTES & ACTIVITY TAB ===== */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
                {!editingNotes ? (
                  <button
                    onClick={() => { setEditingNotes(true); setNotesValue(passenger.notes || '') }}
                    className="btn btn-secondary btn-sm"
                  >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveNotes} disabled={savingNotes} className="btn btn-primary btn-sm">
                      <Save className="w-4 h-4 mr-1" /> {savingNotes ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingNotes(false)} className="btn btn-secondary btn-sm">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {editingNotes ? (
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="input w-full"
                  rows={10}
                  placeholder="Add notes about this passenger..."
                />
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap min-h-[100px]">
                  {passenger.notes || <span className="text-gray-400 italic">No notes added yet</span>}
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No activity recorded</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {activities.map(act => (
                    <div key={act.id} className="flex items-start gap-3 text-sm border-b border-gray-100 pb-3 last:border-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        act.action === 'created' ? 'bg-green-100' :
                        act.action === 'updated' ? 'bg-blue-100' :
                        act.action === 'status_changed' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        <Activity className={`w-4 h-4 ${
                          act.action === 'created' ? 'text-green-600' :
                          act.action === 'updated' ? 'text-blue-600' :
                          act.action === 'status_changed' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">{act.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(act.created_at), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Communications section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Communications</h4>
                <AddCommunication
                  entityType="passenger"
                  entityId={passenger.id}
                  contactPhone={passenger.phone}
                  contactEmail={passenger.email || undefined}
                  onSuccess={loadFinancials}
                />
                <div className="mt-4">
                  <CommunicationLog entityType="passenger" entityId={passenger.id} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {showPaymentModal && (
        <RecordPaymentModal
          passengerId={passenger.id}
          passengerName={`${passenger.first_name} ${passenger.last_name}`}
          onSuccess={handleActionSuccess}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {showRefundModal && (
        <RecordRefundModal
          passengerId={passenger.id}
          passengerName={`${passenger.first_name} ${passenger.last_name}`}
          onSuccess={handleActionSuccess}
          onCancel={() => setShowRefundModal(false)}
        />
      )}

      {showReminderModal && (
        <PaymentReminderModal
          passengerId={passenger.id}
          passengerName={`${passenger.first_name} ${passenger.last_name}`}
          passengerPhone={passenger.phone}
          passengerWhatsapp={passenger.whatsapp}
          outstandingAmount={totalPending}
          onSuccess={handleActionSuccess}
          onCancel={() => setShowReminderModal(false)}
        />
      )}

      {showStatement && (
        <PassengerStatement
          passengerName={`${passenger.first_name} ${passenger.last_name}`}
          passengerPhone={passenger.phone}
          passengerEmail={passenger.email}
          transactions={transactions}
          invoices={invoices}
          totalBilled={totalBilled}
          totalPaid={totalPaid}
          creditBalance={creditBalance}
          onClose={() => setShowStatement(false)}
        />
      )}
    </div>
  )
}

// Transaction-based ledger: invoices as debits, actual transactions as credits
function TransactionLedgerTable({ invoices, transactions }: { invoices: Invoice[]; transactions: any[] }) {
  const entries: { date: string; description: string; debit: number; credit: number; ref: string }[] = []

  // Invoices as debits
  const sorted = [...invoices].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  for (const inv of sorted) {
    entries.push({
      date: inv.created_at,
      description: `Invoice ${inv.invoice_number}`,
      debit: Number(inv.amount),
      credit: 0,
      ref: inv.invoice_number,
    })
  }

  // Payment transactions as credits
  const paymentTxns = transactions.filter(t => t.type === 'payment_received')
  for (const txn of paymentTxns) {
    entries.push({
      date: txn.transaction_date,
      description: txn.description || 'Payment Received',
      debit: 0,
      credit: Number(txn.amount),
      ref: txn.transaction_number,
    })
  }

  // Refund transactions reduce credits
  const refundTxns = transactions.filter(t => t.type === 'refund_to_client')
  for (const txn of refundTxns) {
    entries.push({
      date: txn.transaction_date,
      description: txn.description || 'Refund Issued',
      debit: Number(txn.amount),
      credit: 0,
      ref: txn.transaction_number,
    })
  }

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let runningBalance = 0

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {entries.map((entry, i) => {
            runningBalance += entry.debit - entry.credit
            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.ref}</td>
                <td className="px-4 py-3 text-gray-900">{entry.description}</td>
                <td className="px-4 py-3 text-right text-red-600">
                  {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${runningBalance > 0 ? 'text-red-600' : runningBalance < 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                  {formatCurrency(Math.abs(runningBalance))}
                  {runningBalance < 0 ? ' CR' : runningBalance > 0 ? ' DR' : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
