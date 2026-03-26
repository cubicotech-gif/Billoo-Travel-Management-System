import { supabase } from '@/lib/supabase'
import { createTransaction } from '@/lib/api/finance'
import type { TransactionInsert, PaymentMethod, CurrencyCode } from '@/types/finance'
import type { QueryService } from '@/types/query-workflow'
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
