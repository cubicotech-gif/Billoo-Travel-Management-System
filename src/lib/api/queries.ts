import { supabase } from '@/lib/supabase'
import { createTransaction, createInvoice } from '@/lib/api/finance'
import type { TransactionInsert, PaymentMethod, CurrencyCode, Invoice, InvoiceItem } from '@/types/finance'
import type { Query, QueryService } from '@/types/query-workflow'
import { convertToPKR } from '@/lib/formatCurrency'

// ─── Service CRUD ────────────────────────────────────────

export interface UpdateServiceInput {
  service_type?: string
  service_description?: string
  service_date?: string | null
  quantity?: number
  cost_price?: number
  selling_price?: number
  vendor_id?: string
  notes?: string | null
  currency?: string
  exchange_rate?: number
  cost_price_pkr?: number
  selling_price_pkr?: number
  profit_pkr?: number
  service_details?: any
}

export async function updateQueryService(
  serviceId: string,
  data: UpdateServiceInput
): Promise<QueryService> {
  // Recalculate PKR if currency data present
  const isPKR = data.currency === 'PKR'
  if (data.cost_price !== undefined && data.currency && data.exchange_rate !== undefined) {
    const rate = isPKR ? 1 : data.exchange_rate
    data.cost_price_pkr = isPKR ? data.cost_price : convertToPKR(data.cost_price, rate)
    data.selling_price_pkr = isPKR ? (data.selling_price || 0) : convertToPKR(data.selling_price || 0, rate)
    data.profit_pkr = (data.selling_price_pkr || 0) - (data.cost_price_pkr || 0)
  }

  const { data: service, error } = await supabase
    .from('query_services')
    .update(data)
    .eq('id', serviceId)
    .select('*, vendors (id, name, type)')
    .single()

  if (error) throw error

  // Recalculate query totals
  if (service.query_id) {
    await recalculateQueryTotals(service.query_id)
  }

  // Log activity
  await supabase.from('activities').insert({
    entity_type: 'query_service',
    entity_id: serviceId,
    action: 'updated',
    description: `Service updated: ${data.service_description || service.service_description}`,
  }).then(() => {})

  return service
}

export async function deleteQueryService(serviceId: string): Promise<void> {
  // Get service info first for logging
  const { data: service } = await supabase
    .from('query_services')
    .select('query_id, service_type, service_description')
    .eq('id', serviceId)
    .single()

  if (!service) throw new Error('Service not found')

  // Unlink vendor_transactions (don't delete them — payments already recorded)
  await supabase
    .from('vendor_transactions')
    .update({ service_id: null })
    .eq('service_id', serviceId)

  // Delete the service
  const { error } = await supabase
    .from('query_services')
    .delete()
    .eq('id', serviceId)

  if (error) throw error

  // Recalculate query totals
  await recalculateQueryTotals(service.query_id)

  // Log activity
  await supabase.from('activities').insert({
    entity_type: 'query_service',
    entity_id: service.query_id,
    action: 'deleted',
    description: `Service deleted: ${service.service_type} - ${service.service_description}`,
  }).then(() => {})
}

export async function recalculateQueryTotals(queryId: string): Promise<void> {
  const { data: services } = await supabase
    .from('query_services')
    .select('cost_price, selling_price, quantity, cost_price_pkr, selling_price_pkr')
    .eq('query_id', queryId)

  if (!services) return

  const totalCostPkr = services.reduce((sum, s) =>
    sum + (s.cost_price_pkr || s.cost_price || 0) * (s.quantity || 1), 0)
  const totalSellingPkr = services.reduce((sum, s) =>
    sum + (s.selling_price_pkr || s.selling_price || 0) * (s.quantity || 1), 0)
  const totalProfitPkr = totalSellingPkr - totalCostPkr

  await supabase
    .from('queries')
    .update({
      total_cost_pkr: totalCostPkr,
      total_selling_pkr: totalSellingPkr,
      total_profit_pkr: totalProfitPkr,
    })
    .eq('id', queryId)
}

// ─── Advance Payment ─────────────────────────────────────

export interface AdvancePaymentInput {
  passenger_id: string
  amount: number
  currency: CurrencyCode
  exchange_rate: number
  payment_method: PaymentMethod
  transaction_date: string
  reference_number?: string
  notes?: string
  receipt_url?: string
}

export async function recordAdvancePayment(
  queryId: string,
  queryNumber: string,
  destination: string,
  data: AdvancePaymentInput
) {
  const isPKR = data.currency === 'PKR'
  const amountPkr = isPKR ? data.amount : convertToPKR(data.amount, data.exchange_rate)

  // Create real transaction in finance module
  const txnInsert: TransactionInsert = {
    type: 'payment_received',
    direction: 'in',
    amount: amountPkr,
    currency: 'PKR',
    payment_method: data.payment_method,
    reference_number: data.reference_number || null,
    passenger_id: data.passenger_id,
    transaction_date: data.transaction_date,
    description: `Advance payment for Query ${queryNumber} - ${destination}`,
    receipt_url: data.receipt_url || null,
    notes: data.notes || null,
    original_amount: isPKR ? null : data.amount,
    original_currency: isPKR ? null : data.currency,
    exchange_rate: isPKR ? null : data.exchange_rate,
    source_reference_id: queryId,
    source_reference_type: 'query',
  }

  const transaction = await createTransaction(txnInsert)

  // Update query advance payment fields
  // Get current advance total from all transactions linked to this query
  const payments = await getQueryPayments(queryId)
  const totalAdvance = payments.reduce((sum, p) => sum + p.amount, 0) + amountPkr

  await supabase
    .from('queries')
    .update({
      advance_payment_recorded: true,
      advance_payment_amount: totalAdvance,
      advance_payment_date: data.transaction_date,
      advance_transaction_id: transaction.id,
    })
    .eq('id', queryId)

  // Update passenger credit balance (advance without invoice)
  await updatePassengerCreditFromAdvance(data.passenger_id, amountPkr)

  // Log activity on query
  await supabase.from('activities').insert({
    entity_type: 'query',
    entity_id: queryId,
    action: 'advance_payment',
    description: `Advance payment of Rs ${amountPkr.toLocaleString()} received`,
    metadata: { transaction_id: transaction.id, amount: amountPkr },
  }).then(() => {})

  // Log activity on passenger
  await supabase.from('activities').insert({
    entity_type: 'passenger',
    entity_id: data.passenger_id,
    action: 'payment_received',
    description: `Advance payment for Query ${queryNumber}: Rs ${amountPkr.toLocaleString()}`,
    metadata: { transaction_id: transaction.id, query_id: queryId },
  }).then(() => {})

  return { transaction, totalAdvance }
}

async function updatePassengerCreditFromAdvance(passengerId: string, amount: number) {
  // Get current credit balance
  const { data: passenger } = await supabase
    .from('passengers')
    .select('credit_balance')
    .eq('id', passengerId)
    .single()

  if (passenger) {
    await supabase
      .from('passengers')
      .update({ credit_balance: (passenger.credit_balance || 0) + amount })
      .eq('id', passengerId)
  }
}

// ─── Query Payments ──────────────────────────────────────

export async function getQueryPayments(queryId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      passengers:passenger_id (first_name, last_name)
    `)
    .eq('source_reference_type', 'query')
    .eq('source_reference_id', queryId)
    .eq('type', 'payment_received')
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getQueryFinancialSummary(queryId: string) {
  // Get query totals
  const { data: query } = await supabase
    .from('queries')
    .select('total_cost_pkr, total_selling_pkr, total_profit_pkr, advance_payment_amount')
    .eq('id', queryId)
    .single()

  // Get all advance payments
  const payments = await getQueryPayments(queryId)
  const advanceReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  const totalSelling = query?.total_selling_pkr || 0
  const totalCost = query?.total_cost_pkr || 0
  const profit = query?.total_profit_pkr || 0

  return {
    totalCost,
    totalSelling,
    profit,
    advanceReceived,
    pendingFromClient: Math.max(0, totalSelling - advanceReceived),
  }
}

// ─── Invoice Auto-Generation ────────────────────────────

export async function checkExistingInvoice(queryId: string): Promise<Invoice | null> {
  const { data } = await supabase
    .from('invoices')
    .select(`*, queries:query_id (query_number, client_name), passengers:passenger_id (first_name, last_name)`)
    .eq('source_reference_id', queryId)
    .eq('source_reference_type', 'query')
    .limit(1)

  return data?.[0] || null
}

export interface InvoiceGenerationResult {
  invoice: Invoice
  items: InvoiceItem[]
  linkedPayments: number
}

export async function generateInvoiceFromQuery(queryId: string): Promise<InvoiceGenerationResult> {
  // 1. Load query data
  const { data: query, error: qErr } = await supabase
    .from('queries')
    .select('*')
    .eq('id', queryId)
    .single()
  if (qErr || !query) throw new Error('Query not found')

  // 2. Load services
  const { data: services } = await supabase
    .from('query_services')
    .select('*, vendors (id, name, type)')
    .eq('query_id', queryId)
    .order('created_at', { ascending: true })
  if (!services || services.length === 0) throw new Error('No services to invoice')

  // 3. Find primary passenger
  const { data: qPassengers } = await supabase
    .from('query_passengers')
    .select('passenger_id, is_primary, passengers (id, first_name, last_name)')
    .eq('query_id', queryId)
    .order('is_primary', { ascending: false })

  const primaryPassenger = qPassengers?.find(p => p.is_primary) || qPassengers?.[0]
  if (!primaryPassenger) throw new Error('No passengers linked to this query')

  // 4. Calculate totals from services
  const totalAmount = services.reduce((sum, s) =>
    sum + (s.selling_price_pkr || s.selling_price || 0) * (s.quantity || 1), 0)
  const totalCost = services.reduce((sum, s) =>
    sum + (s.cost_price_pkr || s.cost_price || 0) * (s.quantity || 1), 0)
  const totalProfit = totalAmount - totalCost

  // 5. Create invoice
  const dueDate = query.travel_date
    ? new Date(new Date(query.travel_date).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null

  const invoice = await createInvoice({
    passenger_id: primaryPassenger.passenger_id,
    query_id: queryId,
    amount: totalAmount,
    paid_amount: 0,
    total_cost: totalCost,
    total_profit: totalProfit,
    currency: 'PKR',
    status: 'sent',
    due_date: dueDate,
    notes: `Auto-generated from Query ${query.query_number} - ${query.destination}`,
  })

  // Also set source reference on invoice
  await supabase
    .from('invoices')
    .update({ source: 'auto', source_reference_id: queryId, source_reference_type: 'query' })
    .eq('id', invoice.id)

  // 6. Create invoice items (one per service)
  // Note: `total` is a GENERATED column — do NOT insert it
  const itemRows = services.map(s => {
    const costPkr = (s.cost_price_pkr || s.cost_price || 0)
    const sellingPkr = (s.selling_price_pkr || s.selling_price || 0)
    const isForeign = s.currency && s.currency !== 'PKR'

    return {
      invoice_id: invoice.id,
      service_id: s.id,
      description: `${s.service_type} - ${s.service_description}`,
      quantity: s.quantity || 1,
      unit_price: sellingPkr,
      tax_percentage: 0,
      service_type: s.service_type,
      vendor_id: s.vendor_id || null,
      purchase_price: costPkr,
      selling_price: sellingPkr,
      profit: sellingPkr - costPkr,
      original_currency: isForeign ? s.currency : null,
      exchange_rate: isForeign ? s.exchange_rate : null,
      purchase_price_original: isForeign ? s.cost_price : null,
      selling_price_original: isForeign ? s.selling_price : null,
      notes: isForeign
        ? `ROE: ${s.exchange_rate} | ${s.currency} cost: ${s.cost_price} | ${s.currency} selling: ${s.selling_price}`
        : null,
    }
  })

  const { data: items, error: itemsErr } = await supabase
    .from('invoice_items')
    .insert(itemRows)
    .select('*, vendors:vendor_id (name)')

  if (itemsErr) throw itemsErr

  // 7. Auto-link advance payments to this invoice
  const { data: advancePayments } = await supabase
    .from('transactions')
    .select('id, amount')
    .eq('source_reference_type', 'query')
    .eq('source_reference_id', queryId)
    .eq('type', 'payment_received')
    .is('invoice_id', null)

  let linkedPayments = 0
  if (advancePayments && advancePayments.length > 0) {
    for (const payment of advancePayments) {
      await supabase
        .from('transactions')
        .update({ invoice_id: invoice.id })
        .eq('id', payment.id)
      linkedPayments++
    }
    // The DB trigger update_invoice_on_transaction will auto-update paid_amount
  }

  // 8. Log activities
  await Promise.all([
    supabase.from('activities').insert({
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'created',
      description: `Auto-generated from Query ${query.query_number}`,
    }),
    supabase.from('activities').insert({
      entity_type: 'passenger',
      entity_id: primaryPassenger.passenger_id,
      action: 'invoice_created',
      description: `Invoice ${invoice.invoice_number} created for Query ${query.query_number}`,
    }),
    supabase.from('activities').insert({
      entity_type: 'query',
      entity_id: queryId,
      action: 'invoice_created',
      description: `Invoice ${invoice.invoice_number} generated`,
      metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
    }),
  ])

  return { invoice, items: items || [], linkedPayments }
}

export async function updateInvoiceFromQuery(queryId: string, invoiceId: string): Promise<{ added: number }> {
  // Find services NOT already on the invoice
  const { data: existingItems } = await supabase
    .from('invoice_items')
    .select('service_id')
    .eq('invoice_id', invoiceId)

  const existingServiceIds = new Set((existingItems || []).map(i => i.service_id).filter(Boolean))

  const { data: services } = await supabase
    .from('query_services')
    .select('*, vendors (id, name, type)')
    .eq('query_id', queryId)

  if (!services) return { added: 0 }

  const newServices = services.filter(s => !existingServiceIds.has(s.id))
  if (newServices.length === 0) return { added: 0 }

  const rows = newServices.map(s => {
    const costPkr = s.cost_price_pkr || s.cost_price || 0
    const sellingPkr = s.selling_price_pkr || s.selling_price || 0
    const isForeign = s.currency && s.currency !== 'PKR'
    return {
      invoice_id: invoiceId,
      service_id: s.id,
      description: `${s.service_type} - ${s.service_description}`,
      quantity: s.quantity || 1,
      unit_price: sellingPkr,
      tax_percentage: 0,
      service_type: s.service_type,
      vendor_id: s.vendor_id || null,
      purchase_price: costPkr,
      selling_price: sellingPkr,
      profit: sellingPkr - costPkr,
      original_currency: isForeign ? s.currency : null,
      exchange_rate: isForeign ? s.exchange_rate : null,
      purchase_price_original: isForeign ? s.cost_price : null,
      selling_price_original: isForeign ? s.selling_price : null,
    }
  })

  await supabase.from('invoice_items').insert(rows)

  // Recalculate invoice totals
  const { data: allItems } = await supabase
    .from('invoice_items')
    .select('selling_price, purchase_price, quantity')
    .eq('invoice_id', invoiceId)

  if (allItems) {
    const amount = allItems.reduce((s, i) => s + (i.selling_price || 0) * (i.quantity || 1), 0)
    const totalCost = allItems.reduce((s, i) => s + (i.purchase_price || 0) * (i.quantity || 1), 0)
    await supabase.from('invoices').update({
      amount,
      total_cost: totalCost,
      total_profit: amount - totalCost,
    }).eq('id', invoiceId)
  }

  return { added: newServices.length }
}

// ─── Itinerary Data ─────────────────────────────────────

export interface ItineraryPassenger {
  first_name: string
  last_name: string
  passport_number?: string | null
  gender?: string | null
}

export interface ItineraryData {
  query: Query
  passengers: ItineraryPassenger[]
  services: QueryService[]
  invoice: Invoice | null
  financialSummary: { total: number; paid: number; pending: number; currency: string }
  generatedAt: string
}

export async function getQueryForItinerary(queryId: string): Promise<ItineraryData> {
  // Load query
  const { data: query, error: qErr } = await supabase
    .from('queries')
    .select('*')
    .eq('id', queryId)
    .single()
  if (qErr || !query) throw new Error('Query not found')

  // Load passengers
  const { data: qPassengers } = await supabase
    .from('query_passengers')
    .select('passengers (first_name, last_name, passport_number, gender)')
    .eq('query_id', queryId)

  const passengers: ItineraryPassenger[] = (qPassengers || []).map((qp: any) => qp.passengers)

  // Load services sorted by service_date
  const { data: services } = await supabase
    .from('query_services')
    .select('*, vendors (id, name, type)')
    .eq('query_id', queryId)
    .order('service_date', { ascending: true, nullsFirst: false })

  // Load invoice
  const invoice = await checkExistingInvoice(queryId)

  // Financial summary
  const totalSelling = query.total_selling_pkr || 0
  let paid = 0
  if (invoice) {
    paid = invoice.paid_amount || 0
  } else {
    const payments = await getQueryPayments(queryId)
    paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
  }

  return {
    query,
    passengers,
    services: services || [],
    invoice,
    financialSummary: {
      total: totalSelling,
      paid,
      pending: Math.max(0, totalSelling - paid),
      currency: 'PKR',
    },
    generatedAt: new Date().toISOString(),
  }
}
