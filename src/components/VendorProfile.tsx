import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  CreditCard,
  DollarSign,
  Calendar,
  FileText,
  Edit,
  TrendingUp,
  Wallet
} from 'lucide-react'
import { Database } from '@/types/database'

type Vendor = Database['public']['Tables']['vendors']['Row']

interface VendorProfileProps {
  vendor: Vendor
  onEdit: () => void
  onClose: () => void
}

export default function VendorProfile({ vendor, onEdit, onClose }: VendorProfileProps) {
  const [transactionCount, setTransactionCount] = useState<number>(0)
  const [, setLoading] = useState(true)

  useEffect(() => {
    loadTransactionCount()
  }, [vendor.id])

  const loadTransactionCount = async () => {
    try {
      const { count, error } = await supabase
        .from('vendor_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', vendor.id)

      if (error) throw error
      setTransactionCount(count || 0)
    } catch (error) {
      console.error('Error loading transaction count:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Hotel': 'bg-blue-100 text-blue-800',
      'Airline': 'bg-sky-100 text-sky-800',
      'Transport': 'bg-green-100 text-green-800',
      'Visa Agent': 'bg-purple-100 text-purple-800',
      'Tour Operator': 'bg-orange-100 text-orange-800',
      'Insurance': 'bg-red-100 text-red-800',
      'Other': 'bg-gray-100 text-gray-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-purple-600 px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{vendor.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(vendor.type)}`}>
                      {vendor.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      vendor.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white transition-colors"
                  title="Edit Vendor"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(100vh-300px)] overflow-y-auto">
            {/* Financial Summary Cards */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Total Business</span>
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(vendor.total_business)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">{transactionCount} transactions</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">Total Paid</span>
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(vendor.total_paid)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {vendor.total_business > 0
                      ? `${((vendor.total_paid / vendor.total_business) * 100).toFixed(1)}% of total`
                      : 'No transactions'}
                  </p>
                </div>

                <div className={`${
                  vendor.total_pending > 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                } border rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      vendor.total_pending > 0 ? 'text-red-800' : 'text-gray-800'
                    }`}>
                      Pending
                    </span>
                    <CreditCard className={`w-5 h-5 ${
                      vendor.total_pending > 0 ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <p className={`text-2xl font-bold ${
                    vendor.total_pending > 0 ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {formatCurrency(vendor.total_pending)}
                  </p>
                  <p className={`text-xs mt-1 ${
                    vendor.total_pending > 0 ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {vendor.total_pending > 0 ? 'Outstanding amount' : 'All settled'}
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-800">Total Profit</span>
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(vendor.total_profit)}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    {vendor.total_business > 0
                      ? `${((vendor.total_profit / vendor.total_business) * 100).toFixed(1)}% margin`
                      : 'No profit yet'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {vendor.contact_person && (
                  <div className="flex items-start">
                    <User className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Person</p>
                      <p className="text-base text-gray-900">{vendor.contact_person}</p>
                    </div>
                  </div>
                )}

                {vendor.phone && (
                  <div className="flex items-start">
                    <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <a href={`tel:${vendor.phone}`} className="text-base text-purple-600 hover:text-purple-800">
                        {vendor.phone}
                      </a>
                    </div>
                  </div>
                )}

                {vendor.whatsapp_number && (
                  <div className="flex items-start">
                    <MessageCircle className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">WhatsApp</p>
                      <a
                        href={`https://wa.me/${vendor.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base text-green-600 hover:text-green-800"
                      >
                        {vendor.whatsapp_number}
                      </a>
                    </div>
                  </div>
                )}

                {vendor.email && (
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <a href={`mailto:${vendor.email}`} className="text-base text-purple-600 hover:text-purple-800">
                        {vendor.email}
                      </a>
                    </div>
                  </div>
                )}

                {vendor.address && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-base text-gray-900">{vendor.address}</p>
                    </div>
                  </div>
                )}

                {!vendor.contact_person && !vendor.phone && !vendor.whatsapp_number && !vendor.email && !vendor.address && (
                  <p className="text-sm text-gray-500 text-center py-2">No contact information available</p>
                )}
              </div>
            </div>

            {/* Banking Details */}
            {(vendor.bank_name || vendor.account_number || vendor.iban || vendor.swift_code) && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Banking Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {vendor.bank_name && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Bank Name</span>
                      <span className="text-base text-gray-900">{vendor.bank_name}</span>
                    </div>
                  )}

                  {vendor.account_number && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Account Number</span>
                      <span className="text-base text-gray-900 font-mono">{vendor.account_number}</span>
                    </div>
                  )}

                  {vendor.iban && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">IBAN</span>
                      <span className="text-base text-gray-900 font-mono">{vendor.iban}</span>
                    </div>
                  )}

                  {vendor.swift_code && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Swift Code</span>
                      <span className="text-base text-gray-900 font-mono">{vendor.swift_code}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Settings */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Credit Days</span>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-base text-gray-900 font-semibold">
                      {vendor.credit_days} {vendor.credit_days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                </div>

                {vendor.payment_method_preference && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Payment Preference</span>
                    <span className="text-base text-gray-900">{vendor.payment_method_preference}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {vendor.notes && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Notes</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FileText className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{vendor.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* View Full Ledger Button */}
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-gray-900">Complete Transaction History</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    View all {transactionCount} transactions, payment records, and detailed ledger
                  </p>
                </div>
                <button className="btn btn-primary whitespace-nowrap">
                  View Full Ledger
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Note: Full ledger with transactions will be available in Phase 3 (Accounting module)
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2">
            <button onClick={onEdit} className="btn btn-secondary">
              <Edit className="w-4 h-4 mr-2" />
              Edit Vendor
            </button>
            <button onClick={onClose} className="btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
