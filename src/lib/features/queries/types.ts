import type { Database } from '$lib/database.types';

export type Query = Database['public']['Tables']['queries']['Row'];
export type NewQuery = Database['public']['Tables']['queries']['Insert'];
export type QueryUpdate = Database['public']['Tables']['queries']['Update'];
