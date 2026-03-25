import { Link } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, XCircle, Building2, Users,
  FileText, DollarSign, ArrowRight, Upload
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import type { BulkUploadResult } from '@/types/finance'

interface BulkUploadResultsProps {
  result: BulkUploadResult
  onUploadAnother: () => void
}

export default function BulkUploadResults({ result, onUploadAnother }: BulkUploadResultsProps) {
  const newPassengers = result.passengers.filter(p => p.isNew).length
  const existingPassengers = result.passengers.filter(p => !p.isNew).length

  return (
    <div className="space-y-6">
      {/* Success / Error Header */}
      {result.success ? (
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-green-900">Import Successful!</h2>
          <p className="text-sm text-green-700 mt-1">All data has been imported and linked correctly.</p>
          <p className="text-xs text-green-600 mt-2 font-mono">Batch ID: {result.import_batch_id}</p>
        </div>
      ) : (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-red-900">Import Failed</h2>
          <p className="text-sm text-red-700 mt-1">Some operations completed before the error occurred.</p>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-800">Errors</h4>
          </div>
          <ul className="space-y-1">
            {result.errors.map((err, i) => (
              <li key={i} className="text-sm text-red-700">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-800">Warnings ({result.warnings.length})</h4>
          </div>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Results Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h3>
        <div className="space-y-4">
          {/* Vendor */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <Building2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Vendor: {result.vendor.name}</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                result.vendor.isNew ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {result.vendor.isNew ? 'CREATED' : 'LINKED'}
              </span>
            </div>
            <Link to={`/vendors/${result.vendor.id}`} className="text-sm text-primary-600 hover:text-primary-800">
              View <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </div>

          {/* Passengers */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-900">
                Passengers: {newPassengers} created, {existingPassengers} linked to existing
              </span>
            </div>
            <Link to="/passengers" className="text-sm text-primary-600 hover:text-primary-800">
              View <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </div>

          {/* Invoices */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-900">
                Invoices: {result.invoices.length} created
              </span>
              {result.invoices.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {result.invoices.map(inv => (
                    <div key={inv.id} className="text-xs text-gray-500">
                      {inv.invoice_number} — {inv.passenger_name} — {formatCurrency(inv.amount)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Link to="/finance/invoices" className="text-sm text-primary-600 hover:text-primary-800">
              View <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </div>

          {/* Invoice Items */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              Invoice Items: {result.invoice_items_count} created
            </span>
          </div>

          {/* Transactions */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <DollarSign className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-900">
                Vendor Payment Transactions: {result.transactions_count} created
              </span>
            </div>
            <Link to="/finance/transactions" className="text-sm text-primary-600 hover:text-primary-800">
              View <ArrowRight className="w-3 h-3 inline" />
            </Link>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="card bg-gradient-to-r from-primary-50 to-purple-50 border-2 border-primary-200">
        <div className="text-center">
          <p className="text-sm text-primary-700">Total Imported Value</p>
          <p className="text-3xl font-bold text-primary-900">{formatCurrency(result.total_imported_pkr)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/finance" className="btn btn-primary">
          <DollarSign className="w-4 h-4 mr-2" />
          View Finance Dashboard
        </Link>
        <button onClick={onUploadAnother} className="btn btn-secondary">
          <Upload className="w-4 h-4 mr-2" />
          Upload Another File
        </button>
      </div>
    </div>
  )
}
