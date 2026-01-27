// Updated database types with all new fields
// Replace your existing database.ts file with this

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
      passengers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string
          whatsapp_number: string | null
          alternate_phone: string | null
          cnic: string | null
          passport_number: string | null
          passport_expiry: string | null
          date_of_birth: string | null
          nationality: string | null
          address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          is_vip: boolean
          is_active: boolean
          total_trips: number
          total_revenue: number
          outstanding_balance: number
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
          whatsapp_number?: string | null
          alternate_phone?: string | null
          cnic?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          is_vip?: boolean
          is_active?: boolean
          total_trips?: number
          total_revenue?: number
          outstanding_balance?: number
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
          whatsapp_number?: string | null
          alternate_phone?: string | null
          cnic?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          is_vip?: boolean
          is_active?: boolean
          total_trips?: number
          total_revenue?: number
          outstanding_balance?: number
          notes?: string | null
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
          query_source: 'Phone Call' | 'WhatsApp' | 'Walk-in' | 'Website' | 'Email' | 'Referral' | null
          service_type: 'Umrah Package' | 'Umrah Plus Package' | 'Hajj Package' | 'Leisure Tourism' | 'Ticket Booking' | 'Visa Service' | 'Transport Service' | 'Hotel Only' | 'Other' | null
          destination: string
          travel_date: string | null
          return_date: string | null
          is_tentative_dates: boolean
          adults: number
          children: number
          infants: number
          tentative_plan: string | null
          internal_reminders: string | null
          is_responded: boolean
          response_given: string | null
          status: string
          priority_level: 'urgent' | 'high' | 'normal' | 'low'
          follow_up_date: string | null
          assigned_to: string | null
          notes: string | null
          cost_price: number
          selling_price: number
          profit: number
          profit_margin: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_number?: string
          client_name: string
          client_email?: string | null
          client_phone: string
          query_source?: 'Phone Call' | 'WhatsApp' | 'Walk-in' | 'Website' | 'Email' | 'Referral' | null
          service_type?: 'Umrah Package' | 'Umrah Plus Package' | 'Hajj Package' | 'Leisure Tourism' | 'Ticket Booking' | 'Visa Service' | 'Transport Service' | 'Hotel Only' | 'Other' | null
          destination: string
          travel_date?: string | null
          return_date?: string | null
          is_tentative_dates?: boolean
          adults?: number
          children?: number
          infants?: number
          tentative_plan?: string | null
          internal_reminders?: string | null
          is_responded?: boolean
          response_given?: string | null
          status?: string
          priority_level?: 'urgent' | 'high' | 'normal' | 'low'
          follow_up_date?: string | null
          assigned_to?: string | null
          notes?: string | null
          cost_price?: number
          selling_price?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_number?: string
          client_name?: string
          client_email?: string | null
          client_phone?: string
          query_source?: 'Phone Call' | 'WhatsApp' | 'Walk-in' | 'Website' | 'Email' | 'Referral' | null
          service_type?: 'Umrah Package' | 'Umrah Plus Package' | 'Hajj Package' | 'Leisure Tourism' | 'Ticket Booking' | 'Visa Service' | 'Transport Service' | 'Hotel Only' | 'Other' | null
          destination?: string
          travel_date?: string | null
          return_date?: string | null
          is_tentative_dates?: boolean
          adults?: number
          children?: number
          infants?: number
          tentative_plan?: string | null
          internal_reminders?: string | null
          is_responded?: boolean
          response_given?: string | null
          status?: string
          priority_level?: 'urgent' | 'high' | 'normal' | 'low'
          follow_up_date?: string | null
          assigned_to?: string | null
          notes?: string | null
          cost_price?: number
          selling_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Keep other tables as they were
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
          bank_name: string | null
          account_number: string | null
          ifsc_code: string | null
          pan_number: string | null
          gst_number: string | null
          credit_limit: number
          payment_terms: number
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
          bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          pan_number?: string | null
          gst_number?: string | null
          credit_limit?: number
          payment_terms?: number
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
          bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          pan_number?: string | null
          gst_number?: string | null
          credit_limit?: number
          payment_terms?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
