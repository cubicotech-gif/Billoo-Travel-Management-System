import { MessageCircle, Phone, Mail } from 'lucide-react'

interface QuickActionsProps {
  phone: string
  email?: string | null
  onActionComplete?: (type: 'whatsapp' | 'call' | 'email') => void
}

export default function QuickActions({ phone, email, onActionComplete }: QuickActionsProps) {
  const handleWhatsApp = () => {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[^0-9+]/g, '')

    // Open WhatsApp Web/App
    const whatsappUrl = `https://wa.me/${cleanPhone}`
    window.open(whatsappUrl, '_blank')

    if (onActionComplete) {
      onActionComplete('whatsapp')
    }
  }

  const handleCall = () => {
    // Open phone dialer (works on mobile)
    window.location.href = `tel:${phone}`

    if (onActionComplete) {
      onActionComplete('call')
    }
  }

  const handleEmail = () => {
    if (!email) {
      alert('No email address available')
      return
    }

    // Open email client
    window.location.href = `mailto:${email}`

    if (onActionComplete) {
      onActionComplete('email')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* WhatsApp Button */}
      <button
        onClick={handleWhatsApp}
        className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
        title="Open WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      {/* Call Button */}
      <button
        onClick={handleCall}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
        title="Call"
      >
        <Phone className="h-4 w-4" />
        <span className="hidden sm:inline">Call</span>
      </button>

      {/* Email Button */}
      {email && (
        <button
          onClick={handleEmail}
          className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
          title="Send Email"
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Email</span>
        </button>
      )}
    </div>
  )
}
