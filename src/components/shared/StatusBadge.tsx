import { INVOICE_STATUS_COLORS, TRANSACTION_TYPE_CONFIG } from '@/types/finance'
import type { InvoiceStatus, TransactionType } from '@/types/finance'

interface StatusBadgeProps {
  status: string
  type?: 'invoice' | 'transaction' | 'vendor_payment' | 'custom'
  customColors?: Record<string, string>
  size?: 'sm' | 'md'
}

const VENDOR_PAYMENT_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  partially_paid: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
}

export default function StatusBadge({ status, type = 'custom', customColors, size = 'sm' }: StatusBadgeProps) {
  let colorClass = 'bg-gray-100 text-gray-800'
  let label = status

  if (type === 'invoice') {
    colorClass = INVOICE_STATUS_COLORS[status as InvoiceStatus] || colorClass
    label = status
  } else if (type === 'transaction') {
    const config = TRANSACTION_TYPE_CONFIG[status as TransactionType]
    if (config) {
      colorClass = config.color
      label = config.label
    }
  } else if (type === 'vendor_payment') {
    colorClass = VENDOR_PAYMENT_COLORS[status] || colorClass
    label = status.replace(/_/g, ' ')
  } else if (customColors) {
    colorClass = customColors[status] || colorClass
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'

  return (
    <span className={`inline-flex items-center rounded-full font-medium capitalize ${colorClass} ${sizeClass}`}>
      {label}
    </span>
  )
}
