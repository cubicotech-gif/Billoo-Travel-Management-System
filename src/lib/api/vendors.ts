import { supabase } from '@/lib/supabase'
import { createTransaction } from '@/lib/api/finance'
import type { VendorOption, PaymentMethod, CurrencyCode } from '@/types/finance'

export async function fetchActiveVendors(): Promise<VendorOption[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, service_types')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .order('name')

  if (error) throw error
  return data || []
}

export async function fetchVendorById(id: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function searchVendors(term: string): Promise<VendorOption[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, service_types')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .ilike('name', `%${term}%`)
    .order('name')
    .limit(20)

  if (error) throw error
  return data || []
}

export async function fetchVendorBalances(limit = 10) {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, total_business, total_paid, total_pending')
    .eq('is_active', true)
    .eq('is_deleted', false)
    .gt('total_pending', 0)
    .order('total_pending', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ─── Phase 3: Vendor Profile Functions ───────────────────────────

export interface VendorRunningAccount {
  totalOwed: number
  totalPaid: number
  balanceDue: number
  creditLimit: number
  creditUsedPercent: number
  isOverLimit: boolean
  overLimitAmount: number
}

export async function getVendorRunningAccount(vendorId: string): Promise<VendorRunningAccount> {
  const [itemsRes, txnRes, vendorRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('purchase_price')
      .eq('vendor_id', vendorId),
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('vendor_id', vendorId)
      .in('type', ['payment_to_vendor', 'refund_from_vendor']),
    supabase
      .from('vendors')
      .select('credit_limit')
      .eq('id', vendorId)
      .limit(1),
  ])

  const totalOwed = (itemsRes.data || []).reduce((s, i) => s + Number(i.purchase_price || 0), 0)
  const payments = (txnRes.data || []).filter(t => t.type === 'payment_to_vendor')
  const refunds = (txnRes.data || []).filter(t => t.type === 'refund_from_vendor')
  const totalPaid = payments.reduce((s, t) => s + Number(t.amount), 0) - refunds.reduce((s, t) => s + Number(t.amount), 0)
  const balanceDue = Math.max(0, totalOwed - totalPaid)
  const creditLimit = Number((vendorRes.data || [])[0]?.credit_limit || 0)
  const creditUsedPercent = creditLimit > 0 ? Math.min(100, (balanceDue / creditLimit) * 100) : 0
  const isOverLimit = creditLimit > 0 && balanceDue > creditLimit
  const overLimitAmount = isOverLimit ? balanceDue - creditLimit : 0

  return { totalOwed, totalPaid, balanceDue, creditLimit, creditUsedPercent, isOverLimit, overLimitAmount }
}

export interface VendorLedgerEntry {
  date: string
  description: string
  owed: number
  paid: number
  ref: string
  passengerName: string | null
  paymentMethod: string | null
}

export async function getVendorLedgerEntries(vendorId: string): Promise<VendorLedgerEntry[]> {
  const [itemsRes, txnRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select(`
        purchase_price, description, service_type, created_at,
        invoices:invoice_id (invoice_number, created_at, passengers:passenger_id (first_name, last_name))
      `)
      .eq('vendor_id', vendorId)
      .order('created_at'),
    supabase
      .from('transactions')
      .select('amount, transaction_date, transaction_number, payment_method, description, type, payment_mode, original_amount, original_currency, exchange_rate')
      .eq('vendor_id', vendorId)
      .in('type', ['payment_to_vendor', 'refund_from_vendor'])
      .order('transaction_date'),
  ])

  const entries: VendorLedgerEntry[] = []

  for (const item of itemsRes.data || []) {
    const invoice = item.invoices as any
    const passenger = invoice?.passengers
    const pName = passenger ? `${passenger.first_name} ${passenger.last_name}` : null
    entries.push({
      date: invoice?.created_at || item.created_at,
      description: `${item.service_type || 'Service'} — ${item.description}`,
      owed: Number(item.purchase_price || 0),
      paid: 0,
      ref: invoice?.invoice_number || '',
      passengerName: pName,
      paymentMethod: null,
    })
  }

  for (const txn of txnRes.data || []) {
    const isRefund = txn.type === 'refund_from_vendor'
    let desc = txn.description || (isRefund ? 'Refund from vendor' : 'Payment to vendor')
    if (txn.payment_method) desc += ` (${txn.payment_method})`
    if (txn.original_currency && txn.original_currency !== 'PKR') {
      desc += ` [${txn.original_currency} ${Number(txn.original_amount).toLocaleString()} @ ${txn.exchange_rate}]`
    }
    entries.push({
      date: txn.transaction_date,
      description: desc,
      owed: isRefund ? 0 : 0,
      paid: isRefund ? -Number(txn.amount) : Number(txn.amount),
      ref: txn.transaction_number,
      passengerName: null,
      paymentMethod: txn.payment_method,
    })
  }

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return entries
}

export interface VendorPayablesPassenger {
  passengerId: string
  passengerName: string
  services: { description: string; serviceType: string; purchasePrice: number; invoiceNumber: string }[]
  totalOwed: number
}

export async function getVendorPayablesBreakdown(vendorId: string): Promise<{
  passengers: VendorPayablesPassenger[]
  specificPayments: number
  collectivePayments: number
  totalPaid: number
}> {
  const [itemsRes, txnRes] = await Promise.all([
    supabase
      .from('invoice_items')
      .select(`
        purchase_price, description, service_type,
        invoices:invoice_id (invoice_number, passenger_id, passengers:passenger_id (first_name, last_name))
      `)
      .eq('vendor_id', vendorId),
    supabase
      .from('transactions')
      .select('amount, type, payment_mode, passenger_id')
      .eq('vendor_id', vendorId)
      .in('type', ['payment_to_vendor', 'refund_from_vendor']),
  ])

  // Group items by passenger
  const passengerMap = new Map<string, VendorPayablesPassenger>()

  for (const item of itemsRes.data || []) {
    const invoice = item.invoices as any
    const passenger = invoice?.passengers
    const pid = invoice?.passenger_id || 'unknown'
    const pName = passenger ? `${passenger.first_name} ${passenger.last_name}` : 'Unknown Passenger'

    if (!passengerMap.has(pid)) {
      passengerMap.set(pid, { passengerId: pid, passengerName: pName, services: [], totalOwed: 0 })
    }
    const entry = passengerMap.get(pid)!
    entry.services.push({
      description: item.description,
      serviceType: item.service_type || 'Service',
      purchasePrice: Number(item.purchase_price || 0),
      invoiceNumber: invoice?.invoice_number || '',
    })
    entry.totalOwed += Number(item.purchase_price || 0)
  }

  // Split payments by mode
  const txns = txnRes.data || []
  let specificPayments = 0
  let collectivePayments = 0

  for (const txn of txns) {
    const amt = txn.type === 'refund_from_vendor' ? -Number(txn.amount) : Number(txn.amount)
    if (txn.payment_mode === 'specific') {
      specificPayments += amt
    } else {
      collectivePayments += amt
    }
  }

  const passengers = Array.from(passengerMap.values()).sort((a, b) => b.totalOwed - a.totalOwed)

  return {
    passengers,
    specificPayments,
    collectivePayments,
    totalPaid: specificPayments + collectivePayments,
  }
}

export async function getVendorServicesHistory(vendorId: string) {
  const { data, error } = await supabase
    .from('invoice_items')
    .select(`
      id, description, service_type, purchase_price, selling_price, profit, created_at,
      original_currency, exchange_rate, purchase_price_original,
      invoices:invoice_id (
        invoice_number, created_at,
        passengers:passenger_id (id, first_name, last_name)
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchVendorTransactions(vendorId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, transaction_number, transaction_date, type, direction, amount,
      description, payment_method, reference_number, payment_mode,
      original_amount, original_currency, exchange_rate,
      passengers:passenger_id (first_name, last_name),
      invoices:invoice_id (invoice_number)
    `)
    .eq('vendor_id', vendorId)
    .in('type', ['payment_to_vendor', 'refund_from_vendor'])
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}

export interface RecordVendorPaymentData {
  amount: number
  paymentMethod: PaymentMethod
  transactionDate: string
  referenceNumber?: string
  description?: string
  paymentMode: 'collective' | 'specific'
  passengerId?: string | null
  invoiceId?: string | null
  originalAmount?: number | null
  originalCurrency?: CurrencyCode | null
  exchangeRate?: number | null
}

export async function recordVendorPayment(vendorId: string, data: RecordVendorPaymentData) {
  const txn = await createTransaction({
    type: 'payment_to_vendor',
    direction: 'out',
    amount: data.amount,
    currency: 'PKR',
    payment_method: data.paymentMethod,
    reference_number: data.referenceNumber || null,
    vendor_id: vendorId,
    passenger_id: data.passengerId || null,
    invoice_id: data.invoiceId || null,
    transaction_date: data.transactionDate,
    description: data.description || 'Payment to vendor',
    original_amount: data.originalAmount || null,
    original_currency: data.originalCurrency || null,
    exchange_rate: data.exchangeRate || null,
    payment_mode: data.paymentMode,
  })

  // Log activity
  await supabase.from('activities').insert({
    entity_type: 'vendor',
    entity_id: vendorId,
    action: 'payment_recorded',
    description: `Payment of ${data.amount.toLocaleString()} PKR recorded (${data.paymentMode})`,
  })

  return txn
}

export async function recordVendorRefund(vendorId: string, data: {
  amount: number
  paymentMethod: PaymentMethod
  transactionDate: string
  referenceNumber?: string
  description?: string
  passengerId?: string | null
  originalAmount?: number | null
  originalCurrency?: CurrencyCode | null
  exchangeRate?: number | null
}) {
  const txn = await createTransaction({
    type: 'refund_from_vendor',
    direction: 'in',
    amount: data.amount,
    currency: 'PKR',
    payment_method: data.paymentMethod,
    reference_number: data.referenceNumber || null,
    vendor_id: vendorId,
    passenger_id: data.passengerId || null,
    transaction_date: data.transactionDate,
    description: data.description || 'Refund from vendor',
    original_amount: data.originalAmount || null,
    original_currency: data.originalCurrency || null,
    exchange_rate: data.exchangeRate || null,
  })

  await supabase.from('activities').insert({
    entity_type: 'vendor',
    entity_id: vendorId,
    action: 'refund_recorded',
    description: `Refund of ${data.amount.toLocaleString()} PKR received from vendor`,
  })

  return txn
}

export async function getVendorPassengers(vendorId: string) {
  const { data, error } = await supabase
    .from('invoice_items')
    .select(`
      invoices:invoice_id (
        id, invoice_number, passenger_id,
        passengers:passenger_id (id, first_name, last_name)
      )
    `)
    .eq('vendor_id', vendorId)

  if (error) throw error

  // Deduplicate passengers
  const passengerMap = new Map<string, { id: string; firstName: string; lastName: string; invoices: { id: string; invoiceNumber: string }[] }>()

  for (const item of data || []) {
    const invoice = item.invoices as any
    if (!invoice?.passengers) continue
    const pid = invoice.passengers.id
    if (!passengerMap.has(pid)) {
      passengerMap.set(pid, {
        id: pid,
        firstName: invoice.passengers.first_name,
        lastName: invoice.passengers.last_name,
        invoices: [],
      })
    }
    const entry = passengerMap.get(pid)!
    if (!entry.invoices.find(inv => inv.id === invoice.id)) {
      entry.invoices.push({ id: invoice.id, invoiceNumber: invoice.invoice_number })
    }
  }

  return Array.from(passengerMap.values())
}
