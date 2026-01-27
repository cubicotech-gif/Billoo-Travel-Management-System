import { useState } from 'react'
import { MessageCircle, Phone, Mail, FileText, Send, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AddCommunicationProps {
  entityType: 'query' | 'passenger'
  entityId: string
  defaultType?: 'email' | 'sms' | 'whatsapp' | 'call' | 'note'
  defaultDirection?: 'inbound' | 'outbound'
  contactPhone?: string
  contactEmail?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const COMM_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'text-blue-600' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-purple-600' },
  { value: 'sms', label: 'SMS', icon: Send, color: 'text-orange-600' },
  { value: 'note', label: 'Internal Note', icon: FileText, color: 'text-gray-600' },
] as const

export default function AddCommunication({
  entityType,
  entityId,
  defaultType = 'note',
  defaultDirection = 'outbound',
  contactPhone,
  contactEmail,
  onSuccess,
  onCancel,
}: AddCommunicationProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    communication_type: defaultType,
    direction: defaultDirection,
    subject: '',
    body: '',
    from_contact: '',
    to_contact: contactPhone || contactEmail || '',
    status: 'sent' as 'draft' | 'sent' | 'delivered' | 'failed',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.body.trim()) {
      alert('Please enter a message or note')
      return
    }

    setSaving(true)

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from('communications').insert({
        entity_type: entityType,
        entity_id: entityId,
        communication_type: formData.communication_type,
        direction: formData.direction,
        subject: formData.subject || null,
        body: formData.body,
        from_contact: formData.direction === 'outbound' ? user?.email || null : formData.from_contact || null,
        to_contact: formData.direction === 'outbound' ? formData.to_contact || null : user?.email || null,
        status: formData.status,
        sent_by: user?.email || null,
        sent_at: new Date().toISOString(),
      })

      if (error) throw error

      // Log activity
      await supabase.from('activities').insert({
        entity_type: entityType,
        entity_id: entityId,
        action: 'created',
        description: `${formData.communication_type} communication logged`,
        metadata: { type: formData.communication_type, direction: formData.direction },
      })

      // Reset form
      setFormData({
        communication_type: defaultType,
        direction: defaultDirection,
        subject: '',
        body: '',
        from_contact: '',
        to_contact: contactPhone || contactEmail || '',
        status: 'sent',
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error saving communication:', error)
      alert('Failed to save communication')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type and Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Communication Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COMM_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = formData.communication_type === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, communication_type: type.value as any })
                  }
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary-600' : type.color}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-primary-900' : 'text-gray-700'}`}>
                      {type.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Direction *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, direction: 'outbound' })}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.direction === 'outbound'
                  ? 'border-primary-500 bg-primary-50 text-primary-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="text-xs font-medium">↑ Outbound</div>
              <div className="text-xs text-gray-500">We contacted them</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, direction: 'inbound' })}
              className={`p-3 rounded-lg border-2 transition-all ${
                formData.direction === 'inbound'
                  ? 'border-primary-500 bg-primary-50 text-primary-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="text-xs font-medium">↓ Inbound</div>
              <div className="text-xs text-gray-500">They contacted us</div>
            </button>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      {formData.communication_type !== 'note' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.direction === 'outbound' ? 'To' : 'From'}
          </label>
          <input
            type="text"
            value={formData.direction === 'outbound' ? formData.to_contact : formData.from_contact}
            onChange={(e) =>
              setFormData({
                ...formData,
                [formData.direction === 'outbound' ? 'to_contact' : 'from_contact']: e.target.value,
              })
            }
            placeholder={
              formData.communication_type === 'email'
                ? 'email@example.com'
                : formData.communication_type === 'call' || formData.communication_type === 'whatsapp'
                ? '+92-300-1234567'
                : 'Contact info'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Subject (for emails) */}
      {formData.communication_type === 'email' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Email subject"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Message/Note */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {formData.communication_type === 'call'
            ? 'Call Notes'
            : formData.communication_type === 'note'
            ? 'Internal Note'
            : 'Message'}{' '}
          *
        </label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          rows={4}
          required
          placeholder={
            formData.communication_type === 'call'
              ? 'What was discussed during the call?'
              : formData.communication_type === 'note'
              ? 'Add internal notes, reminders, or comments...'
              : 'Enter message content...'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Log Communication'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  )
}
