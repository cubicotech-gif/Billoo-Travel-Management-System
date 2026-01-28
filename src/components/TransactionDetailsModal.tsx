import { X, DollarSign, FileText, MapPin, CreditCard, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { formatDualCurrency, formatExchangeRate, formatProfit, getCurrencyName } from '@/lib/formatCurrency'
import type { CurrencyCode } from '@/lib/formatCurrency'

interface Transaction {
  id: string
  vendor_id: string
  query_id: string
  service_id: string
  passenger_id: string | null
  transaction_date: string
  service_description: string
  service_type: string
  city: string | null
  currency: CurrencyCode
  exchange_rate_to_pkr: number
  purchase_amount_original: number
  purchase_amount_pkr: number
  selling_amount_original: number
  selling_amount_pkr: number
  profit_pkr: number
  payment_status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERPAID'
  amount_paid: number
  payment_date: string | null
  payment_method: string | null
  payment_reference: string | null
  payment_notes: string | null
  receipt_url: string | null
  booking_reference: string | null
  notes: string | null
  created_at: string
  // Joined data
  queries?: {
    query_number: string
    client_name: string
    destination: string
  }
  passengers?: {
    first_name: string
    last_name: string
  }
}

interface TransactionDetailsModalProps {
  transaction: Transaction
  onClose: () => void
  onViewQuery?: (queryId: string) => void
  onViewLedger?: (vendorId: string) => void
}

export default function TransactionDetailsModal({
  transaction,
  onClose,
  onViewQuery,
  onViewLedger,
}: TransactionDetailsModalProps) {
  const profit = formatProfit(transaction.profit_pkr)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'OVERPAID':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  const getServiceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hotel':
        return '🏨'
      case 'flight':
        return '✈️'
      case 'transport':
        return '🚗'
      case 'visa':
        return '📄'
      case 'tour':
        return '🎫'
      case 'insurance':
        return '🛡️'
      default:
        return '📦'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{getServiceIcon(transaction.service_type)}</div>
                <div>
                  <h3 className="text-xl font-bold text-white">{transaction.service_type} Transaction</h3>
                  <p className="text-sm text-purple-200 mt-1">
                    Transaction Date: {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(100vh-250px)] overflow-y-auto">
            {/* Query Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-purple-600" />
                Query Information
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Query Number:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.queries?.query_number || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Client Name:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.queries?.client_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Destination:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {transaction.queries?.destination || 'N/A'}
                  </span>
                </div>
                {onViewQuery && (
                  <button
                    onClick={() => onViewQuery(transaction.query_id)}
                    className="mt-2 w-full btn btn-secondary btn-sm flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Full Query
                  </button>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                Service Details
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Description:</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-xs">
                    {transaction.service_description}
                  </span>
                </div>
                {transaction.city && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">City:</span>
                    <span className="text-sm font-medium text-gray-900">{transaction.city}</span>
                  </div>
                )}
                {transaction.booking_reference && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Booking Reference:</span>
                    <span className="text-sm font-mono text-gray-900">{transaction.booking_reference}</span>
                  </div>
                )}
                {transaction.passengers && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Passenger:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {transaction.passengers.first_name} {transaction.passengers.last_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Details */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-purple-600" />
                Financial Details
              </h4>
              <div className="space-y-4">
                {/* Currency Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Transaction Currency:</span>
                    <span className="text-sm font-bold text-blue-900">
                      {getCurrencyName(transaction.currency)} ({transaction.currency})
                    </span>
                  </div>
                  {transaction.currency !== 'PKR' && (
                    <div className="mt-2 text-xs text-blue-800">
                      {formatExchangeRate(transaction.exchange_rate_to_pkr, transaction.currency)}
                    </div>
                  )}
                </div>

                {/* Purchase Amount */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Purchase Amount:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatDualCurrency(
                        transaction.purchase_amount_original,
                        transaction.currency,
                        transaction.purchase_amount_pkr
                      )}
                    </span>
                  </div>
                </div>

                {/* Selling Amount */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Selling Amount:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatDualCurrency(
                        transaction.selling_amount_original,
                        transaction.currency,
                        transaction.selling_amount_pkr
                      )}
                    </span>
                  </div>
                </div>

                {/* Profit */}
                <div className={`rounded-lg p-4 ${
                  transaction.profit_pkr >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Profit/Loss:</span>
                    <span className={`text-xl font-bold ${profit.colorClass}`}>
                      {profit.text}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                Payment Details
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.payment_status)}`}>
                    {transaction.payment_status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount Paid:</span>
                  <span className="text-sm font-bold text-gray-900">
                    Rs {transaction.amount_paid.toLocaleString()}
                  </span>
                </div>

                {transaction.payment_status !== 'PAID' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Outstanding:</span>
                    <span className="text-sm font-bold text-red-600">
                      Rs {(transaction.purchase_amount_pkr - transaction.amount_paid).toLocaleString()}
                    </span>
                  </div>
                )}

                {transaction.payment_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Date:</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(transaction.payment_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}

                {transaction.payment_method && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="text-sm text-gray-900">{transaction.payment_method}</span>
                  </div>
                )}

                {transaction.payment_reference && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Reference:</span>
                    <span className="text-sm font-mono text-gray-900">{transaction.payment_reference}</span>
                  </div>
                )}

                {transaction.payment_notes && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-gray-500">Payment Notes:</span>
                    <p className="text-sm text-gray-700 mt-1">{transaction.payment_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            {transaction.notes && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Notes</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{transaction.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 border-t pt-3">
              <div className="flex items-center justify-between">
                <span>Transaction ID: {transaction.id.slice(0, 8)}...</span>
                <span>Created: {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
            {onViewLedger && (
              <button
                onClick={() => onViewLedger(transaction.vendor_id)}
                className="btn btn-primary"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Full Ledger
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
