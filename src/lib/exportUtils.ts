import { Database } from '@/types/database'

type VendorTransaction = Database['public']['Tables']['vendor_transactions']['Row'] & {
  queries?: { query_number: string; client_name: string; destination: string }
  passengers?: { first_name: string; last_name: string }
}

interface ExportOptions {
  transactionDetails: boolean
  currencyBreakdown: boolean
  paymentStatus: boolean
  summaryTotals: boolean
}

/**
 * Exports vendor transactions to CSV format
 * @param transactions - Array of vendor transactions to export
 * @param vendorName - Name of the vendor
 * @param options - Export options to customize the output
 */
export const exportTransactionsToCSV = (
  transactions: VendorTransaction[],
  vendorName: string,
  options: ExportOptions
) => {
  // Build CSV headers based on options
  const headers: string[] = [
    'Date',
    'Query Number',
    'Client Name',
    'Destination',
    'Passenger',
    'Service Type',
    'Description',
    'City'
  ]

  if (options.currencyBreakdown) {
    headers.push(
      'Currency',
      'Exchange Rate',
      'Purchase Amount (Original)',
      'Purchase Amount (PKR)',
      'Selling Amount (Original)',
      'Selling Amount (PKR)',
      'Profit (PKR)'
    )
  }

  if (options.paymentStatus) {
    headers.push(
      'Payment Status',
      'Amount Paid',
      'Payment Date',
      'Payment Method',
      'Payment Reference'
    )
  }

  if (options.transactionDetails) {
    headers.push(
      'Booking Reference',
      'Notes'
    )
  }

  // Build CSV rows
  const rows = transactions.map(transaction => {
    const row: any[] = [
      transaction.transaction_date,
      transaction.queries?.query_number || 'N/A',
      transaction.queries?.client_name || 'N/A',
      transaction.queries?.destination || 'N/A',
      transaction.passengers
        ? `${transaction.passengers.first_name} ${transaction.passengers.last_name}`
        : 'N/A',
      transaction.service_type,
      transaction.service_description,
      transaction.city || 'N/A'
    ]

    if (options.currencyBreakdown) {
      row.push(
        transaction.currency,
        transaction.exchange_rate_to_pkr,
        transaction.purchase_amount_original,
        transaction.purchase_amount_pkr,
        transaction.selling_amount_original,
        transaction.selling_amount_pkr,
        transaction.profit_pkr
      )
    }

    if (options.paymentStatus) {
      row.push(
        transaction.payment_status,
        transaction.amount_paid,
        transaction.payment_date || 'N/A',
        transaction.payment_method || 'N/A',
        transaction.payment_reference || 'N/A'
      )
    }

    if (options.transactionDetails) {
      row.push(
        transaction.booking_reference || 'N/A',
        transaction.notes || 'N/A'
      )
    }

    return row
  })

  // Add summary totals if requested
  if (options.summaryTotals && transactions.length > 0) {
    // Add empty row
    rows.push([])
    rows.push([])

    // Add summary header
    rows.push(['SUMMARY TOTALS'])
    rows.push([])

    // Calculate totals
    const totalTransactions = transactions.length
    const totalPurchasePKR = transactions.reduce((sum, t) => sum + t.purchase_amount_pkr, 0)
    const totalSellingPKR = transactions.reduce((sum, t) => sum + t.selling_amount_pkr, 0)
    const totalProfitPKR = transactions.reduce((sum, t) => sum + t.profit_pkr, 0)
    const profitMargin = totalSellingPKR > 0 ? (totalProfitPKR / totalSellingPKR) * 100 : 0

    const paidTransactions = transactions.filter(t => t.payment_status === 'paid')
    const pendingTransactions = transactions.filter(t => t.payment_status === 'pending')
    const partialTransactions = transactions.filter(t => t.payment_status === 'partial')

    const totalPaid = paidTransactions.reduce((sum, t) => sum + t.amount_paid, 0)
    const totalPending = pendingTransactions.reduce((sum, t) => sum + t.purchase_amount_pkr, 0)

    rows.push(['Total Transactions', totalTransactions])
    rows.push(['Total Purchase (PKR)', totalPurchasePKR.toFixed(2)])
    rows.push(['Total Selling (PKR)', totalSellingPKR.toFixed(2)])
    rows.push(['Total Profit (PKR)', totalProfitPKR.toFixed(2)])
    rows.push(['Profit Margin (%)', profitMargin.toFixed(2)])
    rows.push([])
    rows.push(['Payment Breakdown'])
    rows.push(['Paid Transactions', paidTransactions.length, 'Amount', totalPaid.toFixed(2)])
    rows.push(['Pending Transactions', pendingTransactions.length, 'Amount', totalPending.toFixed(2)])
    rows.push(['Partial Transactions', partialTransactions.length])
  }

  // Convert to CSV format
  const csv = [headers, ...rows]
    .map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const cellStr = String(cell ?? '')
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    )
    .join('\n')

  // Add BOM for UTF-8 encoding (helps with Excel)
  const bom = '\uFEFF'
  const csvWithBom = bom + csv

  // Create blob and download
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0]
  const sanitizedVendorName = vendorName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  link.download = `vendor-ledger-${sanitizedVendorName}-${timestamp}.csv`

  // Trigger download
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Format currency for display
 * @param amount - Amount to format
 * @param currency - Currency code (default: PKR)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency = 'PKR'): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Export vendors summary to CSV
 * @param vendors - Array of vendors
 */
export const exportVendorsSummaryToCSV = (vendors: any[]) => {
  const headers = [
    'Vendor Name',
    'Type',
    'Contact Person',
    'Phone',
    'Email',
    'Total Business (PKR)',
    'Total Paid (PKR)',
    'Total Pending (PKR)',
    'Total Profit (PKR)',
    'Profit Margin (%)',
    'Status'
  ]

  const rows = vendors.map(vendor => [
    vendor.name,
    vendor.type,
    vendor.contact_person || 'N/A',
    vendor.phone || 'N/A',
    vendor.email || 'N/A',
    vendor.total_business,
    vendor.total_paid,
    vendor.total_pending,
    vendor.total_profit,
    vendor.total_business > 0 ? ((vendor.total_profit / vendor.total_business) * 100).toFixed(2) : '0.00',
    vendor.is_active ? 'Active' : 'Inactive'
  ])

  const csv = [headers, ...rows]
    .map(row =>
      row.map(cell => {
        const cellStr = String(cell ?? '')
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    )
    .join('\n')

  const bom = '\uFEFF'
  const csvWithBom = bom + csv

  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const timestamp = new Date().toISOString().split('T')[0]
  link.download = `vendors-summary-${timestamp}.csv`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
