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
