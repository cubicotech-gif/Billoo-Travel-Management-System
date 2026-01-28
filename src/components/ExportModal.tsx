import { useState } from 'react'
import { X, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { Database } from '@/types/database'
import { exportTransactionsToCSV } from '@/lib/exportUtils'

type VendorTransaction = Database['public']['Tables']['vendor_transactions']['Row'] & {
  queries?: { query_number: string; client_name: string; destination: string }
  passengers?: { first_name: string; last_name: string }
}

interface ExportModalProps {
  transactions: VendorTransaction[]
  vendorName: string
  onClose: () => void
}

export default function ExportModal({ transactions, vendorName, onClose }: ExportModalProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [includeOptions, setIncludeOptions] = useState({
    transactionDetails: true,
    currencyBreakdown: true,
    paymentStatus: true,
    summaryTotals: true
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Filter transactions by date if specified
      let filteredTransactions = [...transactions]

      if (dateFrom) {
        filteredTransactions = filteredTransactions.filter(
          t => t.transaction_date >= dateFrom
        )
      }

      if (dateTo) {
        filteredTransactions = filteredTransactions.filter(
          t => t.transaction_date <= dateTo
        )
      }

      if (exportFormat === 'csv') {
        exportTransactionsToCSV(filteredTransactions, vendorName, includeOptions)
        setTimeout(() => {
          setIsExporting(false)
          onClose()
        }, 1000)
      } else {
        alert(`${exportFormat.toUpperCase()} export is coming soon!`)
        setIsExporting(false)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export. Please try again.')
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-6 h-6 text-white" />
                <h3 className="text-xl font-semibold text-white">Export Vendor Ledger</h3>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Vendor Info */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Exporting ledger for:</p>
              <p className="text-lg font-semibold text-gray-900">{vendorName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {transactions.length} transactions in current view
              </p>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value as 'csv')}
                    className="mr-3"
                  />
                  <FileSpreadsheet className="w-5 h-5 text-green-600 mr-2" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">CSV (Spreadsheet)</p>
                    <p className="text-xs text-gray-500">Compatible with Excel, Google Sheets</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                    Available
                  </span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-not-allowed opacity-60">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                    className="mr-3"
                    disabled
                  />
                  <FileText className="w-5 h-5 text-red-600 mr-2" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">PDF</p>
                    <p className="text-xs text-gray-500">Professional report format</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                    Coming Soon
                  </span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-not-allowed opacity-60">
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value as 'excel')}
                    className="mr-3"
                    disabled
                  />
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 mr-2" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Excel (.xlsx)</p>
                    <p className="text-xs text-gray-500">Native Excel format with formatting</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                    Coming Soon
                  </span>
                </label>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to export all transactions
              </p>
            </div>

            {/* Include Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include in Export
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeOptions.transactionDetails}
                    onChange={(e) =>
                      setIncludeOptions({
                        ...includeOptions,
                        transactionDetails: e.target.checked
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Transaction Details</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeOptions.currencyBreakdown}
                    onChange={(e) =>
                      setIncludeOptions({
                        ...includeOptions,
                        currencyBreakdown: e.target.checked
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Currency Breakdown</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeOptions.paymentStatus}
                    onChange={(e) =>
                      setIncludeOptions({
                        ...includeOptions,
                        paymentStatus: e.target.checked
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Payment Status</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeOptions.summaryTotals}
                    onChange={(e) =>
                      setIncludeOptions({
                        ...includeOptions,
                        summaryTotals: e.target.checked
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Summary Totals</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onClose}
              className="btn btn-secondary w-full sm:w-auto"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="btn btn-primary w-full sm:w-auto"
              disabled={isExporting || exportFormat !== 'csv'}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
