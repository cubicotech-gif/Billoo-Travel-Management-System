-- Billoo Travel Management System - Complete Supabase Schema
-- This is the complete, corrected schema with all enhancements
-- Safe to run multiple times (idempotent)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent', 'finance', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queries table
CREATE TABLE IF NOT EXISTS public.queries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_number TEXT UNIQUE DEFAULT ('QRY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_date DATE,
  return_date DATE,
  adults INTEGER DEFAULT 1 CHECK (adults >= 1),
  children INTEGER DEFAULT 0 CHECK (children >= 0),
  infants INTEGER DEFAULT 0 CHECK (infants >= 0),
  status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Working', 'Quoted', 'Finalized', 'Booking', 'Issued', 'Completed')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add enhanced pricing columns to queries table
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS profit DECIMAL(10, 2) GENERATED ALWAYS AS (selling_price - cost_price) STORED;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5, 2) GENERATED ALWAYS AS (
  CASE WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price * 100) ELSE 0 END
) STORED;

-- Passengers table
CREATE TABLE IF NOT EXISTS public.passengers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth DATE,
  nationality TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Airline', 'Hotel', 'Transport', 'Tour Operator', 'Visa Service', 'Insurance', 'Other')),
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  balance DECIMAL(10, 2) DEFAULT 0,
  rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add enhanced vendor columns
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE DEFAULT ('INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
  query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
  passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  paid_amount DECIMAL(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'Bank Transfer', 'UPI', 'Other')),
  transaction_id TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ENHANCED FEATURE TABLES
-- =====================================================

-- Query Services table (for detailed service breakdown)
CREATE TABLE IF NOT EXISTS public.query_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Flight', 'Hotel', 'Visa', 'Transport', 'Tour', 'Insurance', 'Other')),
  description TEXT NOT NULL,
  vendor TEXT NOT NULL,
  cost_price DECIMAL(10, 2) DEFAULT 0 CHECK (cost_price >= 0),
  selling_price DECIMAL(10, 2) DEFAULT 0 CHECK (selling_price >= 0),
  pnr TEXT,
  booking_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log table (for tracking all actions)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'vendor', 'invoice', 'payment', 'document')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'email_sent', 'payment_received')),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (for file attachments)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'vendor', 'invoice')),
  entity_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'visa', 'ticket', 'voucher', 'invoice', 'receipt', 'other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  expiry_date DATE,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders table (for follow-ups and notifications)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'invoice', 'payment', 'document')),
  entity_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('follow_up', 'payment_due', 'document_expiry', 'travel_date', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT CHECK (category IN ('query', 'booking', 'payment', 'reminder', 'general')),
  variables JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication History table
CREATE TABLE IF NOT EXISTS public.communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger')),
  entity_id UUID NOT NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('email', 'sms', 'whatsapp', 'call', 'note')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  from_contact TEXT,
  to_contact TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Items table (for detailed line items)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.query_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  tax_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (tax_percentage >= 0),
  total DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price * (1 + tax_percentage / 100)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences table (CORRECTED: PRIMARY KEY before REFERENCES)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  currency TEXT DEFAULT 'INR',
  date_format TEXT DEFAULT 'dd/MM/yyyy',
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_queries_status ON public.queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_assigned_to ON public.queries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON public.queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_query_id ON public.invoices(query_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON public.payments(vendor_id);

-- Enhanced table indexes
CREATE INDEX IF NOT EXISTS idx_query_services_query_id ON public.query_services(query_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON public.reminders(is_completed, due_date);
CREATE INDEX IF NOT EXISTS idx_communications_entity ON public.communications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- =====================================================
-- TRIGGER FUNCTION
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS (with DROP IF EXISTS to avoid conflicts)
-- =====================================================

-- Core table triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_queries_updated_at ON public.queries;
CREATE TRIGGER update_queries_updated_at BEFORE UPDATE ON public.queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_passengers_updated_at ON public.passengers;
CREATE TRIGGER update_passengers_updated_at BEFORE UPDATE ON public.passengers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON public.vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced table triggers
DROP TRIGGER IF EXISTS update_query_services_updated_at ON public.query_services;
CREATE TRIGGER update_query_services_updated_at BEFORE UPDATE ON public.query_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (with DROP IF EXISTS to avoid conflicts)
-- =====================================================

-- Users policies
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Queries policies
DROP POLICY IF EXISTS "All authenticated users can view queries" ON public.queries;
CREATE POLICY "All authenticated users can view queries" ON public.queries
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert queries" ON public.queries;
CREATE POLICY "All authenticated users can insert queries" ON public.queries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update queries" ON public.queries;
CREATE POLICY "All authenticated users can update queries" ON public.queries
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete queries" ON public.queries;
CREATE POLICY "All authenticated users can delete queries" ON public.queries
  FOR DELETE USING (auth.role() = 'authenticated');

-- Passengers policies
DROP POLICY IF EXISTS "All authenticated users can view passengers" ON public.passengers;
CREATE POLICY "All authenticated users can view passengers" ON public.passengers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert passengers" ON public.passengers;
CREATE POLICY "All authenticated users can insert passengers" ON public.passengers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update passengers" ON public.passengers;
CREATE POLICY "All authenticated users can update passengers" ON public.passengers
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete passengers" ON public.passengers;
CREATE POLICY "All authenticated users can delete passengers" ON public.passengers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Vendors policies
DROP POLICY IF EXISTS "All authenticated users can view vendors" ON public.vendors;
CREATE POLICY "All authenticated users can view vendors" ON public.vendors
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert vendors" ON public.vendors;
CREATE POLICY "All authenticated users can insert vendors" ON public.vendors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update vendors" ON public.vendors;
CREATE POLICY "All authenticated users can update vendors" ON public.vendors
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete vendors" ON public.vendors;
CREATE POLICY "All authenticated users can delete vendors" ON public.vendors
  FOR DELETE USING (auth.role() = 'authenticated');

-- Invoices policies
DROP POLICY IF EXISTS "All authenticated users can view invoices" ON public.invoices;
CREATE POLICY "All authenticated users can view invoices" ON public.invoices
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert invoices" ON public.invoices;
CREATE POLICY "All authenticated users can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update invoices" ON public.invoices;
CREATE POLICY "All authenticated users can update invoices" ON public.invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete invoices" ON public.invoices;
CREATE POLICY "All authenticated users can delete invoices" ON public.invoices
  FOR DELETE USING (auth.role() = 'authenticated');

-- Payments policies
DROP POLICY IF EXISTS "All authenticated users can view payments" ON public.payments;
CREATE POLICY "All authenticated users can view payments" ON public.payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert payments" ON public.payments;
CREATE POLICY "All authenticated users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update payments" ON public.payments;
CREATE POLICY "All authenticated users can update payments" ON public.payments
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete payments" ON public.payments;
CREATE POLICY "All authenticated users can delete payments" ON public.payments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Query Services policies
DROP POLICY IF EXISTS "All authenticated users can view query services" ON public.query_services;
CREATE POLICY "All authenticated users can view query services" ON public.query_services
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert query services" ON public.query_services;
CREATE POLICY "All authenticated users can insert query services" ON public.query_services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update query services" ON public.query_services;
CREATE POLICY "All authenticated users can update query services" ON public.query_services
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete query services" ON public.query_services;
CREATE POLICY "All authenticated users can delete query services" ON public.query_services
  FOR DELETE USING (auth.role() = 'authenticated');

-- Activities policies
DROP POLICY IF EXISTS "All authenticated users can view activities" ON public.activities;
CREATE POLICY "All authenticated users can view activities" ON public.activities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert activities" ON public.activities;
CREATE POLICY "All authenticated users can insert activities" ON public.activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Documents policies
DROP POLICY IF EXISTS "All authenticated users can view documents" ON public.documents;
CREATE POLICY "All authenticated users can view documents" ON public.documents
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert documents" ON public.documents;
CREATE POLICY "All authenticated users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update documents" ON public.documents;
CREATE POLICY "All authenticated users can update documents" ON public.documents
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete documents" ON public.documents;
CREATE POLICY "All authenticated users can delete documents" ON public.documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- Reminders policies
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.reminders;
CREATE POLICY "Users can view their own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reminders" ON public.reminders;
CREATE POLICY "Users can insert their own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reminders" ON public.reminders;
CREATE POLICY "Users can update their own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.reminders;
CREATE POLICY "Users can delete their own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

-- Email Templates policies
DROP POLICY IF EXISTS "All authenticated users can view email templates" ON public.email_templates;
CREATE POLICY "All authenticated users can view email templates" ON public.email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Communications policies
DROP POLICY IF EXISTS "All authenticated users can view communications" ON public.communications;
CREATE POLICY "All authenticated users can view communications" ON public.communications
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert communications" ON public.communications;
CREATE POLICY "All authenticated users can insert communications" ON public.communications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update communications" ON public.communications;
CREATE POLICY "All authenticated users can update communications" ON public.communications
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Invoice Items policies
DROP POLICY IF EXISTS "All authenticated users can view invoice items" ON public.invoice_items;
CREATE POLICY "All authenticated users can view invoice items" ON public.invoice_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can insert invoice items" ON public.invoice_items;
CREATE POLICY "All authenticated users can insert invoice items" ON public.invoice_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can update invoice items" ON public.invoice_items;
CREATE POLICY "All authenticated users can update invoice items" ON public.invoice_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can delete invoice items" ON public.invoice_items;
CREATE POLICY "All authenticated users can delete invoice items" ON public.invoice_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- User Preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- SAMPLE DATA (Email Templates)
-- =====================================================

-- Insert sample email templates
INSERT INTO public.email_templates (name, subject, body, category, variables) VALUES
('query_confirmation', 'Query Received - {{query_number}}',
'Dear {{client_name}},

Thank you for your inquiry regarding {{destination}}.

Your query number is: {{query_number}}

We will get back to you shortly with the best options.

Best regards,
Billoo Travel',
'query', '["client_name", "destination", "query_number"]'::jsonb),

('quotation', 'Quotation for your trip to {{destination}}',
'Dear {{client_name}},

Please find below the quotation for your trip to {{destination}}:

Total Amount: ₹{{amount}}

This quotation is valid for 7 days.

Best regards,
Billoo Travel',
'query', '["client_name", "destination", "amount"]'::jsonb),

('booking_confirmation', 'Booking Confirmed - {{query_number}}',
'Dear {{client_name}},

Your booking has been confirmed!

Booking Reference: {{query_number}}
Destination: {{destination}}
Travel Date: {{travel_date}}

We will send you the tickets and vouchers shortly.

Best regards,
Billoo Travel',
'booking', '["client_name", "query_number", "destination", "travel_date"]'::jsonb),

('payment_reminder', 'Payment Reminder - {{invoice_number}}',
'Dear {{client_name}},

This is a friendly reminder that payment for invoice {{invoice_number}} is due on {{due_date}}.

Amount Due: ₹{{amount}}

Please make the payment at your earliest convenience.

Best regards,
Billoo Travel',
'payment', '["client_name", "invoice_number", "due_date", "amount"]'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Schema created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Core Tables: users, queries, passengers, vendors, invoices, payments';
  RAISE NOTICE '🚀 Enhanced Tables: query_services, activities, documents, reminders, email_templates, communications, invoice_items, user_preferences';
  RAISE NOTICE '🔒 Row Level Security (RLS) enabled on all tables';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '📧 Sample email templates inserted';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✨ Your Billoo Travel Management System database is ready!';
  RAISE NOTICE '========================================';
END $$;
