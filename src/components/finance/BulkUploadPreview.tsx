import {
  Building2, Users, FileText, DollarSign, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatCurrency'
import type { BulkUploadFile } from '@/types/finance'
import type { PreflightResult } from '@/lib/api/bulkUpload'

interface BulkUploadPreviewProps {
  data: BulkUploadFile
  preflight: PreflightResult
  onConfirm: () => void
  onCancel: () => void
  importing: boolean
}

export default function BulkUploadPreview({
  data, preflight, onConfirm, onCancel, importing,
}: BulkUploadPreviewProps) {
  const totalVendorPayments = data.service_records.reduce((s, sr) => s + sr.vendor_payment_amount_pkr, 0)
  const totalSellingPKR = data.service_records.reduce((s, sr) => s + sr.selling_price_pkr, 0)
  const totalCostPKR = data.service_records.reduce((s, sr) => s + sr.purchase_price_pkr, 0)
  const totalProfitPKR = totalSellingPKR - totalCostPKR

  return (
    <div className="space-y-6">
      {/* Duplicate Warnings */}
      {preflight.duplicateWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-800">Duplicate Warnings</h4>
          </div>
          <ul className="space-y-1">
            {preflight.duplicateWarnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700">{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-600">You can still proceed — these are warnings, not blockers.</p>
        </div>
      )}

      {/* Vendor Card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{data.vendor.name}</h3>
            <p className="text-sm text-gray-500">
              {data.vendor.service_types.join(', ')}
              {data.vendor.country && ` · ${data.vendor.country}`}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            preflight.vendor.isExisting
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {preflight.vendor.isExisting ? 'EXISTING' : 'NEW'}
          </span>
        </div>
      </div>

      {/* Passengers Table */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Passengers ({data.passengers.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Pax</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.passengers.map(pax => {
                const check = preflight.passengers.find(p => p.ref === pax.ref)
                return (
                  <tr key={pax.ref} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono text-gray-500">{pax.ref}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {pax.first_name} {pax.last_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-gray-600">{pax.pax_count || 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 capitalize">{pax.gender || '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        check?.isExisting
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {check?.isExisting ? 'EXISTING' : 'NEW'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Records Table */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Service Records ({data.service_records.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Passenger</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost SAR</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sell SAR</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit SAR</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sell PKR</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Vendor Pmt PKR</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pmt Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.service_records.map((sr, idx) => {
                const pax = data.passengers.find(p => p.ref === sr.passenger_ref)
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{sr.row}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {pax ? `${pax.first_name} ${pax.last_name}` : sr.passenger_ref}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{sr.service_type}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-900 max-w-[200px] truncate">{sr.service_description}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{sr.purchase_price_sar.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{sr.selling_price_sar.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={sr.profit_sar >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {sr.profit_sar.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(sr.selling_price_pkr)}</td>
                    <td className="px-3 py-2 text-right">
                      {sr.vendor_payment_amount_pkr > 0 ? (
                        <span className="text-red-600 font-medium">{formatCurrency(sr.vendor_payment_amount_pkr)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{sr.vendor_payment_date || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card bg-gray-50">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-900">Import Summary</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Passengers</p>
            <p className="text-xl font-bold text-gray-900">{data.passengers.length}</p>
            <p className="text-xs text-gray-500">
              {preflight.passengers.filter(p => p.isExisting).length} existing, {' '}
              {preflight.passengers.filter(p => !p.isExisting).length} new
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Service Records</p>
            <p className="text-xl font-bold text-gray-900">{data.service_records.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Selling (PKR)</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(totalSellingPKR)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Profit (PKR)</p>
            <p className={`text-xl font-bold ${totalProfitPKR >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(totalProfitPKR)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Vendor Payments (PKR)</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totalVendorPayments)}</p>
          </div>
          {data.summary && (
            <>
              <div>
                <p className="text-xs text-gray-500">Total Cost (SAR)</p>
                <p className="text-lg font-bold text-gray-700">{data.summary.total_purchase_cost_sar.toLocaleString()} SAR</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Selling (SAR)</p>
                <p className="text-lg font-bold text-gray-700">{data.summary.total_selling_price_sar.toLocaleString()} SAR</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Profit (SAR)</p>
                <p className="text-lg font-bold text-green-700">{data.summary.total_service_profit_sar.toLocaleString()} SAR</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* What will be created */}
      <div className="card border-2 border-dashed border-primary-300">
        <h4 className="font-semibold text-gray-900 mb-3">This import will create:</h4>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            <span>
              <strong>1 Vendor</strong> — {preflight.vendor.isExisting ? 'Link to existing' : 'Create new'}: {data.vendor.name}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            <span>
              <strong>{preflight.passengers.filter(p => !p.isExisting).length} new passenger(s)</strong>,
              {' '}{preflight.passengers.filter(p => p.isExisting).length} linked to existing
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            <span>
              <strong>{new Set(data.service_records.map(s => s.passenger_ref)).size} invoice(s)</strong> (one per passenger)
            </span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            <span><strong>{data.service_records.length} invoice items</strong></span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary-600" />
            <span>
              <strong>{data.service_records.filter(s => s.vendor_payment_amount_pkr > 0).length} vendor payment transaction(s)</strong>
            </span>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button onClick={onCancel} className="btn btn-secondary" disabled={importing}>
          Cancel
        </button>
        <button onClick={onConfirm} className="btn btn-primary" disabled={importing}>
          {importing ? 'Importing...' : 'Confirm Import'}
        </button>
      </div>
    </div>
  )
}
