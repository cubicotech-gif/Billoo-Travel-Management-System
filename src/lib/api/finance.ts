import { supabase } from '@/lib/supabase'
import type {
  Transaction, TransactionInsert,
  Invoice, InvoiceInsert, InvoiceItem, InvoiceItemInput,
  FinancialSummary, MonthlyRevenue,
  ProfitLossReport, ReceivablesReport, PayablesReport, TransactionSummary,
} from '@/types/finance'

// ─── Transactions ──────────────────────────────────────────────

const TXN_SELECT = `
  *,
  passengers:passenger_id (first_name, last_name),
  vendors:vendor_id (name),
  invoices:invoice_id (invoice_number)
`

export async function fetchTransactions(limit = 500): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(TXN_SELECT)
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function fetchRecentTransactions(limit = 10): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(TXN_SELECT)
    .order('transaction_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function createTransaction(txn: TransactionInsert): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert(txn)
    .select(TXN_SELECT)
    .single()

  if (error) throw error
  return data
}

// ─── Invoices ──────────────────────────────────────────────────

const INVOICE_SELECT = `
  *,
  queries:query_id (query_number, client_name),
  passengers:passenger_id (first_name, last_name)
`

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchInvoiceById(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createInvoice(invoice: InvoiceInsert): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert(invoice)
    .select(INVOICE_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function updateInvoice(id: string, updates: Partial<InvoiceInsert>): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select(INVOICE_SELECT)
    .single()

  if (error) throw error
  return data
}

// ─── Invoice Items ─────────────────────────────────────────────

export async function fetchInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*, vendors:vendor_id (name)')
    .eq('invoice_id', invoiceId)
    .order('created_at')

  if (error) throw error
  return data || []
}

export async function createInvoiceItems(invoiceId: string, items: InvoiceItemInput[]): Promise<InvoiceItem[]> {
  // Note: `total` is a GENERATED column — do NOT insert it
  const rows = items.map(item => ({
    invoice_id: invoiceId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_percentage: item.tax_percentage,
    service_type: item.service_type,
    vendor_id: item.vendor_id,
    purchase_price: item.purchase_price,
    selling_price: item.selling_price,
    profit: item.selling_price - item.purchase_price,
    notes: item.notes || null,
  }))

  const { data, error } = await supabase
    .from('invoice_items')
    .insert(rows)
    .select('*, vendors:vendor_id (name)')

  if (error) throw error
  return data || []
}

export async function deleteInvoiceItems(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId)

  if (error) throw error
}

// ─── Invoice Payments (transactions linked to invoice) ─────────

export async function fetchInvoicePayments(invoiceId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(TXN_SELECT)
    .eq('invoice_id', invoiceId)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}

// ─── Financial Summary ─────────────────────────────────────────

export async function fetchFinancialSummary(): Promise<FinancialSummary> {
  // Fetch from multiple sources:
  // - invoices: revenue, received (paid_amount), profit
  // - transactions: vendor payments (payment_to_vendor) and client payments (payment_received)
  // - vendors.total_* fields are populated by vendor_transactions trigger (old system)
  //   so we also compute vendor stats from the unified transactions table
  const [invoicesRes, vendorTxnRes, overdueRes] = await Promise.all([
    supabase.from('invoices').select('amount, paid_amount, total_cost, total_profit, status'),
    supabase.from('transactions').select('type, direction, amount, vendor_id')
      .in('type', ['payment_to_vendor', 'refund_from_vendor']),
    supabase.from('invoices').select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'partial', 'sent'])
      .lt('due_date', new Date().toISOString().split('T')[0]),
  ])

  const invoices = invoicesRes.data || []
  const vendorTxns = vendorTxnRes.data || []

  const totalRevenue = invoices.reduce((s, i) => s + i.amount, 0)
  const totalReceived = invoices.reduce((s, i) => s + (i.paid_amount || 0), 0)
  const totalProfit = invoices.reduce((s, i) => s + (i.total_profit || 0), 0)

  // Compute vendor payables from invoice items cost, and vendor paid from transactions
  const totalVendorCost = invoices.reduce((s, i) => s + (i.total_cost || 0), 0)
  const totalVendorPaid = vendorTxns
    .filter(t => t.type === 'payment_to_vendor')
    .reduce((s, t) => s + t.amount, 0)
  const vendorRefunds = vendorTxns
    .filter(t => t.type === 'refund_from_vendor')
    .reduce((s, t) => s + t.amount, 0)
  const totalVendorPending = Math.max(0, totalVendorCost - totalVendorPaid + vendorRefunds)

  return {
    totalRevenue,
    totalReceived,
    totalPending: totalRevenue - totalReceived,
    totalProfit,
    totalVendorPayable: totalVendorCost,
    totalVendorPaid,
    totalVendorPending,
    overdueInvoices: overdueRes.count || 0,
  }
}

export async function fetchMonthlyRevenue(months = 6): Promise<MonthlyRevenue[]> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months + 1)
  startDate.setDate(1)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('amount, paid_amount, total_profit, created_at')
    .gte('created_at', startDate.toISOString())

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, direction, transaction_date')
    .eq('direction', 'in')
    .gte('transaction_date', startDate.toISOString().split('T')[0])

  const monthMap = new Map<string, MonthlyRevenue>()

  // Initialize months
  for (let i = 0; i < months; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    monthMap.set(key, { month: label, revenue: 0, received: 0, profit: 0 })
  }

  // Aggregate invoices
  ;(invoices || []).forEach(inv => {
    const d = new Date(inv.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key)
    if (entry) {
      entry.revenue += inv.amount
      entry.profit += inv.total_profit || 0
    }
  })

  // Aggregate received payments
  ;(transactions || []).forEach(txn => {
    const d = new Date(txn.transaction_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key)
    if (entry) {
      entry.received += txn.amount
    }
  })

  return Array.from(monthMap.values())
}

// ─── Top Vendor Balances ───────────────────────────────────────

export async function fetchTopVendorBalances(limit = 10) {
  // Compute vendor balances from invoice_items (cost) and transactions (payments)
  // since the old vendor_transactions trigger doesn't populate vendors.total_* from bulk imports
  const [vendorsRes, itemsRes, txnRes] = await Promise.all([
    supabase.from('vendors').select('id, name').eq('is_active', true).eq('is_deleted', false),
    supabase.from('invoice_items').select('vendor_id, purchase_price'),
    supabase.from('transactions').select('vendor_id, amount, type')
      .in('type', ['payment_to_vendor', 'refund_from_vendor']),
  ])

  const vendors = vendorsRes.data || []
  const items = itemsRes.data || []
  const txns = txnRes.data || []

  // Build per-vendor totals
  const vendorMap = new Map<string, { id: string; name: string; total_business: number; total_paid: number; total_pending: number }>()

  for (const v of vendors) {
    vendorMap.set(v.id, { id: v.id, name: v.name, total_business: 0, total_paid: 0, total_pending: 0 })
  }

  // Sum purchase prices from invoice items per vendor
  for (const item of items) {
    if (!item.vendor_id) continue
    const v = vendorMap.get(item.vendor_id)
    if (v) v.total_business += item.purchase_price || 0
  }

  // Sum payments from transactions per vendor
  for (const txn of txns) {
    if (!txn.vendor_id) continue
    const v = vendorMap.get(txn.vendor_id)
    if (!v) continue
    if (txn.type === 'payment_to_vendor') v.total_paid += txn.amount
    if (txn.type === 'refund_from_vendor') v.total_paid -= txn.amount
  }

  // Calculate pending
  for (const v of vendorMap.values()) {
    v.total_pending = Math.max(0, v.total_business - v.total_paid)
  }

  return Array.from(vendorMap.values())
    .filter(v => v.total_pending > 0)
    .sort((a, b) => b.total_pending - a.total_pending)
    .slice(0, limit)
}

// ─── Reports ───────────────────────────────────────────────────

export async function fetchProfitLossReport(dateFrom?: string, dateTo?: string): Promise<ProfitLossReport> {
  let invoiceQuery = supabase.from('invoices').select('amount, total_cost, total_profit')
  if (dateFrom) invoiceQuery = invoiceQuery.gte('created_at', dateFrom)
  if (dateTo) invoiceQuery = invoiceQuery.lte('created_at', dateTo + 'T23:59:59')

  let expenseQuery = supabase.from('transactions').select('amount').eq('type', 'expense')
  if (dateFrom) expenseQuery = expenseQuery.gte('transaction_date', dateFrom)
  if (dateTo) expenseQuery = expenseQuery.lte('transaction_date', dateTo)

  const [invoicesRes, expensesRes] = await Promise.all([invoiceQuery, expenseQuery])

  const invoices = invoicesRes.data || []
  const expenses = expensesRes.data || []

  const totalRevenue = invoices.reduce((s, i) => s + i.amount, 0)
  const totalCost = invoices.reduce((s, i) => s + (i.total_cost || 0), 0)
  const grossProfit = totalRevenue - totalCost
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = grossProfit - totalExpenses

  return {
    totalRevenue,
    totalCost,
    grossProfit,
    expenses: totalExpenses,
    netProfit,
    profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  }
}

export async function fetchReceivablesReport(): Promise<ReceivablesReport> {
  const { data } = await supabase
    .from('invoices')
    .select('amount, paid_amount, due_date, status')
    .in('status', ['pending', 'partial', 'sent', 'overdue'])

  const invoices = data || []
  const today = new Date()

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0)
  const totalReceived = invoices.reduce((s, i) => s + i.paid_amount, 0)
  const totalOutstanding = totalBilled - totalReceived

  // Aging buckets
  const buckets = { current: { amount: 0, count: 0 }, '1-30': { amount: 0, count: 0 }, '31-60': { amount: 0, count: 0 }, '61-90': { amount: 0, count: 0 }, '90+': { amount: 0, count: 0 } }

  let overdueAmount = 0
  invoices.forEach(inv => {
    const outstanding = inv.amount - inv.paid_amount
    if (outstanding <= 0) return

    if (!inv.due_date) {
      buckets.current.amount += outstanding
      buckets.current.count++
      return
    }

    const dueDate = new Date(inv.due_date)
    const daysPast = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysPast <= 0) { buckets.current.amount += outstanding; buckets.current.count++ }
    else if (daysPast <= 30) { buckets['1-30'].amount += outstanding; buckets['1-30'].count++; overdueAmount += outstanding }
    else if (daysPast <= 60) { buckets['31-60'].amount += outstanding; buckets['31-60'].count++; overdueAmount += outstanding }
    else if (daysPast <= 90) { buckets['61-90'].amount += outstanding; buckets['61-90'].count++; overdueAmount += outstanding }
    else { buckets['90+'].amount += outstanding; buckets['90+'].count++; overdueAmount += outstanding }
  })

  return {
    totalBilled,
    totalReceived,
    totalOutstanding,
    overdueAmount,
    agingBuckets: [
      { label: 'Current', ...buckets.current },
      { label: '1-30 days', ...buckets['1-30'] },
      { label: '31-60 days', ...buckets['31-60'] },
      { label: '61-90 days', ...buckets['61-90'] },
      { label: '90+ days', ...buckets['90+'] },
    ],
  }
}

export async function fetchPayablesReport(): Promise<PayablesReport> {
  // Compute payables from invoice_items (cost) and transactions (vendor payments)
  const [vendorsRes, itemsRes, txnRes] = await Promise.all([
    supabase.from('vendors').select('id, name').eq('is_active', true).eq('is_deleted', false),
    supabase.from('invoice_items').select('vendor_id, purchase_price'),
    supabase.from('transactions').select('vendor_id, amount, type')
      .in('type', ['payment_to_vendor', 'refund_from_vendor']),
  ])

  const vendors = vendorsRes.data || []
  const items = itemsRes.data || []
  const txns = txnRes.data || []

  const vendorMap = new Map<string, { id: string; name: string; business: number; paid: number }>()
  for (const v of vendors) {
    vendorMap.set(v.id, { id: v.id, name: v.name, business: 0, paid: 0 })
  }

  for (const item of items) {
    if (!item.vendor_id) continue
    const v = vendorMap.get(item.vendor_id)
    if (v) v.business += item.purchase_price || 0
  }

  for (const txn of txns) {
    if (!txn.vendor_id) continue
    const v = vendorMap.get(txn.vendor_id)
    if (!v) continue
    if (txn.type === 'payment_to_vendor') v.paid += txn.amount
    if (txn.type === 'refund_from_vendor') v.paid -= txn.amount
  }

  let totalPayable = 0, totalPaid = 0, totalOutstanding = 0
  const breakdown: PayablesReport['vendorBreakdown'] = []

  for (const v of vendorMap.values()) {
    const outstanding = Math.max(0, v.business - v.paid)
    totalPayable += v.business
    totalPaid += v.paid
    totalOutstanding += outstanding
    if (outstanding > 0) {
      breakdown.push({
        vendorId: v.id,
        vendorName: v.name,
        totalBusiness: v.business,
        totalPaid: v.paid,
        outstanding,
      })
    }
  }

  breakdown.sort((a, b) => b.outstanding - a.outstanding)

  return { totalPayable, totalPaid, totalOutstanding, vendorBreakdown: breakdown }
}

export async function fetchTransactionSummary(dateFrom?: string, dateTo?: string): Promise<TransactionSummary> {
  let query = supabase.from('transactions').select('type, direction, amount, payment_method')
  if (dateFrom) query = query.gte('transaction_date', dateFrom)
  if (dateTo) query = query.lte('transaction_date', dateTo)

  const { data } = await query
  const transactions = data || []

  const totalIn = transactions.filter(t => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = transactions.filter(t => t.direction === 'out').reduce((s, t) => s + t.amount, 0)

  // By type
  const typeMap = new Map<string, { amount: number; count: number }>()
  transactions.forEach(t => {
    const entry = typeMap.get(t.type) || { amount: 0, count: 0 }
    entry.amount += t.amount
    entry.count++
    typeMap.set(t.type, entry)
  })

  const typeLabels: Record<string, string> = {
    payment_received: 'Payment Received',
    payment_to_vendor: 'Payment to Vendor',
    refund_to_client: 'Refund to Client',
    refund_from_vendor: 'Refund from Vendor',
    expense: 'Expense',
    adjustment: 'Adjustment',
  }

  const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type: type as any,
    label: typeLabels[type] || type,
    ...data,
  }))

  // By method
  const methodMap = new Map<string, { amount: number; count: number }>()
  transactions.forEach(t => {
    const method = t.payment_method || 'unknown'
    const entry = methodMap.get(method) || { amount: 0, count: 0 }
    entry.amount += t.amount
    entry.count++
    methodMap.set(method, entry)
  })

  const methodLabels: Record<string, string> = {
    cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
    online: 'Online', other: 'Other', unknown: 'Not specified',
  }

  const byMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    label: methodLabels[method] || method,
    ...data,
  }))

  return { totalIn, totalOut, netBalance: totalIn - totalOut, byType, byMethod }
}
