import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, DollarSign, Loader, AlertCircle,
  Calendar, User, Hash, Printer, Wallet
} from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/formatCurrency'
import { fetchInvoiceById, fetchInvoiceItems, fetchInvoicePayments, updateInvoice } from '@/lib/api/finance'
import StatusBadge from '@/components/shared/StatusBadge'
import AmountDisplay from '@/components/shared/AmountDisplay'
import TransactionForm from '@/components/finance/TransactionForm'
import InlineLineItemEditor from '@/components/finance/InlineLineItemEditor'
import InvoicePrintView from '@/components/finance/InvoicePrintView'
import ApplyCreditModal from '@/components/finance/ApplyCreditModal'
import type { Invoice, InvoiceInsert, InvoiceItem, Transaction, InvoiceStatus } from '@/types/finance'
import { ALL_INVOICE_STATUSES } from '@/types/finance'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showPrintView, setShowPrintView] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditBalance, setCreditBalance] = useState(0)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [inv, itms, pmts] = await Promise.all([
        fetchInvoiceById(id!),
        fetchInvoiceItems(id!),
        fetchInvoicePayments(id!),
      ])
      setInvoice(inv)
      setItems(itms)
      setPayments(pmts)

      // Load passenger credit balance if applicable
      if (inv.passenger_id) {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('passengers')
          .select('credit_balance')
          .eq('id', inv.passenger_id)
          .limit(1)
        if (data && data[0]) {
          setCreditBalance(data[0].credit_balance || 0)
        }
      }
    } catch (err) {
      console.error('Error loading invoice:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return
    setUpdatingStatus(true)
    try {
      const updates: Partial<InvoiceInsert> = { status: newStatus }
      if (newStatus === 'paid') {
        updates.paid_amount = invoice.amount
      } else if (newStatus === 'pending' || newStatus === 'draft') {
        updates.paid_amount = 0
      }

      await updateInvoice(invoice.id, updates)
      setInvoice({ ...invoice, ...updates, status: newStatus })
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Invoice not found</p>
        <button onClick={() => navigate('/finance/invoices')} className="btn btn-secondary mt-4">
          Back to Invoices
        </button>
      </div>
    )
  }

  const balance = invoice.amount - invoice.paid_amount
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() &&
    !['paid', 'cancelled'].includes(invoice.status)
  const passengerName = invoice.passengers
    ? `${invoice.passengers.first_name} ${invoice.passengers.last_name}`
    : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/finance/invoices')} className="btn btn-secondary btn-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <StatusBadge status={isOverdue ? 'overdue' : invoice.status} type="invoice" size="md" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created {format(new Date(invoice.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Print button */}
          <button onClick={() => setShowPrintView(true)} className="btn btn-secondary btn-sm">
            <Printer className="w-4 h-4 mr-1" /> Print
          </button>

          {/* Apply Credit button */}
          {balance > 0 && creditBalance > 0 && invoice.status !== 'cancelled' && (
            <button onClick={() => setShowCreditModal(true)} className="btn btn-secondary btn-sm">
              <Wallet className="w-4 h-4 mr-1" /> Apply Credit ({formatCurrency(creditBalance)})
            </button>
          )}

          {/* Edit toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            {editMode ? 'Done Editing' : 'Edit Invoice'}
          </button>

          {/* Record Payment */}
          {balance > 0 && invoice.status !== 'cancelled' && (
            <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
              <DollarSign className="w-4 h-4 mr-2" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">
            This invoice is overdue. Due date was {format(new Date(invoice.due_date!), 'MMM d, yyyy')}.
          </p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(invoice.paid_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance Due</p>
                <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Profit</p>
                <p className={`text-xl font-bold ${(invoice.total_profit || 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatCurrency(invoice.total_profit || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice-level ROE info */}
          {invoice.original_currency && invoice.original_currency !== 'PKR' && invoice.exchange_rate && (
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span className="font-medium">Exchange Rate:</span>
                <span>1 {invoice.original_currency} = {invoice.exchange_rate} PKR</span>
                {invoice.original_amount && (
                  <span className="ml-4">
                    Original: {invoice.original_currency} {invoice.original_amount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Line Items - Edit mode or read-only */}
          <div className="card">
            {editMode ? (
              <InlineLineItemEditor
                invoiceId={invoice.id}
                items={items}
                onItemsChanged={loadData}
              />
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Line Items ({items.length})
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No line items</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map(item => {
                          const hasROE = item.original_currency && item.original_currency !== 'PKR' && item.exchange_rate
                          return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.description}
                              {hasROE && (
                                <div className="text-xs text-blue-600 mt-0.5">
                                  {item.original_currency}: {item.purchase_price_original?.toLocaleString()} → {item.selling_price_original?.toLocaleString()} @ {item.exchange_rate}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.service_type || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              {item.vendors ? (
                                <Link to={`/vendors/${item.vendor_id}`} className="text-purple-600 hover:text-purple-800">
                                  {item.vendors.name}
                                </Link>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.purchase_price)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.total)}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={item.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {formatCurrency(item.profit)}
                              </span>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Totals</td>
                          <td className="px-4 py-3 text-sm font-bold text-right">{formatCurrency(invoice.amount)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-right">
                            <span className={(invoice.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(invoice.total_profit || 0)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment History */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment History ({payments.length})
            </h3>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No payments recorded</p>
            ) : (
              <div className="space-y-3">
                {payments.map(txn => (
                  <div key={txn.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      txn.direction === 'in' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <DollarSign className={`w-4 h-4 ${txn.direction === 'in' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{txn.transaction_number}</p>
                      <p className="text-xs text-gray-500">
                        {txn.description || txn.type.replace(/_/g, ' ')}
                        {txn.reference_number && ` · Ref: ${txn.reference_number}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <AmountDisplay amount={txn.amount} direction={txn.direction} showSign size="sm" />
                      <p className="text-xs text-gray-400">
                        {format(new Date(txn.transaction_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Status</dt>
                <dd className="mt-1">
                  <select
                    value={invoice.status}
                    onChange={e => handleStatusChange(e.target.value as InvoiceStatus)}
                    disabled={updatingStatus}
                    className="input text-sm"
                  >
                    {ALL_INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Currency</dt>
                <dd className="text-sm font-medium text-gray-900">{invoice.currency}</dd>
              </div>
              {invoice.due_date && (
                <div>
                  <dt className="text-xs text-gray-500">Due Date</dt>
                  <dd className="text-sm text-gray-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                  </dd>
                </div>
              )}
              {invoice.passengers && (
                <div>
                  <dt className="text-xs text-gray-500">Passenger</dt>
                  <dd>
                    <Link
                      to={`/passengers/${invoice.passenger_id}`}
                      className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      <User className="w-3.5 h-3.5" />
                      {passengerName}
                    </Link>
                  </dd>
                </div>
              )}
              {invoice.queries && (
                <div>
                  <dt className="text-xs text-gray-500">Query</dt>
                  <dd>
                    <Link
                      to={`/queries/${invoice.query_id}`}
                      className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      <Hash className="w-3.5 h-3.5" />
                      {invoice.queries.query_number}
                    </Link>
                  </dd>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <dt className="text-xs text-gray-500">Notes</dt>
                  <dd className="text-sm text-gray-700">{invoice.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Credit Balance */}
          {creditBalance > 0 && (
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-900">Passenger Credit</h3>
              </div>
              <p className="text-xl font-bold text-blue-800">{formatCurrency(creditBalance)}</p>
              <p className="text-xs text-blue-600 mt-1">Available to apply to this invoice</p>
            </div>
          )}

          {/* Cost Breakdown */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Revenue</span>
                <span className="font-medium">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cost</span>
                <span className="text-gray-700">{formatCurrency(invoice.total_cost)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-500">Profit</span>
                <span className={`font-bold ${(invoice.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(invoice.total_profit || 0)}
                </span>
              </div>
              {invoice.amount > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Margin</span>
                  <span>{((invoice.total_profit || 0) / invoice.amount * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Progress */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Progress</h3>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    invoice.paid_amount >= invoice.amount ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((invoice.paid_amount / invoice.amount) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatCurrency(invoice.paid_amount)} paid</span>
                <span>{invoice.amount > 0 ? `${((invoice.paid_amount / invoice.amount) * 100).toFixed(0)}%` : '0%'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <TransactionForm
          defaultType="payment_received"
          defaultPassengerId={invoice.passenger_id || undefined}
          defaultInvoiceId={invoice.id}
          onSuccess={() => {
            setShowPaymentModal(false)
            loadData()
          }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Print View */}
      {showPrintView && (
        <InvoicePrintView
          invoice={invoice}
          items={items}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* Apply Credit Modal */}
      {showCreditModal && invoice.passenger_id && (
        <ApplyCreditModal
          passengerId={invoice.passenger_id}
          passengerName={passengerName}
          creditBalance={creditBalance}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          invoiceBalance={balance}
          onSuccess={() => {
            setShowCreditModal(false)
            loadData()
          }}
          onCancel={() => setShowCreditModal(false)}
        />
      )}
    </div>
  )
}
