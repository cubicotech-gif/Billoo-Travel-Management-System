import { useEffect, useState } from 'react'
import { AlertTriangle, FileText, Calendar, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, differenceInDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'

interface ExpiringDocument {
  id: string
  entity_type: string
  entity_id: string
  document_type: string
  file_name: string
  expiry_date: string
  passenger_name?: string
  days_until_expiry: number
}

export default function DocumentExpiryAlerts() {
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadExpiringDocuments()
  }, [])

  const loadExpiringDocuments = async () => {
    try {
      const today = new Date()
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(today.getDate() + 30)

      // Get documents expiring in next 30 days
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })

      if (error) throw error

      // Enrich with passenger names if applicable
      const enrichedDocs = await Promise.all(
        (docs || []).map(async (doc) => {
          let passenger_name = undefined

          if (doc.entity_type === 'passenger') {
            const { data: passenger } = await supabase
              .from('passengers')
              .select('first_name, last_name')
              .eq('id', doc.entity_id)
              .single()

            if (passenger) {
              passenger_name = `${passenger.first_name} ${passenger.last_name}`
            }
          }

          const daysUntilExpiry = differenceInDays(new Date(doc.expiry_date), today)

          return {
            ...doc,
            passenger_name,
            days_until_expiry: daysUntilExpiry,
          } as ExpiringDocument
        })
      )

      setExpiringDocs(enrichedDocs)
    } catch (error) {
      console.error('Error loading expiring documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentClick = (doc: ExpiringDocument) => {
    if (doc.entity_type === 'passenger') {
      navigate('/passengers')
    } else if (doc.entity_type === 'query') {
      navigate('/queries')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Document Expiry Alerts</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (expiringDocs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Document Expiry Alerts</h3>
        </div>
        <p className="text-sm text-gray-500">No documents expiring in the next 30 days</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">Document Expiry Alerts</h3>
        <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {expiringDocs.length}
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {expiringDocs.map((doc) => {
          const isExpired = doc.days_until_expiry < 0
          const isUrgent = doc.days_until_expiry <= 7 && doc.days_until_expiry >= 0

          return (
            <div
              key={doc.id}
              onClick={() => handleDocumentClick(doc)}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md
                ${
                  isExpired
                    ? 'bg-red-50 border-red-200'
                    : isUrgent
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div
                    className={`
                    mt-0.5
                    ${
                      isExpired
                        ? 'text-red-600'
                        : isUrgent
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                    }
                  `}
                  >
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {doc.document_type}
                      </span>
                      {doc.passenger_name && (
                        <>
                          <span className="text-gray-400">•</span>
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{doc.passenger_name}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-900 truncate">{doc.file_name}</p>

                    <div className="mt-1 flex items-center space-x-1 text-xs text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>Expires: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}</span>
                    </div>

                    <div
                      className={`
                      mt-2 inline-flex items-center space-x-1 text-xs font-medium
                      ${
                        isExpired
                          ? 'text-red-700'
                          : isUrgent
                          ? 'text-orange-700'
                          : 'text-yellow-700'
                      }
                    `}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>
                        {isExpired
                          ? `Expired ${Math.abs(doc.days_until_expiry)} days ago`
                          : `Expires in ${doc.days_until_expiry} ${
                              doc.days_until_expiry === 1 ? 'day' : 'days'
                            }`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
