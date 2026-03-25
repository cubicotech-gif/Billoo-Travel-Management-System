-- =====================================================
-- Billoo Travel Management System - Complete Database Schema
-- =====================================================
-- This is the single authoritative schema for the entire system.
-- Safe to run multiple times (idempotent).
-- Includes all tables, indexes, triggers, RLS policies, and functions.
-- Last updated: 2026-03-25
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CORE TABLES
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

-- Queries table (10-stage workflow)
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
  status TEXT DEFAULT 'New Query - Not Responded' CHECK (status IN (
    'New Query - Not Responded',
    'Responded - Awaiting Reply',
    'Working on Proposal',
    'Proposal Sent',
    'Revisions Requested',
    'Finalized & Booking',
    'Services Booked',
    'In Delivery',
    'Completed',
    'Cancelled'
  )),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,

  -- Pricing
  cost_price DECIMAL(10, 2) DEFAULT 0,
  selling_price DECIMAL(10, 2) DEFAULT 0,
  profit DECIMAL(10, 2) GENERATED ALWAYS AS (selling_price - cost_price) STORED,
  profit_margin DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price * 100) ELSE 0 END
  ) STORED,

  -- Proposal tracking
  proposal_sent_date TIMESTAMPTZ,
  finalized_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  current_proposal_version INTEGER,
  advance_payment_amount DECIMAL(12, 2),
  advance_payment_date TIMESTAMPTZ,
  customer_feedback TEXT,
  stage_notes JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Passengers table
CREATE TABLE IF NOT EXISTS public.passengers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  cnic TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  city TEXT,
  address TEXT,
  country TEXT DEFAULT 'Pakistan',
  passport_number TEXT,
  passport_expiry DATE,
  date_of_birth DATE,
  nationality TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  referred_by TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
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
  whatsapp_number TEXT,
  address TEXT,
  balance DECIMAL(10, 2) DEFAULT 0,
  rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,

  -- Banking details
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  swift_code TEXT,
  iban TEXT,
  pan_number TEXT,
  gst_number TEXT,

  -- Credit & payment terms
  credit_limit DECIMAL(10, 2) DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  payment_method_preference TEXT,

  -- Accounting totals (auto-updated via trigger)
  total_business DECIMAL(12, 2) DEFAULT 0,
  total_paid DECIMAL(12, 2) DEFAULT 0,
  total_pending DECIMAL(12, 2) DEFAULT 0,
  total_profit DECIMAL(12, 2) DEFAULT 0,

  -- Multi-type support & location
  service_types TEXT[] DEFAULT '{}',
  location TEXT,
  country TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor indexes
CREATE INDEX IF NOT EXISTS idx_vendors_service_types ON public.vendors USING GIN (service_types);
CREATE INDEX IF NOT EXISTS idx_vendors_tags ON public.vendors USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors (is_active);

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
-- 2. QUERY SERVICE & WORKFLOW TABLES
-- =====================================================

-- Query Services table (detailed service breakdown per query)
CREATE TABLE IF NOT EXISTS public.query_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('Flight', 'Hotel', 'Visa', 'Transport', 'Tour', 'Insurance', 'Other')),
  service_description TEXT NOT NULL,
  vendor TEXT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),

  -- Pricing
  cost_price DECIMAL(10, 2) DEFAULT 0 CHECK (cost_price >= 0),
  selling_price DECIMAL(10, 2) DEFAULT 0 CHECK (selling_price >= 0),

  -- Booking details
  pnr TEXT,
  booking_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN ('pending', 'payment_sent', 'confirmed', 'cancelled')),
  booked_date DATE,
  booking_confirmation TEXT,
  voucher_url TEXT,
  booking_notes TEXT,
  payment_skipped BOOLEAN DEFAULT FALSE,
  skip_payment_reason TEXT,

  -- Delivery tracking
  delivery_status TEXT DEFAULT 'not_started' CHECK (delivery_status IN ('not_started', 'in_progress', 'delivered', 'issue')),

  -- Service-type-specific details (JSON)
  service_details JSONB DEFAULT '{}'::jsonb,
  service_date DATE,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN public.query_services.service_details IS 'Service-specific details stored as JSON. Hotel: {check_in, check_out, hotel_name, room_type, rooms, meal_plan, star_rating}. Flight: {departure_date, return_date, airline, flight_number, class, from_city, to_city, baggage}. Transport: {pickup_datetime, dropoff_datetime, pickup_location, dropoff_location, vehicle_type}. Visa: {visa_type, nationality, processing_time, validity}';

-- Query Proposals table (tracks all proposal versions)
CREATE TABLE IF NOT EXISTS public.query_proposals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  proposal_text TEXT NOT NULL,
  services_snapshot JSONB NOT NULL,

  -- Pricing
  total_amount DECIMAL(12, 2) NOT NULL,
  cost_amount DECIMAL(12, 2),
  profit_amount DECIMAL(12, 2),
  profit_percentage DECIMAL(5, 2),

  -- Delivery
  sent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_via TEXT[] DEFAULT '{}',
  validity_days INTEGER DEFAULT 7,
  valid_until DATE,

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'revised', 'expired')),

  -- Customer response
  customer_response TEXT,
  customer_feedback TEXT,
  response_date TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(query_id, version_number)
);

COMMENT ON TABLE public.query_proposals IS 'Tracks all proposal versions sent to customers with complete history';

-- Query-Passenger junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.query_passengers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  passenger_type VARCHAR(20) DEFAULT 'adult' CHECK (passenger_type IN ('adult', 'child', 'infant')),
  seat_preference VARCHAR(50),
  meal_preference VARCHAR(50),
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query_id, passenger_id)
);

COMMENT ON TABLE public.query_passengers IS 'Junction table linking queries to passengers with booking preferences';

-- Vendor Transactions table (financial tracking)
CREATE TABLE IF NOT EXISTS public.vendor_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.query_services(id) ON DELETE RESTRICT,
  passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,

  -- Transaction details
  transaction_type TEXT DEFAULT 'SERVICE_BOOKING' CHECK (transaction_type IN ('SERVICE_BOOKING', 'PAYMENT', 'REFUND', 'ADJUSTMENT')),
  transaction_date DATE DEFAULT CURRENT_DATE NOT NULL,
  service_description TEXT NOT NULL,
  service_type TEXT NOT NULL,
  city TEXT,

  -- Currency & amounts
  currency TEXT DEFAULT 'PKR' NOT NULL CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP')),
  exchange_rate_to_pkr DECIMAL(10, 4) DEFAULT 1.0 NOT NULL,
  purchase_amount_original DECIMAL(12, 2) NOT NULL CHECK (purchase_amount_original >= 0),
  purchase_amount_pkr DECIMAL(12, 2) NOT NULL CHECK (purchase_amount_pkr >= 0),
  selling_amount_original DECIMAL(12, 2) NOT NULL CHECK (selling_amount_original >= 0),
  selling_amount_pkr DECIMAL(12, 2) NOT NULL CHECK (selling_amount_pkr >= 0),
  profit_pkr DECIMAL(12, 2) GENERATED ALWAYS AS (selling_amount_pkr - purchase_amount_pkr) STORED,

  -- Payment tracking
  payment_status TEXT DEFAULT 'PENDING' NOT NULL CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'OVERPAID', 'REFUNDED')),
  amount_paid DECIMAL(12, 2) DEFAULT 0 CHECK (amount_paid >= 0),
  payment_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  payment_notes TEXT,
  receipt_url TEXT,

  -- Other
  booking_reference TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. SUPPORTING TABLES
-- =====================================================

-- Activity Log table (audit trail)
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

-- Documents table (file attachments)
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

COMMENT ON TABLE public.documents IS 'File metadata. Files stored in Supabase Storage "documents" bucket: entity_type/entity_id/timestamp.extension';

-- Reminders table
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

-- Invoice Items table
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

-- User Preferences table
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
-- 4. INDEXES
-- =====================================================

-- Queries
CREATE INDEX IF NOT EXISTS idx_queries_status ON public.queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_assigned_to ON public.queries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON public.queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_proposal_sent_date ON public.queries(proposal_sent_date);
CREATE INDEX IF NOT EXISTS idx_queries_completed_date ON public.queries(completed_date);

-- Passengers
CREATE INDEX IF NOT EXISTS idx_passengers_status ON public.passengers(status);
CREATE INDEX IF NOT EXISTS idx_passengers_city ON public.passengers(city);
CREATE INDEX IF NOT EXISTS idx_passengers_tags ON public.passengers USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_passengers_cnic ON public.passengers(cnic);

-- Invoices & Payments
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_query_id ON public.invoices(query_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_id ON public.payments(vendor_id);

-- Query Services
CREATE INDEX IF NOT EXISTS idx_query_services_query_id ON public.query_services(query_id);
CREATE INDEX IF NOT EXISTS idx_query_services_vendor_id ON public.query_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_services_booking_status ON public.query_services(booking_status);
CREATE INDEX IF NOT EXISTS idx_services_delivery_status ON public.query_services(delivery_status);
CREATE INDEX IF NOT EXISTS idx_query_services_details ON public.query_services USING gin(service_details);

-- Query Proposals
CREATE INDEX IF NOT EXISTS idx_proposals_query ON public.query_proposals(query_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.query_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_sent_date ON public.query_proposals(sent_date DESC);

-- Query Passengers
CREATE INDEX IF NOT EXISTS idx_query_passengers_query ON public.query_passengers(query_id);
CREATE INDEX IF NOT EXISTS idx_query_passengers_passenger ON public.query_passengers(passenger_id);

-- Vendor Transactions
CREATE INDEX IF NOT EXISTS idx_vendor_trans_vendor_id ON public.vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_query_id ON public.vendor_transactions(query_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_service_id ON public.vendor_transactions(service_id);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_status ON public.vendor_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_vendor_trans_date ON public.vendor_transactions(transaction_date);

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);

-- Reminders
CREATE INDEX IF NOT EXISTS idx_reminders_user ON public.reminders(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON public.reminders(is_completed, due_date);

-- Communications
CREATE INDEX IF NOT EXISTS idx_communications_entity ON public.communications(entity_type, entity_id);

-- Invoice Items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get next proposal version number for a query
CREATE OR REPLACE FUNCTION get_next_proposal_version(p_query_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.query_proposals
  WHERE query_id = p_query_id;
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Auto-update vendor totals when transactions change
CREATE OR REPLACE FUNCTION update_vendor_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_vendor_id := OLD.vendor_id;
  ELSE
    v_vendor_id := NEW.vendor_id;
  END IF;

  UPDATE public.vendors
  SET
    total_business = COALESCE((
      SELECT SUM(purchase_amount_pkr) FROM public.vendor_transactions WHERE vendor_id = v_vendor_id
    ), 0),
    total_paid = COALESCE((
      SELECT SUM(amount_paid) FROM public.vendor_transactions WHERE vendor_id = v_vendor_id
    ), 0),
    total_pending = COALESCE((
      SELECT SUM(purchase_amount_pkr - amount_paid)
      FROM public.vendor_transactions
      WHERE vendor_id = v_vendor_id AND payment_status != 'PAID'
    ), 0),
    total_profit = COALESCE((
      SELECT SUM(profit_pkr) FROM public.vendor_transactions WHERE vendor_id = v_vendor_id
    ), 0),
    updated_at = NOW()
  WHERE id = v_vendor_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Sync service booking status when vendor payment is made
CREATE OR REPLACE FUNCTION sync_service_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status IN ('PAID', 'PARTIAL') AND (OLD.payment_status IS NULL OR OLD.payment_status NOT IN ('PAID', 'PARTIAL')) THEN
    UPDATE public.query_services
    SET booking_status = 'payment_sent', updated_at = NOW()
    WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: extract readable text from service_details JSON
CREATE OR REPLACE FUNCTION get_service_detail_text(service_details JSONB, service_type TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE service_type
    WHEN 'Hotel' THEN
      RETURN CONCAT(
        COALESCE(service_details->>'hotel_name', ''),
        CASE WHEN service_details->>'room_type' IS NOT NULL THEN ' - ' || service_details->>'room_type' ELSE '' END,
        CASE WHEN service_details->>'meal_plan' IS NOT NULL THEN ' (' || service_details->>'meal_plan' || ')' ELSE '' END
      );
    WHEN 'Flight' THEN
      RETURN CONCAT(
        COALESCE(service_details->>'airline', 'Flight'),
        CASE WHEN service_details->>'from_city' IS NOT NULL THEN ': ' || service_details->>'from_city' ELSE '' END,
        CASE WHEN service_details->>'to_city' IS NOT NULL THEN ' → ' || service_details->>'to_city' ELSE '' END
      );
    WHEN 'Transport' THEN
      RETURN CONCAT(
        COALESCE(service_details->>'vehicle_type', 'Transport'),
        CASE WHEN service_details->>'pickup_location' IS NOT NULL THEN ': ' || service_details->>'pickup_location' ELSE '' END
      );
    ELSE
      RETURN '';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Core table updated_at triggers
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

DROP TRIGGER IF EXISTS update_query_services_updated_at ON public.query_services;
CREATE TRIGGER update_query_services_updated_at BEFORE UPDATE ON public.query_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_query_proposals_updated_at ON public.query_proposals;
CREATE TRIGGER update_query_proposals_updated_at BEFORE UPDATE ON public.query_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_query_passengers_updated_at ON public.query_passengers;
CREATE TRIGGER update_query_passengers_updated_at BEFORE UPDATE ON public.query_passengers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_transactions_updated_at ON public.vendor_transactions;
CREATE TRIGGER update_vendor_transactions_updated_at BEFORE UPDATE ON public.vendor_transactions
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

-- Vendor totals auto-update trigger
DROP TRIGGER IF EXISTS trigger_update_vendor_totals ON public.vendor_transactions;
CREATE TRIGGER trigger_update_vendor_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_transactions
  FOR EACH ROW EXECUTE FUNCTION update_vendor_totals();

-- Sync service booking status when vendor payment changes
DROP TRIGGER IF EXISTS trigger_sync_booking_status ON public.vendor_transactions;
CREATE TRIGGER trigger_sync_booking_status
  AFTER UPDATE OF payment_status ON public.vendor_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_service_booking_status();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Helper macro: authenticated CRUD for most tables
-- Users
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Queries
DROP POLICY IF EXISTS "Authenticated users can manage queries" ON public.queries;
CREATE POLICY "Authenticated users can manage queries" ON public.queries
  FOR ALL USING (auth.role() = 'authenticated');

-- Passengers
DROP POLICY IF EXISTS "Authenticated users can manage passengers" ON public.passengers;
CREATE POLICY "Authenticated users can manage passengers" ON public.passengers
  FOR ALL USING (auth.role() = 'authenticated');

-- Vendors
DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.vendors;
CREATE POLICY "Authenticated users can manage vendors" ON public.vendors
  FOR ALL USING (auth.role() = 'authenticated');

-- Invoices
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
CREATE POLICY "Authenticated users can manage invoices" ON public.invoices
  FOR ALL USING (auth.role() = 'authenticated');

-- Payments
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
CREATE POLICY "Authenticated users can manage payments" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');

-- Query Services
DROP POLICY IF EXISTS "Authenticated users can manage query services" ON public.query_services;
CREATE POLICY "Authenticated users can manage query services" ON public.query_services
  FOR ALL USING (auth.role() = 'authenticated');

-- Query Proposals
DROP POLICY IF EXISTS "Authenticated users can manage proposals" ON public.query_proposals;
CREATE POLICY "Authenticated users can manage proposals" ON public.query_proposals
  FOR ALL USING (auth.role() = 'authenticated');

-- Query Passengers
DROP POLICY IF EXISTS "Authenticated users can manage query passengers" ON public.query_passengers;
CREATE POLICY "Authenticated users can manage query passengers" ON public.query_passengers
  FOR ALL USING (auth.role() = 'authenticated');

-- Vendor Transactions
DROP POLICY IF EXISTS "Authenticated users can manage vendor transactions" ON public.vendor_transactions;
CREATE POLICY "Authenticated users can manage vendor transactions" ON public.vendor_transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- Activities
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
CREATE POLICY "Authenticated users can view activities" ON public.activities
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;
CREATE POLICY "Authenticated users can insert activities" ON public.activities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Documents
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;
CREATE POLICY "Authenticated users can manage documents" ON public.documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Reminders (user-scoped)
DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.reminders;
CREATE POLICY "Users can manage their own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

-- Email Templates
DROP POLICY IF EXISTS "Authenticated users can view email templates" ON public.email_templates;
CREATE POLICY "Authenticated users can view email templates" ON public.email_templates
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admins can manage email templates" ON public.email_templates;
CREATE POLICY "Admins can manage email templates" ON public.email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Communications
DROP POLICY IF EXISTS "Authenticated users can manage communications" ON public.communications;
CREATE POLICY "Authenticated users can manage communications" ON public.communications
  FOR ALL USING (auth.role() = 'authenticated');

-- Invoice Items
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON public.invoice_items;
CREATE POLICY "Authenticated users can manage invoice items" ON public.invoice_items
  FOR ALL USING (auth.role() = 'authenticated');

-- User Preferences (user-scoped)
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 9. VIEWS
-- =====================================================

-- Detailed query passengers view
CREATE OR REPLACE VIEW public.query_passengers_detailed AS
SELECT
  qp.id,
  qp.query_id,
  qp.passenger_id,
  qp.is_primary,
  qp.passenger_type,
  qp.seat_preference,
  qp.meal_preference,
  qp.special_requirements,
  qp.created_at,
  qp.updated_at,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.passport_number,
  p.passport_expiry,
  p.date_of_birth,
  p.nationality,
  q.query_number,
  q.destination,
  q.travel_date,
  q.return_date,
  q.status
FROM public.query_passengers qp
JOIN public.passengers p ON qp.passenger_id = p.id
JOIN public.queries q ON qp.query_id = q.id;

-- =====================================================
-- 10. STORAGE SETUP
-- =====================================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');

-- =====================================================
-- 11. SAMPLE DATA
-- =====================================================

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

Total Amount: {{amount}}

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

Amount Due: {{amount}}

Please make the payment at your earliest convenience.

Best regards,
Billoo Travel',
'payment', '["client_name", "invoice_number", "due_date", "amount"]'::jsonb)

ON CONFLICT (name) DO NOTHING;
