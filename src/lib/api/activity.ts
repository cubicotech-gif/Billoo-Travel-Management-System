import { supabase } from '@/lib/supabase'
import type { Activity } from '@/types/finance'

export async function fetchActivities(
  entityType: string,
  entityId: string,
  limit = 50
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function fetchRecentActivities(limit = 20): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function logActivity(activity: {
  entity_type: string
  entity_id: string
  action: string
  description?: string
  metadata?: any
}): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single()

  if (error) throw error
  return data
}
