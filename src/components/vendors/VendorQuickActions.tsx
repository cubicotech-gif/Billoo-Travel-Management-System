import { useState, useRef, useEffect } from 'react'
import { ChevronDown, DollarSign, RotateCcw, Download } from 'lucide-react'

interface VendorQuickActionsProps {
  onRecordPayment: () => void
  onRecordRefund: () => void
  onDownloadStatement: () => void
  hasBalance: boolean
}

export default function VendorQuickActions({
  onRecordPayment, onRecordRefund, onDownloadStatement, hasBalance,
}: VendorQuickActionsProps) {
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
    ...(hasBalance ? [{ label: 'Record Payment', icon: DollarSign, onClick: onRecordPayment, color: 'text-purple-600' }] : []),
    { label: 'Record Refund', icon: RotateCcw, onClick: onRecordRefund, color: 'text-blue-600' },
    { label: 'Download Statement', icon: Download, onClick: onDownloadStatement, color: 'text-gray-600' },
  ]

  return (
    <div className="relative" ref={ref}>
      <div className="flex">
        <button onClick={onRecordPayment}
          className="px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-l-lg text-white text-sm transition-colors flex items-center gap-1">
          <DollarSign className="w-4 h-4" /> Record Payment
        </button>
        <button onClick={() => setOpen(!open)}
          className="px-2 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-r-lg text-white text-sm transition-colors border-l border-white border-opacity-20">
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {actions.map(action => (
            <button key={action.label}
              onClick={() => { setOpen(false); action.onClick() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <action.icon className={`w-4 h-4 ${action.color}`} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
