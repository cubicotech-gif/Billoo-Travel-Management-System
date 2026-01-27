import { useEffect, useState } from 'react'
import {
  MessageCircle,
  Phone,
  Mail,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface Communication {
  id: string
  entity_type: 'query' | 'passenger'
  entity_id: string
  communication_type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note'
  direction: 'inbound' | 'outbound'
  subject: string | null
  body: string | null
  from_contact: string | null
  to_contact: string | null
  status: 'draft' | 'sent' | 'delivered' | 'failed'
  sent_by: string | null
  sent_at: string
  created_at: string
}

interface CommunicationLogProps {
  entityType: 'query' | 'passenger'
  entityId: string
  onRefresh?: () => void
}

const COMM_TYPE_CONFIG = {
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  call: {
    icon: Phone,
    label: 'Phone Call',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  sms: {
    icon: Send,
    label: 'SMS',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  note: {
    icon: FileText,
    label: 'Note',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
}

const STATUS_CONFIG = {
  draft: { icon: Clock, color: 'text-gray-500', label: 'Draft' },
  sent: { icon: Send, color: 'text-blue-500', label: 'Sent' },
  delivered: { icon: CheckCircle, color: 'text-green-500', label: 'Delivered' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
}

export default function CommunicationLog({
  entityType,
  entityId,
  onRefresh,
}: CommunicationLogProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    whatsapp: 0,
    calls: 0,
    emails: 0,
  })

  useEffect(() => {
    loadCommunications()
  }, [entityType, entityId])

  const loadCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('sent_at', { ascending: false })

      if (error) throw error

      setCommunications(data || [])

      // Calculate stats
      const total = (data || []).length
      const whatsapp = (data || []).filter((c) => c.communication_type === 'whatsapp').length
      const calls = (data || []).filter((c) => c.communication_type === 'call').length
      const emails = (data || []).filter((c) => c.communication_type === 'email').length

      setStats({ total, whatsapp, calls, emails })
    } catch (error) {
      console.error('Error loading communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this communication record?')) return

    try {
      const { error } = await supabase.from('communications').delete().eq('id', id)

      if (error) throw error

      loadCommunications()
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error deleting communication:', error)
      alert('Failed to delete communication')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {communications.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg">
            <p className="text-xs text-green-600">WhatsApp</p>
            <p className="text-2xl font-bold text-green-900">{stats.whatsapp}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg">
            <p className="text-xs text-blue-600">Calls</p>
            <p className="text-2xl font-bold text-blue-900">{stats.calls}</p>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-lg">
            <p className="text-xs text-purple-600">Emails</p>
            <p className="text-2xl font-bold text-purple-900">{stats.emails}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {communications.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No communication history yet</p>
            <p className="text-xs text-gray-400 mt-1">Start logging calls, messages, and emails</p>
          </div>
        ) : (
          communications.map((comm) => {
            const typeConfig = COMM_TYPE_CONFIG[comm.communication_type]
            const StatusIcon = STATUS_CONFIG[comm.status].icon
            const TypeIcon = typeConfig.icon

            return (
              <div
                key={comm.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${typeConfig.bgColor}`}
                  >
                    <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-sm font-medium text-gray-900">
                        {typeConfig.label}
                      </span>

                      {/* Direction */}
                      {comm.direction === 'inbound' ? (
                        <div className="flex items-center text-xs text-green-600">
                          <ArrowDownCircle className="h-3 w-3 mr-1" />
                          Inbound
                        </div>
                      ) : (
                        <div className="flex items-center text-xs text-blue-600">
                          <ArrowUpCircle className="h-3 w-3 mr-1" />
                          Outbound
                        </div>
                      )}

                      {/* Status */}
                      <div
                        className={`flex items-center text-xs ${STATUS_CONFIG[comm.status].color}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[comm.status].label}
                      </div>

                      {/* Time */}
                      <span className="text-xs text-gray-500">
                        {format(new Date(comm.sent_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>

                    {/* Subject */}
                    {comm.subject && (
                      <p className="mt-1 text-sm font-medium text-gray-900">{comm.subject}</p>
                    )}

                    {/* Body */}
                    {comm.body && (
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                        {comm.body}
                      </p>
                    )}

                    {/* Contacts */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {comm.from_contact && (
                        <span>
                          From: <span className="font-medium">{comm.from_contact}</span>
                        </span>
                      )}
                      {comm.to_contact && (
                        <span>
                          To: <span className="font-medium">{comm.to_contact}</span>
                        </span>
                      )}
                      {comm.sent_by && (
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          <span>{comm.sent_by}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(comm.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
