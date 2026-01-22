export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      queries: {
        Row: {
          id: number
          query_number: string
          passenger_name: string
          phone: string
          email: string | null
          travel_type: 'Umrah' | 'Malaysia' | 'Flight' | 'Hotel' | 'Other'
          status: 'New' | 'Working' | 'Quoted' | 'Finalized' | 'Cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          query_number: string
          passenger_name: string
          phone: string
          email?: string | null
          travel_type: 'Umrah' | 'Malaysia' | 'Flight' | 'Hotel' | 'Other'
          status?: 'New' | 'Working' | 'Quoted' | 'Finalized' | 'Cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          query_number?: string
          passenger_name?: string
          phone?: string
          email?: string | null
          travel_type?: 'Umrah' | 'Malaysia' | 'Flight' | 'Hotel' | 'Other'
          status?: 'New' | 'Working' | 'Quoted' | 'Finalized' | 'Cancelled'
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
