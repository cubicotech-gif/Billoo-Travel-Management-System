import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, AlertCircle } from 'lucide-react'
import { Database } from '@/types/database'

type Vendor = Database['public']['Tables']['vendors']['Row']
type VendorInsert = Database['public']['Tables']['vendors']['Insert']

interface VendorFormProps {
  vendor?: Vendor | null
  onSuccess: () => void
  onCancel: () => void
}

const VENDOR_TYPES = [
  'Hotel',
  'Airline',
  'Transport',
  'Visa Agent',
  'Tour Operator',
  'Insurance',
  'Other'
]

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Cash',
  'Cheque',
  'Online Payment',
  'Other'
]

export default function VendorForm({ vendor, onSuccess, onCancel }: VendorFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<VendorInsert>({
    name: '',
    type: 'Hotel',
    contact_person: '',
    phone: '',
    whatsapp_number: '',
    email: '',
    address: '',
    bank_name: '',
    account_number: '',
    iban: '',
    swift_code: '',
    credit_days: 0,
    payment_method_preference: '',
    notes: '',
    is_active: true,
    is_deleted: false
  })

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        type: vendor.type,
        contact_person: vendor.contact_person || '',
        phone: vendor.phone || '',
        whatsapp_number: vendor.whatsapp_number || '',
        email: vendor.email || '',
        address: vendor.address || '',
        bank_name: vendor.bank_name || '',
        account_number: vendor.account_number || '',
        iban: vendor.iban || '',
        swift_code: vendor.swift_code || '',
        credit_days: vendor.credit_days,
        payment_method_preference: vendor.payment_method_preference || '',
        notes: vendor.notes || '',
        is_active: vendor.is_active
      })
    }
  }, [vendor])

  const validateForm = (): boolean => {
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Vendor name must be at least 2 characters')
      return false
    }

    if (!formData.type) {
      setError('Please select a vendor type')
      return false
    }

    if (formData.email && !isValidEmail(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      setError('Please enter a valid phone number')
      return false
    }

    if (formData.credit_days && formData.credit_days < 0) {
      setError('Credit days cannot be negative')
      return false
    }

    return true
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Clean up the data - convert empty strings to null for optional fields
      const cleanedData: VendorInsert = {
        ...formData,
        contact_person: formData.contact_person?.trim() || null,
        phone: formData.phone?.trim() || null,
        whatsapp_number: formData.whatsapp_number?.trim() || null,
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        bank_name: formData.bank_name?.trim() || null,
        account_number: formData.account_number?.trim() || null,
        iban: formData.iban?.trim() || null,
        swift_code: formData.swift_code?.trim() || null,
        payment_method_preference: formData.payment_method_preference?.trim() || null,
        notes: formData.notes?.trim() || null,
        credit_days: Number(formData.credit_days) || 0
      }

      let result

      if (vendor) {
        // Update existing vendor
        result = await supabase
          .from('vendors')
          .update(cleanedData)
          .eq('id', vendor.id)
      } else {
        // Insert new vendor
        result = await supabase
          .from('vendors')
          .insert([cleanedData])
      }

      if (result.error) throw result.error

      onSuccess()
    } catch (err: any) {
      console.error('Error saving vendor:', err)
      setError(err.message || 'Failed to save vendor. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {vendor ? 'Edit Vendor' : 'Add New Vendor'}
                </h3>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Form Content */}
            <div className="px-6 py-4 max-h-[calc(100vh-250px)] overflow-y-auto">
              {/* Section 1: Basic Information */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="e.g., Emirates Airlines, Marriott Hotel"
                      minLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input"
                    >
                      {VENDOR_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person || ''}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="input"
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input"
                      placeholder="+92 300 1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={formData.whatsapp_number || ''}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      className="input"
                      placeholder="+92 300 1234567"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank if same as phone number
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input"
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input"
                      placeholder="Full address including city and country"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Banking Details */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
                  Banking Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name || ''}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="input"
                      placeholder="e.g., Meezan Bank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.account_number || ''}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="input"
                      placeholder="Account number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={formData.iban || ''}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      className="input"
                      placeholder="SA1234567890123456789012"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      For international vendors only
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Swift Code
                    </label>
                    <input
                      type="text"
                      value={formData.swift_code || ''}
                      onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                      className="input"
                      placeholder="DEUTDEFF"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      For international transfers
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Payment Settings */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
                  Payment Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credit Days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.credit_days}
                      onChange={(e) => setFormData({ ...formData, credit_days: parseInt(e.target.value) || 0 })}
                      className="input"
                      placeholder="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Payment credit period (days). e.g., 30 means payment due in 30 days
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method Preference
                    </label>
                    <select
                      value={formData.payment_method_preference || ''}
                      onChange={(e) => setFormData({ ...formData, payment_method_preference: e.target.value })}
                      className="input"
                    >
                      <option value="">Select a method (optional)</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Notes */}
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
                  Additional Information
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input"
                    placeholder="Any additional information about this vendor..."
                  />
                </div>
              </div>

              {/* Section 5: Status */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">
                  Status
                </h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Vendor is active and can be selected for bookings
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary w-full sm:w-auto"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>{vendor ? 'Update Vendor' : 'Save Vendor'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
