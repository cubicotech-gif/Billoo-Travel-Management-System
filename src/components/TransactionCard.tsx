import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  MapPin,
  User,
  FileText
} from 'lucide-react'
import { Database } from '@/types/database'
import { format } from 'date-fns'

type VendorTransaction = Database['public']['Tables']['vendor_transactions']['Row'] & {
  queries?: { query_number: string; client_name: string; destination: string }
  passengers?: { first_name: string; last_name: string }
}

interface TransactionCardProps {
  transaction: VendorTransaction
  onUpdate: () => void
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatCurrency = (amount: number, currency = 'PKR') => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      overpaid: { bg: 'bg-blue-100', text: 'text-blue-800', icon: DollarSign }
    }

    const badge = badges[status] || badges.pending
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </span>
    )
  }

  const getServiceIcon = (type: string) => {
    // Return appropriate icon based on service type
    const icons: Record<string, string> = {
      Hotel: '🏨',
      Flight: '✈️',
      Transport: '🚗',
      Visa: '📝',
      Tour: '🗺️',
      Insurance: '🛡️',
      Other: '📦'
    }
    return icons[type] || '📦'
  }

  const handleMarkAsPaid = () => {
    alert('Payment recording will be available in next phase (Phase 5)')
  }

  const handleViewQuery = () => {
    // Navigate to query details
    // This could open a modal or navigate to the query page
    console.log('View query:', transaction.query_id)
  }

  const handleEdit = () => {
    // Open edit modal
    alert('Edit functionality will be available soon')
  }

  const handleDelete = () => {
    if (transaction.payment_status === 'paid') {
      alert('Cannot delete a paid transaction. This preserves accounting records.')
      return
    }

    if (confirm('Are you sure you want to delete this transaction?')) {
      // Delete transaction
      alert('Delete functionality will be implemented')
    }
  }

  const passengerName = transaction.passengers
    ? `${transaction.passengers.first_name} ${transaction.passengers.last_name}`
    : 'N/A'

  return (
    <div className="card hover:shadow-md transition-shadow border-l-4 border-purple-500">
      {/* Main Content */}
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">
                {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
              </span>
              <span className="text-gray-400">|</span>
              <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-purple-600">
                Query #{transaction.queries?.query_number || 'N/A'}
              </span>
              {transaction.queries?.client_name && (
                <>
                  <span className="text-gray-400">-</span>
                  <span className="text-sm text-gray-600 truncate">
                    {transaction.queries.client_name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div>
            {getStatusBadge(transaction.payment_status)}
          </div>
        </div>

        {/* Service Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{getServiceIcon(transaction.service_type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">{transaction.service_type}</span>
                {transaction.city && (
                  <>
                    <span className="text-gray-400">|</span>
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span className="text-sm text-gray-600">{transaction.city}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700">{transaction.service_description}</p>
            </div>
          </div>
        </div>

        {/* Currency & Amounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Currency Info */}
          <div className="space-y-2">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium mb-2">Currency & Exchange Rate</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Currency:</span> {transaction.currency}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Rate:</span> 1 {transaction.currency} = {transaction.exchange_rate_to_pkr.toFixed(2)} PKR
                </p>
              </div>
            </div>

            {transaction.booking_reference && (
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-600 font-medium mb-1">Booking Reference</p>
                <p className="text-sm font-mono text-gray-900">{transaction.booking_reference}</p>
              </div>
            )}
          </div>

          {/* Right Column - Financial Details */}
          <div className="space-y-2">
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600 font-medium mb-1">Purchase Amount</p>
              <p className="text-lg font-bold text-red-900">
                {transaction.purchase_amount_original.toLocaleString()} {transaction.currency}
              </p>
              <p className="text-sm text-gray-600">= {formatCurrency(transaction.purchase_amount_pkr)}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">Selling Amount</p>
              <p className="text-lg font-bold text-blue-900">
                {transaction.selling_amount_original.toLocaleString()} {transaction.currency}
              </p>
              <p className="text-sm text-gray-600">= {formatCurrency(transaction.selling_amount_pkr)}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium mb-1">Profit</p>
              <p className="text-lg font-bold text-green-900">
                {(transaction.selling_amount_original - transaction.purchase_amount_original).toLocaleString()} {transaction.currency}
              </p>
              <p className="text-sm text-gray-600">= {formatCurrency(transaction.profit_pkr)}</p>
            </div>
          </div>
        </div>

        {/* Passenger Info */}
        {transaction.passengers && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span className="font-medium">Passenger:</span>
            <span>{passengerName}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <button
            onClick={handleViewQuery}
            className="btn btn-secondary btn-sm"
          >
            <Eye className="w-4 h-4 mr-1" />
            View Query
          </button>

          {(transaction.payment_status === 'pending' || transaction.payment_status === 'partial') && (
            <button
              onClick={handleMarkAsPaid}
              className="btn btn-primary btn-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Mark as Paid
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-secondary btn-sm"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Less Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                More Details
              </>
            )}
          </button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-4 border-t space-y-4">
            <h4 className="font-semibold text-gray-900">Additional Details</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transaction Dates */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Transaction Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(transaction.updated_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>

              {/* Exchange Rate Breakdown */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 font-medium mb-2">Exchange Rate Breakdown</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>1 {transaction.currency} = {transaction.exchange_rate_to_pkr.toFixed(2)} PKR</p>
                  <p className="text-xs text-gray-500">
                    Purchase: {transaction.purchase_amount_original} × {transaction.exchange_rate_to_pkr.toFixed(2)} = {formatCurrency(transaction.purchase_amount_pkr)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Selling: {transaction.selling_amount_original} × {transaction.exchange_rate_to_pkr.toFixed(2)} = {formatCurrency(transaction.selling_amount_pkr)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            {transaction.payment_date && (
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium mb-2">Payment Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Payment Date:</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(transaction.payment_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {transaction.payment_method && (
                    <div>
                      <p className="text-gray-600">Payment Method:</p>
                      <p className="font-medium text-gray-900">{transaction.payment_method}</p>
                    </div>
                  )}
                  {transaction.payment_reference && (
                    <div>
                      <p className="text-gray-600">Reference:</p>
                      <p className="font-medium text-gray-900">{transaction.payment_reference}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-600">Amount Paid:</p>
                    <p className="font-medium text-green-900">{formatCurrency(transaction.amount_paid)}</p>
                  </div>
                </div>
                {transaction.payment_notes && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <p className="text-xs text-gray-600">Notes:</p>
                    <p className="text-sm text-gray-700">{transaction.payment_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {transaction.notes && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-xs text-yellow-600 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{transaction.notes}</p>
              </div>
            )}

            {/* Action Buttons in Expanded View */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleEdit}
                className="btn btn-secondary btn-sm"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className={`btn btn-sm ${
                  transaction.payment_status === 'paid'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
                disabled={transaction.payment_status === 'paid'}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </button>
              {transaction.payment_status === 'paid' && (
                <span className="text-xs text-gray-500 self-center">
                  (Paid transactions cannot be deleted)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
