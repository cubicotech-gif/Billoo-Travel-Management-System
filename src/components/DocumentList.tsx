import { useEffect, useState } from 'react'
import {
  FileText,
  Download,
  Trash2,
  Calendar,
  AlertTriangle,
  File,
  Image,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { downloadFile, deleteFile } from '@/lib/storage'
import { format, differenceInDays } from 'date-fns'

interface Document {
  id: string
  entity_type: string
  entity_id: string
  document_type: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  expiry_date: string | null
  uploaded_by: string | null
  notes: string | null
  created_at: string
}

interface DocumentListProps {
  entityType: 'query' | 'passenger' | 'vendor' | 'invoice'
  entityId: string
  onDocumentsChange?: () => void
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa',
  ticket: 'Ticket',
  voucher: 'Voucher',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Other',
}

export default function DocumentList({
  entityType,
  entityId,
  onDocumentsChange,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [entityType, entityId])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (doc: Document) => {
    await downloadFile(doc.file_url, doc.file_name)
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    setDeletingId(doc.id)

    try {
      // Delete from storage
      await deleteFile(doc.file_url)

      // Delete from database
      const { error } = await supabase.from('documents').delete().eq('id', doc.id)

      if (error) throw error

      // Log activity
      await supabase.from('activities').insert({
        entity_type: 'document',
        entity_id: entityId,
        action: 'deleted',
        description: `Document deleted: ${doc.file_name}`,
      })

      loadDocuments()
      if (onDocumentsChange) {
        onDocumentsChange()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null

    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = differenceInDays(expiry, today)

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'red', message: 'Expired' }
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'expiring',
        color: 'yellow',
        message: `Expires in ${daysUntilExpiry} days`,
      }
    }
    return { status: 'valid', color: 'green', message: 'Valid' }
  }

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-5 w-5" />

    if (mimeType.startsWith('image/')) {
      return <Image className="h-5 w-5" />
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5" />
    }
    return <File className="h-5 w-5" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">No documents uploaded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const expiryStatus = getExpiryStatus(doc.expiry_date)

        return (
          <div
            key={doc.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="text-primary-600 mt-1">{getFileIcon(doc.mime_type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {doc.file_name}
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                    </span>
                    <span>•</span>
                    <span>Uploaded {format(new Date(doc.created_at), 'MMM d, yyyy')}</span>

                    {doc.expiry_date && (
                      <>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Expires {format(new Date(doc.expiry_date), 'MMM d, yyyy')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {doc.notes && (
                    <p className="mt-2 text-xs text-gray-600 italic">{doc.notes}</p>
                  )}

                  {/* Expiry Warning */}
                  {expiryStatus && expiryStatus.status !== 'valid' && (
                    <div
                      className={`mt-2 flex items-center space-x-1 text-xs ${
                        expiryStatus.status === 'expired'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>{expiryStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === doc.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
