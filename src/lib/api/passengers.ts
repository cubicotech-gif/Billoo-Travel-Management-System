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
