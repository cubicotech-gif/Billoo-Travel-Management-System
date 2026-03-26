import { useState, useEffect, useRef } from 'react'
import {
  FileText, Upload, FolderOpen, Users, X
} from 'lucide-react'
import { Query } from '@/types/query-workflow'
import DocumentChecklist from './DocumentChecklist'
import DocumentChecklistSummary from './DocumentChecklistSummary'
import DocumentList from '@/components/DocumentList'
import {
  getQueryPassengersWithChecklist,
  getDocumentsForQuery,
  uploadDocument,
  createDefaultChecklist,
  type ChecklistPassengerInfo,
  type DocumentRecord,
} from '@/lib/api/documents'

interface Props {
  query: Query
  onRefresh?: () => void
}

type TabView = 'checklist' | 'all-docs' | 'query-docs'

const QUERY_DOC_TYPES = [
  { value: 'voucher', label: 'Booking Voucher' },
  { value: 'receipt', label: 'Payment Receipt' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'visa', label: 'Visa' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

export default function QueryDocumentSection({ query, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<TabView>('checklist')
  const [passengers, setPassengers] = useState<ChecklistPassengerInfo[]>([])
  const [queryDocs, setQueryDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Upload state for query-level docs
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadDocType, setUploadDocType] = useState('other')
  const [uploadNotes, setUploadNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [query.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [passengersData, docsData] = await Promise.all([
        getQueryPassengersWithChecklist(query.id),
        getDocumentsForQuery(query.id),
      ])

      setPassengers(passengersData)
      setQueryDocs(docsData.queryDocs)

      // Auto-create checklists for passengers that don't have one yet
      for (const p of passengersData) {
        if (p.items.length === 0) {
          await createDefaultChecklist(query.id, p.passenger_id, query.destination)
        }
      }

      // Reload if we created any checklists
      if (passengersData.some(p => p.items.length === 0)) {
        const updated = await getQueryPassengersWithChecklist(query.id)
        setPassengers(updated)
      }
    } catch (err) {
      console.error('Error loading document data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadData()
    setRefreshKey(k => k + 1)
    onRefresh?.()
  }

  const handleQueryDocUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      await uploadDocument(
        selectedFile,
        'query',
        query.id,
        uploadDocType,
        uploadNotes || undefined,
      )

      setSelectedFile(null)
      setUploadDocType('other')
      setUploadNotes('')
      setShowUpload(false)
      handleRefresh()
    } catch (err: any) {
      console.error('Upload error:', err)
      alert('Failed to upload: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0])
      setShowUpload(true)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
      setShowUpload(true)
    }
  }

  const totalPassengerDocs = passengers.reduce((sum, p) => sum + p.items.length, 0)
  const readyDocs = passengers.reduce((sum, p) =>
    sum + p.items.filter(i => i.status === 'uploaded' || i.status === 'verified').length, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Readiness Summary */}
      <DocumentChecklistSummary queryId={query.id} refreshKey={refreshKey} />

      {/* Main Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200 px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Documents & Checklist
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fileInputRef.current?.click()
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileInputChange}
          />

          {/* Tab Buttons */}
          <div className="flex gap-1">
            <TabButton
              active={activeTab === 'checklist'}
              onClick={() => setActiveTab('checklist')}
              icon={<Users className="w-3.5 h-3.5" />}
              label="Passenger Checklist"
              count={`${readyDocs}/${totalPassengerDocs}`}
            />
            <TabButton
              active={activeTab === 'query-docs'}
              onClick={() => setActiveTab('query-docs')}
              icon={<FileText className="w-3.5 h-3.5" />}
              label="Query Documents"
              count={`${queryDocs.length}`}
            />
          </div>
        </div>

        {/* Upload Panel (when file selected for query-level upload) */}
        {showUpload && selectedFile && (
          <div className="border-b border-gray-200 bg-blue-50 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null) }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={uploadDocType}
                  onChange={e => setUploadDocType(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  {QUERY_DOC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={e => setUploadNotes(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                  placeholder="e.g. Hotel confirmation"
                />
              </div>
            </div>

            <button
              onClick={handleQueryDocUpload}
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload to Query'}
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'checklist' && (
            <DocumentChecklist
              queryId={query.id}
              passengers={passengers}
              travelDate={query.travel_date}
              onRefresh={handleRefresh}
            />
          )}

          {activeTab === 'query-docs' && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              {queryDocs.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No query documents yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Drop files here or click Upload above
                  </p>
                </div>
              ) : (
                <DocumentList
                  entityType="query"
                  entityId={query.id}
                  onDocumentsChange={handleRefresh}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        active
          ? 'text-blue-700 border-blue-600 bg-blue-50'
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
      {count && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}
