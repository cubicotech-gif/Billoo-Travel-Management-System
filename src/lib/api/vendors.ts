import { supabase } from '@/lib/supabase'
import type { VendorOption } from '@/types/finance'

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
