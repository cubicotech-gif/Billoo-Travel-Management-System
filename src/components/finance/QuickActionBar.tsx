import { useState } from 'react'
import { DollarSign, CreditCard, FileText, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickActionBarProps {
  onRecordPayment: () => void
  onPayVendor: () => void
}

export default function QuickActionBar({ onRecordPayment, onPayVendor }: QuickActionBarProps) {
  const navigate = useNavigate()
  const [showMore, setShowMore] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onRecordPayment}
        className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
      >
        <DollarSign className="w-4 h-4" />
        Record Payment Received
      </button>

      <button
        onClick={onPayVendor}
        className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
      >
        <CreditCard className="w-4 h-4" />
        Pay Vendor
      </button>

      <button
        onClick={() => navigate('/finance/invoices/new')}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
      >
        <FileText className="w-4 h-4" />
        New Invoice
      </button>

      <div className="relative">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
        >
          More <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {showMore && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => { setShowMore(false); navigate('/queries/new') }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                New Query
              </button>
              <button
                onClick={() => { setShowMore(false); navigate('/finance/transactions') }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                View Transactions
              </button>
              <button
                onClick={() => { setShowMore(false); navigate('/finance/reports') }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Financial Reports
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
