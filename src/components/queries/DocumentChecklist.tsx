import { useState, useRef } from 'react'
import {
  Upload, Download, CheckCircle, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, ShieldCheck, FileText, Trash2
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import {
  type ChecklistPassengerInfo,
  type DocumentChecklist as ChecklistItem,
  DOCUMENT_TYPE_LABELS,
  uploadDocument,
  updateChecklistStatus,
  removeChecklistItem,
} from '@/lib/api/documents'
import { downloadFile } from '@/lib/storage'

interface Props {
  queryId: string
  passengers: ChecklistPassengerInfo[]
  travelDate?: string | null
  onRefresh: () => void
}

export default function DocumentChecklist({ queryId, passengers, travelDate, onRefresh }: Props) {
  if (passengers.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No passengers linked to this query yet.</p>
        <p className="text-xs text-gray-500 mt-1">Add passengers to see document checklist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {passengers.map(passenger => (
        <PassengerChecklistCard
          key={passenger.passenger_id}
          queryId={queryId}
          passenger={passenger}
          travelDate={travelDate}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}

function PassengerChecklistCard({
  queryId: _queryId,
  passenger,
  travelDate,
  onRefresh,
}: {
  queryId: string
  passenger: ChecklistPassengerInfo
  travelDate?: string | null
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)

  const totalRequired = passenger.items.filter(i => i.required).length
  const readyRequired = passenger.items.filter(i =>
    i.required && (i.status === 'uploaded' || i.status === 'verified')
  ).length
  const progress = totalRequired > 0 ? Math.round((readyRequired / totalRequired) * 100) : 100

  // Passport expiry check
  const passportWarning = getPassportWarning(passenger.passport_expiry, travelDate)

  const handleUploadClick = (documentType: string) => {
    setUploadTarget(documentType)
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !uploadTarget) return

    const file = e.target.files[0]

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploading(uploadTarget)

    try {
      // Determine if expiry date field should be prompted
      let expiryDate: string | undefined
      if (uploadTarget === 'passport' || uploadTarget === 'visa' || uploadTarget === 'insurance') {
        const input = prompt(`Enter expiry date for ${DOCUMENT_TYPE_LABELS[uploadTarget] || uploadTarget} (YYYY-MM-DD):`)
        if (input) expiryDate = input
      }

      await uploadDocument(
        file,
        'passenger',
        passenger.passenger_id,
        uploadTarget,
        undefined,
        expiryDate
      )

      onRefresh()
    } catch (err: any) {
      console.error('Upload error:', err)
      alert('Failed to upload: ' + err.message)
    } finally {
      setUploading(null)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleVerify = async (item: ChecklistItem) => {
    try {
      await updateChecklistStatus(item.id, 'verified')
      onRefresh()
    } catch (err: any) {
      alert('Failed to verify: ' + err.message)
    }
  }

  const handleReject = async (item: ChecklistItem) => {
    const reason = prompt('Reason for rejection:')
    if (reason === null) return
    try {
      await updateChecklistStatus(item.id, 'rejected')
      onRefresh()
    } catch (err: any) {
      alert('Failed to reject: ' + err.message)
    }
  }

  const handleRemoveItem = async (item: ChecklistItem) => {
    if (!confirm(`Remove "${DOCUMENT_TYPE_LABELS[item.document_type] || item.document_type}" from checklist?`)) return
    try {
      await removeChecklistItem(item.id)
      onRefresh()
    } catch (err: any) {
      alert('Failed to remove: ' + err.message)
    }
  }

  const handleDownload = async (doc: any) => {
    if (doc?.file_url) {
      await downloadFile(doc.file_url, doc.file_name)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
            progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
          }`}>
            {progress}%
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900">
              {passenger.first_name} {passenger.last_name}
            </h4>
            <p className="text-xs text-gray-500">
              {readyRequired}/{totalRequired} required documents ready
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {passportWarning && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              passportWarning.level === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {passportWarning.level === 'critical' ? 'Passport Expired' : 'Passport Expiring'}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileSelected}
      />

      {/* Checklist Items */}
      {expanded && (
        <div className="border-t border-gray-200">
          {/* Passport Expiry Warning */}
          {passportWarning && (
            <div className={`px-4 py-2 flex items-center gap-2 text-xs ${
              passportWarning.level === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {passportWarning.message}
            </div>
          )}

          {/* Progress Bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {passenger.items.map(item => (
              <ChecklistRow
                key={item.id}
                item={item}
                uploading={uploading === item.document_type}
                onUpload={() => handleUploadClick(item.document_type)}
                onVerify={() => handleVerify(item)}
                onReject={() => handleReject(item)}
                onDownload={() => handleDownload(item.documents)}
                onRemove={() => handleRemoveItem(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChecklistRow({
  item,
  uploading,
  onUpload,
  onVerify,
  onReject: _onReject,
  onDownload,
  onRemove,
}: {
  item: ChecklistItem
  uploading: boolean
  onUpload: () => void
  onVerify: () => void
  onReject: () => void
  onDownload: () => void
  onRemove: () => void
}) {
  const doc = item.documents as any
  const label = DOCUMENT_TYPE_LABELS[item.document_type] || item.document_type

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Status Icon */}
        <StatusIcon status={item.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{label}</span>
            {item.required && (
              <span className="text-xs text-red-500 font-medium">Required</span>
            )}
          </div>
          {/* File info if uploaded */}
          {doc && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 truncate max-w-[200px]">{doc.file_name}</span>
              {doc.created_at && (
                <span className="text-xs text-gray-400">
                  {format(new Date(doc.created_at), 'MMM d, yyyy')}
                </span>
              )}
              {doc.expiry_date && (
                <ExpiryBadge expiryDate={doc.expiry_date} />
              )}
            </div>
          )}
          {item.status === 'rejected' && item.notes && (
            <p className="text-xs text-red-600 mt-0.5">Reason: {item.notes}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 ml-2">
        {(item.status === 'missing' || item.status === 'rejected') && (
          <button
            onClick={onUpload}
            disabled={uploading}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
            ) : (
              <Upload className="w-3 h-3" />
            )}
            Upload
          </button>
        )}
        {doc && (item.status === 'uploaded' || item.status === 'verified') && (
          <>
            <button
              onClick={onDownload}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {item.status === 'uploaded' && (
              <button
                onClick={onVerify}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Mark as verified"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onUpload}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
              title="Replace"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {!item.required && (
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Remove from checklist"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'uploaded':
      return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
    case 'verified':
      return <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
    case 'expired':
      return <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
    case 'rejected':
      return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
    default: // missing
      return <Clock className="w-5 h-5 text-gray-300 flex-shrink-0" />
  }
}

function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const expiry = new Date(expiryDate)
  const days = differenceInDays(expiry, new Date())

  if (days < 0) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Expired</span>
  }
  if (days <= 180) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Exp {format(expiry, 'MMM yyyy')}</span>
  }
  return <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">Exp {format(expiry, 'MMM yyyy')}</span>
}

function getPassportWarning(
  passportExpiry: string | null | undefined,
  travelDate: string | null | undefined
): { level: 'critical' | 'warning'; message: string } | null {
  if (!passportExpiry) return null

  const expiry = new Date(passportExpiry)
  const today = new Date()

  if (expiry < today) {
    return { level: 'critical', message: `Passport EXPIRED on ${format(expiry, 'MMM d, yyyy')}` }
  }

  if (travelDate) {
    const travel = new Date(travelDate)
    const sixMonthsBefore = new Date(travel)
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6)

    if (expiry < sixMonthsBefore) {
      return {
        level: 'warning',
        message: `Passport expires ${format(expiry, 'MMM d, yyyy')} — less than 6 months before travel date`,
      }
    }
  }

  return null
}
