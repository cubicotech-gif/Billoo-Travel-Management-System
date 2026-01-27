import { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'

interface DocumentUploadProps {
  entityType: 'query' | 'passenger' | 'vendor' | 'invoice'
  entityId: string
  onUploadComplete?: () => void
}

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'other', label: 'Other' },
] as const

export default function DocumentUpload({
  entityType,
  entityId,
  onUploadComplete,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>('other')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, DOC, DOCX, and image files are allowed')
      return
    }

    setError(null)
    setSelectedFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      // Upload file to storage
      const result = await uploadFile(selectedFile, entityType, entityId)

      if (!result) {
        throw new Error('Failed to upload file')
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Save document metadata to database
      const { error: dbError } = await supabase.from('documents').insert({
        entity_type: entityType,
        entity_id: entityId,
        document_type: documentType as any,
        file_name: selectedFile.name,
        file_url: result.path,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        expiry_date: expiryDate || null,
        uploaded_by: user?.id || null,
        notes: notes || null,
      })

      if (dbError) throw dbError

      // Log activity
      await supabase.from('activities').insert({
        entity_type: 'document',
        entity_id: entityId,
        action: 'created',
        description: `Document uploaded: ${selectedFile.name}`,
        metadata: { document_type: documentType },
      })

      // Reset form
      setSelectedFile(null)
      setDocumentType('other')
      setExpiryDate('')
      setNotes('')

      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload document. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
        />

        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop a file here, or click to select
        </p>
        <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Document Details Form */}
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {(documentType === 'passport' || documentType === 'visa') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Add any notes about this document..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
