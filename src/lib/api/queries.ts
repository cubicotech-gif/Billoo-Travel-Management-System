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

// ─── Auto-link Passenger to Query ────────────────────────

export async function linkPassengerToQuery(queryId: string, passengerId: string): Promise<void> {
  // Check if already linked
  const { data: existing } = await supabase
    .from('query_passengers')
    .select('id')
    .eq('query_id', queryId)
    .eq('passenger_id', passengerId)
    .limit(1)

  if (existing && existing.length > 0) return

  // Check if any passenger is already linked (to determine is_primary)
  const { data: anyLinked } = await supabase
    .from('query_passengers')
    .select('id')
    .eq('query_id', queryId)
    .limit(1)

  await supabase
    .from('query_passengers')
    .insert({
      query_id: queryId,
      passenger_id: passengerId,
      is_primary: !anyLinked || anyLinked.length === 0,
      passenger_type: 'adult',
    })
}

export async function createPassengerAndLink(
  queryId: string,
  name: string,
  phone: string,
  email?: string
): Promise<string> {
  // Split name into first/last
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0] || name.trim()
  const lastName = parts.slice(1).join(' ') || ''

  // Create passenger with minimal info
  const { data: passenger, error } = await supabase
    .from('passengers')
    .insert({
      first_name: firstName,
      last_name: lastName,
      phone: phone || '0000000000',
      email: email || null,
      nationality: 'Pakistani',
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw error

  // Link to query
  await linkPassengerToQuery(queryId, passenger.id)

  // Log activity
  await supabase.from('activities').insert({
    entity_type: 'passenger',
    entity_id: passenger.id,
    action: 'created',
    description: `Auto-created from new query`,
  }).then(() => {})

  return passenger.id
}

// ─── Query Cloning ──────────────────────────────────────

export interface CloneQueryInput {
  client_name: string
  client_phone: string
  client_email?: string | null
  destination?: string
  travel_date?: string | null
  return_date?: string | null
}

export async function cloneQuery(
  sourceQueryId: string,
  newData: CloneQueryInput,
  options: { cloneServices: boolean; clonePassengers: boolean; cloneNotes: boolean }
): Promise<any> {
  // Load source query
  const { data: source } = await supabase
    .from('queries')
    .select('*')
    .eq('id', sourceQueryId)
    .single()
  if (!source) throw new Error('Source query not found')

  // Create new query
  const newQuery: any = {
    client_name: newData.client_name,
    client_phone: newData.client_phone,
    client_email: newData.client_email || null,
    destination: newData.destination || source.destination,
    travel_date: newData.travel_date || null,
    return_date: newData.return_date || null,
    service_type: source.service_type,
    adults: source.adults,
    children: source.children,
    infants: source.infants,
    status: 'New Query - Not Responded',
    is_responded: false,
    tentative_plan: options.cloneNotes ? source.tentative_plan : null,
    internal_reminders: options.cloneNotes ? source.internal_reminders : null,
  }

  const { data: created, error } = await supabase
    .from('queries')
    .insert(newQuery)
    .select('*')
    .single()
  if (error) throw error

  // Clone services
  if (options.cloneServices) {
    const { data: services } = await supabase
      .from('query_services')
      .select('*')
      .eq('query_id', sourceQueryId)

    if (services && services.length > 0) {
      const newServices = services.map(s => ({
        query_id: created.id,
        service_type: s.service_type,
        service_description: s.service_description,
        vendor_id: s.vendor_id,
        cost_price: s.cost_price,
        selling_price: s.selling_price,
        quantity: s.quantity,
        currency: s.currency,
        exchange_rate: s.exchange_rate,
        cost_price_pkr: s.cost_price_pkr,
        selling_price_pkr: s.selling_price_pkr,
        profit_pkr: s.profit_pkr,
        service_details: s.service_details,
        service_date: null,
        booking_status: 'pending',
        delivery_status: 'not_started',
      }))
      await supabase.from('query_services').insert(newServices)
      await recalculateQueryTotals(created.id)
    }
  }

  // Clone passengers
  if (options.clonePassengers) {
    const { data: passengers } = await supabase
      .from('query_passengers')
      .select('passenger_id, is_primary')
      .eq('query_id', sourceQueryId)

    if (passengers && passengers.length > 0) {
      const newLinks = passengers.map(p => ({
        query_id: created.id,
        passenger_id: p.passenger_id,
        is_primary: p.is_primary,
      }))
      await supabase.from('query_passengers').insert(newLinks)
    }
  }

  return created
}

// ─── Templates ──────────────────────────────────────────

export interface QueryTemplate {
  id: string
  name: string
  description: string | null
  destination: string | null
  duration_days: number | null
  services_template: any[]
  pax_type: string
  base_pax_count: number
  category: string | null
  is_active: boolean
  created_at: string
}

export async function saveAsTemplate(
  queryId: string,
  templateData: { name: string; category: string | null; description?: string; duration_days?: number }
): Promise<QueryTemplate> {
  const { data: query } = await supabase
    .from('queries')
    .select('destination')
    .eq('id', queryId)
    .single()

  const { data: services } = await supabase
    .from('query_services')
    .select('*, vendors (id, name)')
    .eq('query_id', queryId)

  const servicesTemplate = (services || []).map(s => ({
    service_type: s.service_type,
    description: s.service_description,
    vendor_id: s.vendor_id,
    vendor_name: s.vendors?.name || null,
    cost_price: s.cost_price,
    selling_price: s.selling_price,
    currency: s.currency || 'SAR',
    quantity: s.quantity || 1,
    per_pax: false,
    service_details: s.service_details || null,
  }))

  const { data, error } = await supabase
    .from('query_templates')
    .insert({
      name: templateData.name,
      description: templateData.description || null,
      destination: query?.destination || null,
      duration_days: templateData.duration_days || null,
      services_template: servicesTemplate,
      category: templateData.category || 'custom',
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getTemplates(filters?: { category?: string; isActive?: boolean }): Promise<QueryTemplate[]> {
  let q = supabase.from('query_templates').select('*').order('name')
  if (filters?.category) q = q.eq('category', filters.category)
  if (filters?.isActive !== undefined) q = q.eq('is_active', filters.isActive)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function createQueryFromTemplate(
  templateId: string,
  queryData: { client_name: string; client_phone: string; client_email?: string; destination?: string; travel_date?: string; return_date?: string; adults?: number; children?: number; infants?: number },
  paxCount: number,
  roe: number
): Promise<any> {
  const { data: template } = await supabase
    .from('query_templates')
    .select('*')
    .eq('id', templateId)
    .single()
  if (!template) throw new Error('Template not found')

  // Create query
  const { data: query, error } = await supabase
    .from('queries')
    .insert({
      client_name: queryData.client_name,
      client_phone: queryData.client_phone,
      client_email: queryData.client_email || null,
      destination: queryData.destination || template.destination || '',
      travel_date: queryData.travel_date || null,
      return_date: queryData.return_date || null,
      adults: queryData.adults || paxCount,
      children: queryData.children || 0,
      infants: queryData.infants || 0,
      service_type: template.category?.includes('umrah') ? 'Umrah Package' : template.category?.includes('hajj') ? 'Hajj Package' : 'Other',
      status: 'New Query - Not Responded',
      is_responded: false,
    })
    .select('*')
    .single()
  if (error) throw error

  // Create services from template
  const templateServices = template.services_template || []
  if (templateServices.length > 0) {
    const isPKR = templateServices[0]?.currency === 'PKR'
    const rate = isPKR ? 1 : roe

    const serviceRows = templateServices.map((s: any) => {
      const qty = s.per_pax ? (s.quantity || 1) * paxCount : (s.quantity || 1)
      const costPkr = isPKR ? s.cost_price : convertToPKR(s.cost_price, rate)
      const sellingPkr = isPKR ? s.selling_price : convertToPKR(s.selling_price, rate)
      return {
        query_id: query.id,
        service_type: s.service_type,
        service_description: s.description || s.service_type,
        vendor_id: s.vendor_id || null,
        cost_price: s.cost_price,
        selling_price: s.selling_price,
        quantity: qty,
        currency: s.currency || 'SAR',
        exchange_rate: rate,
        cost_price_pkr: costPkr,
        selling_price_pkr: sellingPkr,
        profit_pkr: sellingPkr - costPkr,
        service_details: s.service_details || null,
        booking_status: 'pending',
        delivery_status: 'not_started',
      }
    })
    await supabase.from('query_services').insert(serviceRows)
    await recalculateQueryTotals(query.id)
  }

  return query
}

// ─── Reminders ──────────────────────────────────────────

export interface Reminder {
  id: string
  entity_type: string
  entity_id: string
  reminder_type: string
  title: string
  description: string | null
  due_date: string
  is_completed: boolean
  completed_at: string | null
  priority: string
  created_at: string
}

export interface CreateReminderInput {
  title: string
  description?: string
  due_date: string
  priority?: string
  reminder_type?: string
}

export async function createQueryReminder(queryId: string, data: CreateReminderInput): Promise<Reminder> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      user_id: user.id,
      entity_type: 'query',
      entity_id: queryId,
      reminder_type: data.reminder_type || 'follow_up',
      title: data.title,
      description: data.description || null,
      due_date: data.due_date,
      priority: data.priority || 'medium',
    })
    .select('*')
    .single()

  if (error) throw error
  return reminder
}

export async function getQueryReminders(queryId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('entity_type', 'query')
    .eq('entity_id', queryId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getAllPendingReminders(): Promise<(Reminder & { query_number?: string; client_name?: string })[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_completed', false)
    .order('due_date', { ascending: true })
    .limit(50)
  if (error) throw error

  // Enrich query reminders with query info
  const queryIds = (data || []).filter(r => r.entity_type === 'query').map(r => r.entity_id)
  if (queryIds.length > 0) {
    const { data: queries } = await supabase
      .from('queries')
      .select('id, query_number, client_name')
      .in('id', queryIds)
    const queryMap = new Map((queries || []).map(q => [q.id, q]))
    return (data || []).map(r => {
      const q = queryMap.get(r.entity_id)
      return { ...r, query_number: q?.query_number, client_name: q?.client_name }
    })
  }
  return data || []
}

export async function completeReminder(reminderId: string): Promise<void> {
  const { error } = await supabase
    .from('reminders')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('id', reminderId)
  if (error) throw error
}

export async function snoozeReminder(reminderId: string, days: number): Promise<void> {
  const { data: reminder } = await supabase
    .from('reminders')
    .select('due_date')
    .eq('id', reminderId)
    .single()
  if (!reminder) throw new Error('Reminder not found')

  const newDate = new Date(reminder.due_date)
  newDate.setDate(newDate.getDate() + days)

  const { error } = await supabase
    .from('reminders')
    .update({ due_date: newDate.toISOString() })
    .eq('id', reminderId)
  if (error) throw error
}

export async function checkAutoReminders(queryId: string, status: string): Promise<void> {
  const { data: query } = await supabase
    .from('queries')
    .select('client_name, query_number')
    .eq('id', queryId)
    .single()
  if (!query) return

  // Check for existing active reminders to avoid duplicates
  const { data: existing } = await supabase
    .from('reminders')
    .select('reminder_type')
    .eq('entity_type', 'query')
    .eq('entity_id', queryId)
    .eq('is_completed', false)

  const existingTypes = new Set((existing || []).map(r => r.reminder_type))

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const reminders: any[] = []

  if (status === 'Proposal Sent' && !existingTypes.has('follow_up')) {
    const due = new Date()
    due.setDate(due.getDate() + 3)
    reminders.push({
      user_id: user.id,
      entity_type: 'query',
      entity_id: queryId,
      reminder_type: 'follow_up',
      title: `Follow up with ${query.client_name} about proposal`,
      description: `Query ${query.query_number} — proposal sent, no response yet.`,
      due_date: due.toISOString(),
      priority: 'high',
    })
  }

  if (status === 'Responded - Awaiting Reply' && !existingTypes.has('follow_up')) {
    const due = new Date()
    due.setDate(due.getDate() + 2)
    reminders.push({
      user_id: user.id,
      entity_type: 'query',
      entity_id: queryId,
      reminder_type: 'follow_up',
      title: `Follow up: ${query.client_name} hasn't replied`,
      description: `Query ${query.query_number} — awaiting reply for 2+ days.`,
      due_date: due.toISOString(),
      priority: 'medium',
    })
  }

  if (status === 'Revisions Requested' && !existingTypes.has('follow_up')) {
    const due = new Date()
    due.setDate(due.getDate() + 2)
    reminders.push({
      user_id: user.id,
      entity_type: 'query',
      entity_id: queryId,
      reminder_type: 'follow_up',
      title: `Send revised proposal to ${query.client_name}`,
      description: `Query ${query.query_number} — revisions requested.`,
      due_date: due.toISOString(),
      priority: 'high',
    })
  }

  if (reminders.length > 0) {
    await supabase.from('reminders').insert(reminders)
  }
}

// ─── Travel Proximity Alerts ────────────────────────────

export interface ProximityAlert {
  queryId: string
  queryNumber: string
  clientName: string
  destination: string
  travelDate: string
  daysUntilTravel: number
  severity: 'warning' | 'critical' | 'urgent'
  issues: string[]
}

export async function getProximityAlerts(): Promise<ProximityAlert[]> {
  const today = new Date()
  const in14Days = new Date(today)
  in14Days.setDate(today.getDate() + 14)

  // Get queries with travel dates in next 14 days that aren't completed/cancelled
  const { data: queries } = await supabase
    .from('queries')
    .select('id, query_number, client_name, destination, travel_date, status, total_selling_pkr')
    .not('status', 'in', '("Completed","Cancelled")')
    .not('travel_date', 'is', null)
    .lte('travel_date', in14Days.toISOString().split('T')[0])
    .gte('travel_date', today.toISOString().split('T')[0])

  if (!queries || queries.length === 0) return []

  const alerts: ProximityAlert[] = []

  for (const q of queries) {
    const travelDate = new Date(q.travel_date)
    const daysUntil = Math.ceil((travelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const issues: string[] = []

    // Check services booked
    const { data: services } = await supabase
      .from('query_services')
      .select('booking_status, voucher_url')
      .eq('query_id', q.id)

    const unbooked = (services || []).filter(s => s.booking_status !== 'confirmed').length
    const missingVouchers = (services || []).filter(s => !s.voucher_url).length

    if (unbooked > 0 && daysUntil <= 14) {
      issues.push(`${unbooked} service${unbooked > 1 ? 's' : ''} not booked`)
    }

    // Check invoice
    const existing = await checkExistingInvoice(q.id)
    if (!existing && daysUntil <= 7) {
      issues.push('No invoice generated')
    }

    // Check payment
    if (existing && daysUntil <= 7) {
      const balance = existing.amount - existing.paid_amount
      if (balance > 0) {
        issues.push(`Rs ${balance.toLocaleString()} pending from client`)
      }
    }

    // Check vouchers
    if (missingVouchers > 0 && daysUntil <= 7) {
      issues.push(`${missingVouchers} voucher${missingVouchers > 1 ? 's' : ''} missing`)
    }

    // Check status vs date
    if (daysUntil === 0) {
      const stageOrder = ['New Query - Not Responded', 'Responded - Awaiting Reply', 'Working on Proposal', 'Proposal Sent', 'Revisions Requested', 'Finalized & Booking', 'Services Booked']
      if (stageOrder.includes(q.status)) {
        issues.push(`Travel is TODAY but status is "${q.status}"`)
      }
    }

    if (issues.length > 0) {
      let severity: ProximityAlert['severity'] = 'warning'
      if (daysUntil <= 3) severity = 'urgent'
      else if (daysUntil <= 7) severity = 'critical'

      alerts.push({
        queryId: q.id,
        queryNumber: q.query_number,
        clientName: q.client_name,
        destination: q.destination,
        travelDate: q.travel_date,
        daysUntilTravel: daysUntil,
        severity,
        issues,
      })
    }
  }

  // Sort by urgency
  alerts.sort((a, b) => a.daysUntilTravel - b.daysUntilTravel)
  return alerts
}

export async function getQueryAlerts(queryId: string): Promise<ProximityAlert[]> {
  const all = await getProximityAlerts()
  return all.filter(a => a.queryId === queryId)
}
