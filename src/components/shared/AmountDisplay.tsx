import { formatCurrency } from '@/lib/formatCurrency'
import type { CurrencyCode } from '@/lib/formatCurrency'

interface AmountDisplayProps {
  amount: number
  currency?: CurrencyCode
  direction?: 'in' | 'out' | 'neutral'
  showSign?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function AmountDisplay({
  amount,
  currency = 'PKR',
  direction = 'neutral',
  showSign = false,
  size = 'md',
  className = '',
}: AmountDisplayProps) {
  const colorClass =
    direction === 'in' ? 'text-green-600' :
    direction === 'out' ? 'text-red-600' :
    'text-gray-900'

  const sizeClass =
    size === 'sm' ? 'text-sm' :
    size === 'lg' ? 'text-2xl font-bold' :
    'text-base font-medium'

  const sign =
    showSign && direction === 'in' ? '+' :
    showSign && direction === 'out' ? '-' :
    ''

  return (
    <span className={`${colorClass} ${sizeClass} ${className}`}>
      {sign}{formatCurrency(Math.abs(amount), currency)}
    </span>
  )
}
