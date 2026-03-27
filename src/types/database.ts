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
          whatsapp: string | null
          cnic: string | null
          gender: 'male' | 'female' | null
          city: string | null
          address: string | null
          country: string | null
          passport_number: string | null
          passport_expiry: string | null
          date_of_birth: string | null
          nationality: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          referred_by: string | null
          tags: string[]
          status: 'active' | 'inactive'
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
          whatsapp?: string | null
          cnic?: string | null
          gender?: 'male' | 'female' | null
          city?: string | null
          address?: string | null
          country?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          referred_by?: string | null
          tags?: string[]
          status?: 'active' | 'inactive'
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
          whatsapp?: string | null
          cnic?: string | null
          gender?: 'male' | 'female' | null
          city?: string | null
          address?: string | null
          country?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          referred_by?: string | null
          tags?: string[]
          status?: 'active' | 'inactive'
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
          proposal_sent_date: string | null
          finalized_date: string | null
          current_proposal_version: number | null
          advance_payment_amount: number | null
          advance_payment_date: string | null
          package_days: number | null
          city_order: 'makkah_first' | 'madinah_first' | null
          makkah_nights: number | null
          madinah_nights: number | null
          hotel_preferences: string | null
          budget_amount: number | null
          budget_type: 'total' | 'per_person' | null
          service_category: 'umrah' | 'hajj' | 'leisure' | 'visa_only' | 'flight_only' | 'other' | null
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
          proposal_sent_date?: string | null
          finalized_date?: string | null
          current_proposal_version?: number | null
          advance_payment_amount?: number | null
          advance_payment_date?: string | null
          package_days?: number | null
          city_order?: 'makkah_first' | 'madinah_first' | null
          makkah_nights?: number | null
          madinah_nights?: number | null
          hotel_preferences?: string | null
          budget_amount?: number | null
          budget_type?: 'total' | 'per_person' | null
          service_category?: 'umrah' | 'hajj' | 'leisure' | 'visa_only' | 'flight_only' | 'other' | null
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
          proposal_sent_date?: string | null
          finalized_date?: string | null
          current_proposal_version?: number | null
          advance_payment_amount?: number | null
          advance_payment_date?: string | null
          package_days?: number | null
          city_order?: 'makkah_first' | 'madinah_first' | null
          makkah_nights?: number | null
          madinah_nights?: number | null
          hotel_preferences?: string | null
          budget_amount?: number | null
          budget_type?: 'total' | 'per_person' | null
          service_category?: 'umrah' | 'hajj' | 'leisure' | 'visa_only' | 'flight_only' | 'other' | null
          created_at?: string
          updated_at?: string
        }
      }
      query_proposals: {
        Row: {
          id: string
          query_id: string
          version_number: number
          proposal_text: string
          services_snapshot: Json
          total_amount: number
          cost_amount: number | null
          profit_amount: number | null
          profit_percentage: number | null
          sent_date: string
          sent_via: string[]
          validity_days: number
          valid_until: string | null
          status: 'sent' | 'accepted' | 'rejected' | 'revised' | 'expired'
          customer_response: string | null
          customer_feedback: string | null
          response_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_id: string
          version_number: number
          proposal_text: string
          services_snapshot: Json
          total_amount: number
          cost_amount?: number | null
          profit_amount?: number | null
          profit_percentage?: number | null
          sent_date?: string
          sent_via?: string[]
          validity_days?: number
          valid_until?: string | null
          status?: 'sent' | 'accepted' | 'rejected' | 'revised' | 'expired'
          customer_response?: string | null
          customer_feedback?: string | null
          response_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_id?: string
          version_number?: number
          proposal_text?: string
          services_snapshot?: Json
          total_amount?: number
          cost_amount?: number | null
          profit_amount?: number | null
          profit_percentage?: number | null
          sent_date?: string
          sent_via?: string[]
          validity_days?: number
          valid_until?: string | null
          status?: 'sent' | 'accepted' | 'rejected' | 'revised' | 'expired'
          customer_response?: string | null
          customer_feedback?: string | null
          response_date?: string | null
          created_by?: string | null
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
          service_types: string[]
          location: string | null
          country: string | null
          tags: string[]
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
          service_types?: string[]
          location?: string | null
          country?: string | null
          tags?: string[]
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
          service_types?: string[]
          location?: string | null
          country?: string | null
          tags?: string[]
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
      invoices: {
        Row: {
          id: string
          invoice_number: string
          query_id: string | null
          passenger_id: string | null
          amount: number
          paid_amount: number
          total_cost: number
          total_profit: number
          currency: string
          status: 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          due_date: string | null
          source: 'manual' | 'auto'
          source_reference_id: string | null
          source_reference_type: string | null
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
          total_cost?: number
          total_profit?: number
          currency?: string
          status?: 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string | null
          source?: 'manual' | 'auto'
          source_reference_id?: string | null
          source_reference_type?: string | null
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
          total_cost?: number
          total_profit?: number
          currency?: string
          status?: 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string | null
          source?: 'manual' | 'auto'
          source_reference_id?: string | null
          source_reference_type?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          service_id: string | null
          description: string
          quantity: number
          unit_price: number
          tax_percentage: number
          total: number
          service_type: string | null
          vendor_id: string | null
          purchase_price: number
          selling_price: number
          profit: number
          vendor_payment_status: 'unpaid' | 'partially_paid' | 'paid'
          vendor_amount_paid: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          service_id?: string | null
          description: string
          quantity?: number
          unit_price: number
          tax_percentage?: number
          service_type?: string | null
          vendor_id?: string | null
          purchase_price?: number
          selling_price?: number
          profit?: number
          vendor_payment_status?: 'unpaid' | 'partially_paid' | 'paid'
          vendor_amount_paid?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          service_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          tax_percentage?: number
          service_type?: string | null
          vendor_id?: string | null
          purchase_price?: number
          selling_price?: number
          profit?: number
          vendor_payment_status?: 'unpaid' | 'partially_paid' | 'paid'
          vendor_amount_paid?: number
          notes?: string | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          transaction_number: string
          transaction_date: string
          type: 'payment_received' | 'payment_to_vendor' | 'refund_to_client' | 'refund_from_vendor' | 'expense' | 'adjustment'
          direction: 'in' | 'out'
          amount: number
          currency: string
          payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other' | null
          reference_number: string | null
          passenger_id: string | null
          vendor_id: string | null
          invoice_id: string | null
          source: 'manual' | 'auto'
          source_reference_id: string | null
          source_reference_type: string | null
          description: string | null
          receipt_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_number?: string
          transaction_date?: string
          type: 'payment_received' | 'payment_to_vendor' | 'refund_to_client' | 'refund_from_vendor' | 'expense' | 'adjustment'
          direction: 'in' | 'out'
          amount: number
          currency?: string
          payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other' | null
          reference_number?: string | null
          passenger_id?: string | null
          vendor_id?: string | null
          invoice_id?: string | null
          source?: 'manual' | 'auto'
          source_reference_id?: string | null
          source_reference_type?: string | null
          description?: string | null
          receipt_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_number?: string
          transaction_date?: string
          type?: 'payment_received' | 'payment_to_vendor' | 'refund_to_client' | 'refund_from_vendor' | 'expense' | 'adjustment'
          direction?: 'in' | 'out'
          amount?: number
          currency?: string
          payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other' | null
          reference_number?: string | null
          passenger_id?: string | null
          vendor_id?: string | null
          invoice_id?: string | null
          source?: 'manual' | 'auto'
          source_reference_id?: string | null
          source_reference_type?: string | null
          description?: string | null
          receipt_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
  }
}
