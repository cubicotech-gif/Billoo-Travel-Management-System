import { supabase } from '@/lib/supabase'
import type { PassengerOption } from '@/types/finance'

export async function fetchActivePassengers(): Promise<PassengerOption[]> {
  const { data, error } = await supabase
    .from('passengers')
    .select('id, first_name, last_name')
    .eq('status', 'active')
    .order('first_name')

  if (error) throw error
  return data || []
}

export async function fetchPassengerById(id: string) {
  const { data, error } = await supabase
    .from('passengers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function searchPassengers(term: string): Promise<PassengerOption[]> {
  const { data, error } = await supabase
    .from('passengers')
    .select('id, first_name, last_name')
    .eq('status', 'active')
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%`)
    .order('first_name')
    .limit(20)

  if (error) throw error
  return data || []
}

export async function createPassenger(passenger: {
  first_name: string
  last_name: string
  phone: string
  email?: string
  whatsapp?: string
}) {
  const { data, error } = await supabase
    .from('passengers')
    .insert(passenger)
    .select('id, first_name, last_name')
    .single()

  if (error) throw error
  return data
}

// ─── Phase 5: Passenger Auto-Create from Query ──────────────────

export async function findDuplicatePassenger(
  firstName: string,
  lastName: string,
  phone?: string,
  passportNumber?: string
): Promise<any | null> {
  // Check by name + phone first (most common match)
  if (phone) {
    const { data } = await supabase
      .from('passengers')
      .select('id, first_name, last_name, phone, email, passport_number')
      .ilike('first_name', firstName.trim())
      .ilike('last_name', lastName.trim())
      .eq('phone', phone.trim())
      .limit(1)
    if (data && data.length > 0) return data[0]
  }

  // Check by passport number (unique identifier)
  if (passportNumber) {
    const { data } = await supabase
      .from('passengers')
      .select('id, first_name, last_name, phone, email, passport_number')
      .ilike('passport_number', passportNumber.trim())
      .limit(1)
    if (data && data.length > 0) return data[0]
  }

  return null
}

export interface CreatePassengerFromQueryInput {
  first_name: string
  last_name: string
  phone: string
  whatsapp?: string
  email?: string
  passport_number?: string
  passport_expiry?: string
  date_of_birth?: string
  cnic?: string
  gender?: string
  nationality?: string
}

export async function createPassengerFromQuery(
  passengerData: CreatePassengerFromQueryInput,
  queryId: string,
  queryNumber: string
) {
  // Create the passenger record
  const { data: passenger, error: pError } = await supabase
    .from('passengers')
    .insert({
      ...passengerData,
      nationality: passengerData.nationality || 'Pakistani',
      status: 'active',
    })
    .select('id, first_name, last_name, email, phone, passport_number, nationality')
    .single()

  if (pError) throw pError

  // Create the query_passengers junction record
  const { data: existingLinks } = await supabase
    .from('query_passengers')
    .select('id')
    .eq('query_id', queryId)
    .limit(1)

  const isPrimary = !existingLinks || existingLinks.length === 0

  const { error: qpError } = await supabase
    .from('query_passengers')
    .insert({
      query_id: queryId,
      passenger_id: passenger.id,
      is_primary: isPrimary,
      passenger_type: 'adult',
    })

  if (qpError) throw qpError

  // Log activity
  await supabase.from('activities').insert({
    entity_type: 'passenger',
    entity_id: passenger.id,
    action: 'created',
    description: `Auto-created from Query ${queryNumber}`,
  }).then(() => {}) // fire and forget

  // Auto-create document checklist for this passenger in the query
  try {
    const { createDefaultChecklist } = await import('./documents')
    await createDefaultChecklist(queryId, passenger.id)
  } catch (err) {
    console.error('Failed to create document checklist:', err)
    // Non-blocking — checklist will be created on first view
  }

  return { passenger, isPrimary }
}

// ─── Phase 2: Passenger Profile Functions ───────────────────────

export interface PassengerOutstanding {
  totalBilled: number
  totalPaid: number
  outstanding: number
  creditBalance: number
  unpaidInvoices: number
}

export async function getPassengerOutstanding(passengerId: string): Promise<PassengerOutstanding> {
  const [invoicesRes, paymentsRes, passengerRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('amount, paid_amount, status')
      .eq('passenger_id', passengerId),
    supabase
      .from('transactions')
      .select('amount')
      .eq('passenger_id', passengerId)
      .eq('type', 'payment_received'),
    supabase
      .from('passengers')
      .select('credit_balance')
      .eq('id', passengerId)
      .limit(1),
  ])

  const invoices = invoicesRes.data || []
  const payments = paymentsRes.data || []
  const passenger = (passengerRes.data || [])[0]

  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = payments.reduce((s, t) => s + Number(t.amount), 0)
  const unpaidInvoices = invoices.filter(i =>
    ['pending', 'partial', 'sent', 'overdue'].includes(i.status)
  ).length

  return {
    totalBilled,
    totalPaid,
    outstanding: Math.max(0, totalBilled - totalPaid),
    creditBalance: Number(passenger?.credit_balance || 0),
    unpaidInvoices,
  }
}

export async function fetchPassengerTransactions(passengerId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, transaction_number, transaction_date, type, direction, amount,
      description, payment_method, reference_number,
      original_amount, original_currency, exchange_rate, payment_mode,
      invoice_id,
      invoices:invoice_id (invoice_number)
    `)
    .eq('passenger_id', passengerId)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}
