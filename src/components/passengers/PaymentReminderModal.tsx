import { useState } from 'react'
import { X, MessageCircle, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/formatCurrency'

interface PaymentReminderModalProps {
  passengerId: string
  passengerName: string
  passengerPhone: string
  passengerWhatsapp: string | null
  outstandingAmount: number
  onSuccess: () => void
  onCancel: () => void
}

export default function PaymentReminderModal({
  passengerId, passengerName, passengerPhone, passengerWhatsapp,
  outstandingAmount, onSuccess, onCancel,
}: PaymentReminderModalProps) {
  const [copied, setCopied] = useState(false)
  const [logging, setLogging] = useState(false)

  const whatsappNumber = passengerWhatsapp || passengerPhone

  const defaultMessage = `Assalam o Alaikum ${passengerName},

This is a friendly reminder regarding your outstanding balance of ${formatCurrency(outstandingAmount)}.

Kindly arrange the payment at your earliest convenience. If you have already made the payment, please share the receipt so we can update our records.

Thank you for choosing Billoo Travel.
JazakAllah Khair`

  const [message, setMessage] = useState(defaultMessage)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const cleanPhone = whatsappNumber.replace(/[^0-9+]/g, '')
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank')
    logCommunication('whatsapp')
  }

  const logCommunication = async (channel: string) => {
    setLogging(true)
    try {
      await supabase.from('communications').insert({
        entity_type: 'passenger',
        entity_id: passengerId,
        channel,
        direction: 'outbound',
        subject: 'Payment Reminder',
        content: message,
        contact_info: whatsappNumber,
      })
      onSuccess()
    } catch (err) {
      console.error('Error logging communication:', err)
      onSuccess()
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-yellow-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Payment Reminder</h3>
              <button type="button" onClick={onCancel} className="text-white hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-yellow-100 text-sm mt-1">
              To: {passengerName} ({whatsappNumber})
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-sm text-red-700">Outstanding Amount</span>
              <span className="text-lg font-bold text-red-700">{formatCurrency(outstandingAmount)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                rows={8}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="input text-sm"
              />
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={logging}>
              Cancel
            </button>
            <button type="button" onClick={handleCopy} className="btn btn-secondary">
              {copied ? <><Check className="w-4 h-4 mr-1" /> Copied!</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="btn btn-primary bg-green-600 hover:bg-green-700"
              disabled={logging}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              {logging ? 'Sending...' : 'Send via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
