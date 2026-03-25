import { useState, useRef } from 'react'
import {
  Upload, FileJson, AlertCircle, Loader, CheckCircle2,
  Info, Download
} from 'lucide-react'
import { validateBulkUploadFile, preflightCheck, executeBulkImport } from '@/lib/api/bulkUpload'
import type { PreflightResult, ImportProgress } from '@/lib/api/bulkUpload'
import BulkUploadPreview from '@/components/finance/BulkUploadPreview'
import BulkUploadResults from '@/components/finance/BulkUploadResults'
import type { BulkUploadFile, BulkUploadResult } from '@/types/finance'

type PageState = 'upload' | 'validating' | 'preview' | 'importing' | 'results'

const STEP_LABELS: Record<string, string> = {
  vendor: 'Processing vendor',
  passengers: 'Processing passengers',
  invoices: 'Creating invoices',
  invoice_items: 'Creating invoice items',
  transactions: 'Creating transactions',
  activities: 'Logging activities',
  done: 'Complete',
}

const ALL_STEPS = ['vendor', 'passengers', 'invoices', 'invoice_items', 'transactions', 'activities']

const SAMPLE_JSON = JSON.stringify({
  vendor: {
    name: "Sample Vendor",
    service_types: ["Hotel", "Visa"],
    country: "Saudi Arabia",
    status: "active"
  },
  passengers: [
    {
      ref: "PAX-001",
      first_name: "Ahmed",
      last_name: "Khan",
      pax_count: 2,
      gender: "male",
      country: "Pakistan",
      status: "active"
    }
  ],
  service_records: [
    {
      row: 1,
      passenger_ref: "PAX-001",
      vendor: "Sample Vendor",
      service_type: "Hotel",
      service_description: "Hotel Makkah — 5 nights",
      purchase_price_sar: 5000,
      selling_price_sar: 6000,
      profit_sar: 1000,
      conversion_rate_to_vendor: 77,
      conversion_rate_to_passenger: 77,
      purchase_price_pkr: 385000,
      selling_price_pkr: 462000,
      exchange_rate_profit_pkr: 0,
      vendor_payment_amount_pkr: 200000,
      vendor_payment_date: "2025-06-15",
      notes: "Partial payment"
    }
  ],
  summary: {
    total_vendor_payments_pkr: 200000,
    total_purchase_cost_sar: 5000,
    total_selling_price_sar: 6000,
    total_service_profit_sar: 1000,
    total_exchange_rate_profit_pkr: 0,
    unique_passengers: 1,
    total_service_rows: 1,
    source_sheet: "Sample Vendor"
  }
}, null, 2)

export default function BulkUpload() {
  const [pageState, setPageState] = useState<PageState>('upload')
  const [parsedData, setParsedData] = useState<BulkUploadFile | null>(null)
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importResult, setImportResult] = useState<BulkUploadResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPageState('upload')
    setParsedData(null)
    setPreflight(null)
    setValidationErrors([])
    setImportProgress(null)
    setImportResult(null)
    setFileName('')
  }

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setValidationErrors(['Please upload a .json file'])
      return
    }

    setFileName(file.name)
    setPageState('validating')
    setValidationErrors([])

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Step 1: Validate structure
      const validation = validateBulkUploadFile(data)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        setPageState('upload')
        return
      }

      // Step 2: Preflight check (check existing records)
      const preflightResult = await preflightCheck(data as BulkUploadFile)

      setParsedData(data as BulkUploadFile)
      setPreflight(preflightResult)
      setPageState('preview')
    } catch (err: any) {
      console.error('Bulk upload validation error:', err)
      if (err instanceof SyntaxError) {
        setValidationErrors(['Invalid JSON format — please check the file syntax'])
      } else {
        setValidationErrors([err.message || 'Error processing file'])
      }
      setPageState('upload')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleConfirmImport = async () => {
    if (!parsedData || !preflight) return

    setPageState('importing')
    setImportProgress({
      currentStep: 'vendor',
      completedSteps: [],
      message: 'Starting import...',
    })

    const result = await executeBulkImport(parsedData, preflight, (progress) => {
      setImportProgress(progress)
    })

    setImportResult(result)
    setPageState('results')
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_JSON], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-bulk-upload.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Data Import</h1>
        <p className="mt-1 text-sm text-gray-600">
          Import vendor transaction records from your Excel extraction files
        </p>
      </div>

      {/* ── Upload State ────────────────────────────────────── */}
      {pageState === 'upload' && (
        <>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-800">Validation Errors</h4>
              </div>
              <ul className="space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="text-sm text-red-700">{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <FileJson className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {dragActive ? 'Drop your file here' : 'Drag & Drop your JSON file'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Select JSON File
            </button>
          </div>

          {/* Info Box */}
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Expected JSON Format</h4>
                <p className="text-sm text-blue-800 mb-2">
                  Each JSON file represents one vendor sheet from your Excel workbook. It should contain:
                </p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc ml-4">
                  <li><strong>vendor</strong> — Name, service types, country</li>
                  <li><strong>passengers</strong> — Array of passengers with unique refs</li>
                  <li><strong>service_records</strong> — Array of services with SAR/PKR amounts and vendor payments</li>
                  <li><strong>summary</strong> — Totals for verification</li>
                </ul>
                <button onClick={downloadSample} className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium flex items-center">
                  <Download className="w-4 h-4 mr-1" />
                  Download Sample JSON Template
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Validating State ────────────────────────────────── */}
      {pageState === 'validating' && (
        <div className="card text-center py-12">
          <Loader className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Validating {fileName}...</h3>
          <p className="text-sm text-gray-500 mt-1">Checking structure and looking for existing records</p>
        </div>
      )}

      {/* ── Preview State ───────────────────────────────────── */}
      {pageState === 'preview' && parsedData && preflight && (
        <BulkUploadPreview
          data={parsedData}
          preflight={preflight}
          onConfirm={handleConfirmImport}
          onCancel={reset}
          importing={false}
        />
      )}

      {/* ── Importing State ─────────────────────────────────── */}
      {pageState === 'importing' && importProgress && (
        <div className="card py-8">
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-6">
            Importing data...
          </h3>

          <div className="max-w-md mx-auto space-y-3">
            {ALL_STEPS.map((step) => {
              const isCompleted = importProgress.completedSteps.includes(step as any)
              const isCurrent = importProgress.currentStep === step
              return (
                <div key={step} className="flex items-center gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader className="w-5 h-5 text-primary-600 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    isCompleted ? 'text-green-700 font-medium' :
                    isCurrent ? 'text-primary-700 font-medium' :
                    'text-gray-400'
                  }`}>
                    {STEP_LABELS[step]}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {importProgress.message}
          </p>
        </div>
      )}

      {/* ── Results State ───────────────────────────────────── */}
      {pageState === 'results' && importResult && (
        <BulkUploadResults
          result={importResult}
          onUploadAnother={reset}
        />
      )}
    </div>
  )
}
