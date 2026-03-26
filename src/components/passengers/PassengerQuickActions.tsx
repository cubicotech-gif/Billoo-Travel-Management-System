import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, DollarSign, RotateCcw, Bell, Download, FileText
} from 'lucide-react'

interface PassengerQuickActionsProps {
  onRecordPayment: () => void
  onRecordRefund: () => void
  onSendReminder: () => void
  onDownloadStatement: () => void
  onCreateInvoice: () => void
  hasOutstanding: boolean
}

export default function PassengerQuickActions({
  onRecordPayment, onRecordRefund, onSendReminder,
  onDownloadStatement, onCreateInvoice, hasOutstanding,
}: PassengerQuickActionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const actions = [
    { label: 'Record Payment', icon: DollarSign, onClick: onRecordPayment, color: 'text-green-600' },
    { label: 'Create Invoice', icon: FileText, onClick: onCreateInvoice, color: 'text-primary-600' },
    { label: 'Record Refund', icon: RotateCcw, onClick: onRecordRefund, color: 'text-orange-600' },
    ...(hasOutstanding ? [{ label: 'Send Reminder', icon: Bell, onClick: onSendReminder, color: 'text-yellow-600' }] : []),
    { label: 'Download Statement', icon: Download, onClick: onDownloadStatement, color: 'text-gray-600' },
  ]

  return (
    <div className="relative" ref={ref}>
      {/* Primary action + dropdown toggle */}
      <div className="flex">
        <button
          onClick={onRecordPayment}
          className="btn btn-primary rounded-r-none flex items-center gap-1"
        >
          <DollarSign className="w-4 h-4" />
          Record Payment
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="btn btn-primary rounded-l-none border-l border-primary-700 px-2"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => { setOpen(false); action.onClick() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <action.icon className={`w-4 h-4 ${action.color}`} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
