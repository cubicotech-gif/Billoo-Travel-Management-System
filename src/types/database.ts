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
          whatsapp_number: string | null
          address: string | null
          balance: number
          rating: number | null
          notes: string | null
          bank_name: string | null
          account_number: string | null
          swift_code: string | null
          iban: string | null
          ifsc_code: string | null
          pan_number: string | null
          gst_number: string | null
          credit_days: number
          payment_method_preference: string | null
          credit_limit: number
          payment_terms: number
          is_active: boolean
          is_deleted: boolean
          total_business: number
          total_paid: number
          total_pending: number
          total_profit: number
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
          whatsapp_number?: string | null
          address?: string | null
          balance?: number
          rating?: number | null
          notes?: string | null
          bank_name?: string | null
          account_number?: string | null
          swift_code?: string | null
          iban?: string | null
          ifsc_code?: string | null
          pan_number?: string | null
          gst_number?: string | null
          credit_days?: number
          payment_method_preference?: string | null
          credit_limit?: number
          payment_terms?: number
          is_active?: boolean
          is_deleted?: boolean
          total_business?: number
          total_paid?: number
          total_pending?: number
          total_profit?: number
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
          whatsapp_number?: string | null
          address?: string | null
          balance?: number
          rating?: number | null
          notes?: string | null
          bank_name?: string | null
          account_number?: string | null
          swift_code?: string | null
          iban?: string | null
          ifsc_code?: string | null
          pan_number?: string | null
          gst_number?: string | null
          credit_days?: number
          payment_method_preference?: string | null
          credit_limit?: number
          payment_terms?: number
          is_active?: boolean
          is_deleted?: boolean
          total_business?: number
          total_paid?: number
          total_pending?: number
          total_profit?: number
          created_at?: string
          updated_at?: string
        }
      }
      vendor_transactions: {
        Row: {
          id: string
          vendor_id: string
          query_id: string
          service_id: string
          passenger_id: string | null
          transaction_date: string
          service_description: string
          service_type: string
          city: string | null
          currency: string
          exchange_rate_to_pkr: number
          purchase_amount_original: number
          purchase_amount_pkr: number
          selling_amount_original: number
          selling_amount_pkr: number
          profit_pkr: number
          payment_status: string
          amount_paid: number
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_notes: string | null
          receipt_url: string | null
          booking_reference: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          query_id: string
          service_id: string
          passenger_id?: string | null
          transaction_date?: string
          service_description: string
          service_type: string
          city?: string | null
          currency?: string
          exchange_rate_to_pkr?: number
          purchase_amount_original: number
          purchase_amount_pkr: number
          selling_amount_original: number
          selling_amount_pkr: number
          payment_status?: string
          amount_paid?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_notes?: string | null
          receipt_url?: string | null
          booking_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          query_id?: string
          service_id?: string
          passenger_id?: string | null
          transaction_date?: string
          service_description?: string
          service_type?: string
          city?: string | null
          currency?: string
          exchange_rate_to_pkr?: number
          purchase_amount_original?: number
          purchase_amount_pkr?: number
          selling_amount_original?: number
          selling_amount_pkr?: number
          payment_status?: string
          amount_paid?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_notes?: string | null
          receipt_url?: string | null
          booking_reference?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
