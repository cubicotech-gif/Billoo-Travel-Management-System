/**
 * Currency formatting utilities for multi-currency support
 * Supports PKR, SAR, USD, AED, EUR, GBP
 */

export const SUPPORTED_CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
] as const

export type CurrencyCode = 'PKR' | 'SAR' | 'USD' | 'AED' | 'EUR' | 'GBP'

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code (default: PKR)
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: CurrencyCode = 'PKR',
  showSymbol: boolean = true
): string => {
  const formatted = amount.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  if (!showSymbol) {
    return formatted
  }

  // Get currency info
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currency)
  const symbol = currencyInfo?.symbol || currency

  // For PKR, put symbol before
  if (currency === 'PKR') {
    return `${symbol} ${formatted}`
  }

  // For others, put after
  return `${formatted} ${symbol}`
}

/**
 * Format amount in both original currency and PKR
 * @param originalAmount - Amount in original currency
 * @param originalCurrency - Original currency code
 * @param pkrAmount - Converted amount in PKR
 * @returns Formatted dual currency string
 */
export const formatDualCurrency = (
  originalAmount: number,
  originalCurrency: CurrencyCode,
  pkrAmount: number
): string => {
  // If already in PKR, just show PKR
  if (originalCurrency === 'PKR') {
    return formatCurrency(pkrAmount, 'PKR')
  }

  // Show both: "3,000 SAR (Rs 223,500)"
  return `${formatCurrency(originalAmount, originalCurrency)} (${formatCurrency(pkrAmount, 'PKR')})`
}

/**
 * Format exchange rate with proper decimals
 * @param rate - Exchange rate value
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency (default: PKR)
 * @returns Formatted exchange rate string
 */
export const formatExchangeRate = (
  rate: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode = 'PKR'
): string => {
  const formatted = rate.toFixed(4)
  return `1 ${fromCurrency} = ${formatted} ${toCurrency}`
}

/**
 * Calculate PKR amount from original currency
 * @param amount - Amount in original currency
 * @param exchangeRate - Exchange rate to PKR
 * @returns Amount in PKR (rounded to 2 decimals)
 */
export const convertToPKR = (amount: number, exchangeRate: number): number => {
  return Math.round(amount * exchangeRate * 100) / 100
}

/**
 * Validate exchange rate input
 * @param rate - Exchange rate value
 * @returns Error message if invalid, null if valid
 */
export const validateExchangeRate = (rate: number): string | null => {
  if (isNaN(rate)) {
    return 'Exchange rate must be a valid number'
  }

  if (rate <= 0) {
    return 'Exchange rate must be greater than 0'
  }

  // Check decimal places (max 4)
  const decimalPlaces = rate.toString().split('.')[1]?.length || 0
  if (decimalPlaces > 4) {
    return 'Exchange rate can have maximum 4 decimal places'
  }

  return null
}

/**
 * Get currency symbol for a given currency code
 * @param currency - Currency code
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: CurrencyCode): string => {
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currency)
  return currencyInfo?.symbol || currency
}

/**
 * Get currency name for a given currency code
 * @param currency - Currency code
 * @returns Currency name
 */
export const getCurrencyName = (currency: CurrencyCode): string => {
  const currencyInfo = SUPPORTED_CURRENCIES.find((c) => c.code === currency)
  return currencyInfo?.name || currency
}

/**
 * Format profit with color indication
 * @param profitAmount - Profit amount in PKR
 * @returns Object with formatted text and color class
 */
export const formatProfit = (profitAmount: number): { text: string; colorClass: string } => {
  const formatted = formatCurrency(Math.abs(profitAmount), 'PKR')

  if (profitAmount > 0) {
    return {
      text: `+${formatted}`,
      colorClass: 'text-green-600',
    }
  } else if (profitAmount < 0) {
    return {
      text: `-${formatted}`,
      colorClass: 'text-red-600',
    }
  } else {
    return {
      text: formatted,
      colorClass: 'text-gray-600',
    }
  }
}

/**
 * Format percentage
 * @param value - Percentage value (e.g., 15.5 for 15.5%)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`
}

/**
 * Calculate profit margin percentage
 * @param profit - Profit amount
 * @param revenue - Revenue/selling amount
 * @returns Profit margin percentage
 */
export const calculateProfitMargin = (profit: number, revenue: number): number => {
  if (revenue === 0) return 0
  return (profit / revenue) * 100
}

/**
 * Format currency for input (no symbol, just number)
 * @param amount - Amount to format
 * @returns Formatted number string for input
 */
export const formatCurrencyForInput = (amount: number): string => {
  return amount.toString()
}

/**
 * Parse currency input (remove commas, spaces, symbols)
 * @param input - Input string
 * @returns Parsed number
 */
export const parseCurrencyInput = (input: string): number => {
  // Remove all non-numeric characters except decimal point
  const cleaned = input.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}
