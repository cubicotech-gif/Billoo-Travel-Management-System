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
          cost_price: number
          selling_price: number
          profit: number
          profit_margin: number
          query_source: string | null
          service_type: string | null
          tentative_plan: string | null
          internal_reminders: string | null
          is_responded: boolean
          response_given: string | null
          is_tentative_dates: boolean
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
          cost_price?: number
          selling_price?: number
          query_source?: string | null
          service_type?: string | null
          tentative_plan?: string | null
          internal_reminders?: string | null
          is_responded?: boolean
          response_given?: string | null
          is_tentative_dates?: boolean
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
          cost_price?: number
          selling_price?: number
          query_source?: string | null
          service_type?: string | null
          tentative_plan?: string | null
          internal_reminders?: string | null
          is_responded?: boolean
          response_given?: string | null
          is_tentative_dates?: boolean
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
          cnic: string | null
          passport_number: string | null
          passport_expiry: string | null
          date_of_birth: string | null
          nationality: string | null
          whatsapp_number: string | null
          alternate_phone: string | null
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
          cnic?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          whatsapp_number?: string | null
          alternate_phone?: string | null
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
          cnic?: string | null
          passport_number?: string | null
          passport_expiry?: string | null
          date_of_birth?: string | null
          nationality?: string | null
          whatsapp_number?: string | null
          alternate_phone?: string | null
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
          is_active: boolean
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
          is_active?: boolean
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
          is_active?: boolean
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
      query_services: {
        Row: {
          id: string
          query_id: string
          service_type: 'Hotel' | 'Flight' | 'Transport' | 'Visa' | 'Insurance' | 'Tours' | 'Other'
          vendor_id: string | null
          vendor_name: string | null
          service_description: string
          city: string | null
          service_date: string | null
          purchase_price: number
          selling_price: number
          profit: number
          profit_margin: number
          booking_reference: string | null
          status: 'Draft' | 'Quoted' | 'Booked' | 'Confirmed' | 'Cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_id: string
          service_type: 'Hotel' | 'Flight' | 'Transport' | 'Visa' | 'Insurance' | 'Tours' | 'Other'
          vendor_id?: string | null
          vendor_name?: string | null
          service_description: string
          city?: string | null
          service_date?: string | null
          purchase_price?: number
          selling_price?: number
          booking_reference?: string | null
          status?: 'Draft' | 'Quoted' | 'Booked' | 'Confirmed' | 'Cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_id?: string
          service_type?: 'Hotel' | 'Flight' | 'Transport' | 'Visa' | 'Insurance' | 'Tours' | 'Other'
          vendor_id?: string | null
          vendor_name?: string | null
          service_description?: string
          city?: string | null
          service_date?: string | null
          purchase_price?: number
          selling_price?: number
          booking_reference?: string | null
          status?: 'Draft' | 'Quoted' | 'Booked' | 'Confirmed' | 'Cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string | null
          entity_type: 'query' | 'passenger' | 'vendor' | 'invoice' | 'payment' | 'document'
          entity_id: string
          action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'email_sent' | 'payment_received'
          description: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          entity_type: 'query' | 'passenger' | 'vendor' | 'invoice' | 'payment' | 'document'
          entity_id: string
          action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'email_sent' | 'payment_received'
          description: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          entity_type?: 'query' | 'passenger' | 'vendor' | 'invoice' | 'payment' | 'document'
          entity_id?: string
          action?: 'created' | 'updated' | 'deleted' | 'status_changed' | 'email_sent' | 'payment_received'
          description?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          entity_type: 'query' | 'passenger' | 'vendor' | 'invoice'
          entity_id: string
          document_type: 'passport' | 'visa' | 'ticket' | 'voucher' | 'invoice' | 'receipt' | 'other'
          file_name: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          expiry_date: string | null
          uploaded_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: 'query' | 'passenger' | 'vendor' | 'invoice'
          entity_id: string
          document_type: 'passport' | 'visa' | 'ticket' | 'voucher' | 'invoice' | 'receipt' | 'other'
          file_name: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          expiry_date?: string | null
          uploaded_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'query' | 'passenger' | 'vendor' | 'invoice'
          entity_id?: string
          document_type?: 'passport' | 'visa' | 'ticket' | 'voucher' | 'invoice' | 'receipt' | 'other'
          file_name?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          expiry_date?: string | null
          uploaded_by?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          entity_type: 'query' | 'passenger' | 'invoice' | 'payment' | 'document'
          entity_id: string
          reminder_type: 'follow_up' | 'payment_due' | 'document_expiry' | 'travel_date' | 'custom'
          title: string
          description: string | null
          due_date: string
          is_completed: boolean
          completed_at: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: 'query' | 'passenger' | 'invoice' | 'payment' | 'document'
          entity_id: string
          reminder_type: 'follow_up' | 'payment_due' | 'document_expiry' | 'travel_date' | 'custom'
          title: string
          description?: string | null
          due_date: string
          is_completed?: boolean
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: 'query' | 'passenger' | 'invoice' | 'payment' | 'document'
          entity_id?: string
          reminder_type?: 'follow_up' | 'payment_due' | 'document_expiry' | 'travel_date' | 'custom'
          title?: string
          description?: string | null
          due_date?: string
          is_completed?: boolean
          completed_at?: string | null
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          name: string
          subject: string
          body: string
          category: 'query' | 'booking' | 'payment' | 'reminder' | 'general' | null
          variables: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          body: string
          category?: 'query' | 'booking' | 'payment' | 'reminder' | 'general' | null
          variables?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body?: string
          category?: 'query' | 'booking' | 'payment' | 'reminder' | 'general' | null
          variables?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      communications: {
        Row: {
          id: string
          entity_type: 'query' | 'passenger'
          entity_id: string
          communication_type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note'
          direction: 'inbound' | 'outbound'
          subject: string | null
          body: string | null
          from_contact: string | null
          to_contact: string | null
          status: 'draft' | 'sent' | 'delivered' | 'failed'
          sent_by: string | null
          sent_at: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: 'query' | 'passenger'
          entity_id: string
          communication_type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note'
          direction: 'inbound' | 'outbound'
          subject?: string | null
          body?: string | null
          from_contact?: string | null
          to_contact?: string | null
          status?: 'draft' | 'sent' | 'delivered' | 'failed'
          sent_by?: string | null
          sent_at?: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'query' | 'passenger'
          entity_id?: string
          communication_type?: 'email' | 'sms' | 'whatsapp' | 'call' | 'note'
          direction?: 'inbound' | 'outbound'
          subject?: string | null
          body?: string | null
          from_contact?: string | null
          to_contact?: string | null
          status?: 'draft' | 'sent' | 'delivered' | 'failed'
          sent_by?: string | null
          sent_at?: string
          metadata?: Json | null
          created_at?: string
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
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          user_id: string
          theme: 'light' | 'dark' | 'auto'
          notifications_enabled: boolean
          email_notifications: boolean
          sms_notifications: boolean
          language: string
          timezone: string
          currency: string
          date_format: string
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          theme?: 'light' | 'dark' | 'auto'
          notifications_enabled?: boolean
          email_notifications?: boolean
          sms_notifications?: boolean
          language?: string
          timezone?: string
          currency?: string
          date_format?: string
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          theme?: 'light' | 'dark' | 'auto'
          notifications_enabled?: boolean
          email_notifications?: boolean
          sms_notifications?: boolean
          language?: string
          timezone?: string
          currency?: string
          date_format?: string
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      query_passengers: {
        Row: {
          id: string
          query_id: string
          passenger_id: string
          is_primary: boolean
          passenger_type: 'adult' | 'child' | 'infant'
          seat_preference: string | null
          meal_preference: string | null
          special_requirements: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_id: string
          passenger_id: string
          is_primary?: boolean
          passenger_type?: 'adult' | 'child' | 'infant'
          seat_preference?: string | null
          meal_preference?: string | null
          special_requirements?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_id?: string
          passenger_id?: string
          is_primary?: boolean
          passenger_type?: 'adult' | 'child' | 'infant'
          seat_preference?: string | null
          meal_preference?: string | null
          special_requirements?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
