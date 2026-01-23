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
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'manager' | 'agent' | 'finance' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'admin' | 'manager' | 'agent' | 'finance' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'manager' | 'agent' | 'finance' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      queries: {
        Row: {
          id: string
          query_number: string
          client_name: string
          client_email: string | null
          client_phone: string
          destination: string
          travel_date: string | null
          return_date: string | null
          adults: number
          children: number
          infants: number
          status: string
          assigned_to: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_number?: string
          client_name: string
          client_email?: string | null
          client_phone: string
          destination: string
          travel_date?: string | null
          return_date?: string | null
          adults?: number
          children?: number
          infants?: number
          status?: string
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_number?: string
          client_name?: string
          client_email?: string | null
          client_phone?: string
          destination?: string
          travel_date?: string | null
          return_date?: string | null
          adults?: number
          children?: number
          infants?: number
          status?: string
          assigned_to?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      passengers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string
          passport_number: string | null
          passport_expiry: string | null
          date_of_birth: string | null
          nationality: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email?: string | null
          phone: string
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          type: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          balance: number
          rating: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          balance?: number
          rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          balance?: number
          rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          query_id: string | null
          passenger_id: string | null
          amount: number
          paid_amount: number
          status: 'pending' | 'partial' | 'paid'
          due_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number?: string
          query_id?: string | null
          passenger_id?: string | null
          amount: number
          paid_amount?: number
          status?: 'pending' | 'partial' | 'paid'
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          query_id?: string | null
          passenger_id?: string | null
          amount?: number
          paid_amount?: number
          status?: 'pending' | 'partial' | 'paid'
          due_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string | null
          vendor_id: string | null
          amount: number
          payment_method: string
          transaction_id: string | null
          payment_date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          vendor_id?: string | null
          amount: number
          payment_method: string
          transaction_id?: string | null
          payment_date?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string | null
          vendor_id?: string | null
          amount?: number
          payment_method?: string
          transaction_id?: string | null
          payment_date?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
