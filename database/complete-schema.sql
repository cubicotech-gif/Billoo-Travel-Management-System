-- =====================================================
-- Billoo Travel Management System - Complete Database Schema
-- =====================================================
-- This is the from-scratch baseline for a BRAND-NEW (empty) database.
-- Includes all tables, indexes, triggers, RLS policies, and functions.
--
-- ⚠️  DO NOT run this on a database that already has data. Some early CHECK
--     constraints here (e.g. queries_package_type_check without 'Umrah Plus',
--     the older status set) predate values your live rows now hold, so they
--     fail with "check constraint ... is violated by some row".
--     To bring an EXISTING database up to date, run database/apply-all.sql
--     instead — it's additive and adds replayed CHECK constraints as NOT VALID.
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
  status TEXT DEFAULT 'New Query' CHECK (status IN (
    'New Query',
    'Working',
    'Quoted',
    'Booking',
    'Cancelled'
  )),
  booking_status TEXT CHECK (booking_status IS NULL OR booking_status IN (
    'Payment Done - Check-in Left',
    'Payment Pending - Check-in Left',
    'Payment Pending - Travel Done',
    'Completed'
  )),
  booking_status_locked BOOLEAN NOT NULL DEFAULT FALSE,
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
  total_cost DECIMAL(12, 2) DEFAULT 0,
  total_profit DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'PKR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'sent', 'pending', 'partial', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  source_reference_id UUID,
  source_reference_type TEXT,
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

-- Transactions table (unified financial ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_number TEXT UNIQUE,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),

  type TEXT NOT NULL CHECK (type IN (
    'payment_received',
    'payment_to_vendor',
    'refund_to_client',
    'refund_from_vendor',
    'expense',
    'adjustment'
  )),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),

  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'PKR' CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'online', 'other')),
  reference_number TEXT,

  passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  source_reference_id UUID,
  source_reference_type TEXT,

  description TEXT,
  receipt_url TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log table (audit trail)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('query', 'passenger', 'vendor', 'invoice', 'payment', 'document', 'transaction')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'email_sent', 'payment_received', 'payment_made', 'invoice_created', 'invoice_paid')),
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
  service_type TEXT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  purchase_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  profit DECIMAL(12, 2) DEFAULT 0,
  vendor_payment_status TEXT DEFAULT 'unpaid' CHECK (vendor_payment_status IN ('unpaid', 'partially_paid', 'paid')),
  vendor_amount_paid DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
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
CREATE INDEX IF NOT EXISTS idx_invoice_items_vendor ON public.invoice_items(vendor_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_passenger ON public.transactions(passenger_id);
CREATE INDEX IF NOT EXISTS idx_transactions_vendor ON public.transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON public.transactions(direction);

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

-- Auto-generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num INTEGER;
BEGIN
  today_str := TO_CHAR(NEW.transaction_date, 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.transactions
  WHERE TO_CHAR(transaction_date, 'YYYYMMDD') = today_str;
  NEW.transaction_number := 'TXN-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update invoice totals when transactions are linked
CREATE OR REPLACE FUNCTION update_invoice_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid DECIMAL(12,2);
  v_invoice_amount DECIMAL(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  IF v_invoice_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.transactions
  WHERE invoice_id = v_invoice_id AND type = 'payment_received';

  SELECT amount INTO v_invoice_amount FROM public.invoices WHERE id = v_invoice_id;

  UPDATE public.invoices
  SET
    paid_amount = v_total_paid,
    status = CASE
      WHEN v_total_paid >= v_invoice_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

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

-- Transaction number auto-generate trigger
DROP TRIGGER IF EXISTS trigger_generate_txn_number ON public.transactions;
CREATE TRIGGER trigger_generate_txn_number
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION generate_transaction_number();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invoice auto-update when transactions change
DROP TRIGGER IF EXISTS trigger_update_invoice_on_transaction ON public.transactions;
CREATE TRIGGER trigger_update_invoice_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_invoice_on_transaction();

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
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
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

-- Transactions
DROP POLICY IF EXISTS "Authenticated users can manage transactions" ON public.transactions;
CREATE POLICY "Authenticated users can manage transactions" ON public.transactions
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
-- =====================================================
-- Daily Rates + Exchange Rate (ROE) — per SPEC.md §5
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql so the
-- anon role gets policies on these new tables (it loops every public table).
--
-- Rates are date-stamped (history kept). Quoting uses the latest rate per item.
-- Hotels/Transfer/Visa are priced in SAR; Airline tickets in PKR. A single
-- daily ROE (SAR->PKR) converts the SAR side for the package total.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_cards (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
	item_type TEXT NOT NULL CHECK (item_type IN ('hotel', 'transfer', 'visa', 'airline')),
	name TEXT NOT NULL,
	city TEXT,                 -- 'Makkah' / 'Madinah' for hotels
	vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),
	cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
	selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
	unit TEXT,                 -- 'per room/night', 'per vehicle', 'per person', 'per adult'
	occupancy INTEGER,         -- hotels: persons per room (drives room count)
	active BOOLEAN NOT NULL DEFAULT TRUE,
	notes TEXT,
	meta JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_cards_type_date ON public.rate_cards (item_type, rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_rate_cards_active ON public.rate_cards (active);

-- One ROE per day (SAR -> PKR).
CREATE TABLE IF NOT EXISTS public.exchange_rates (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	rate_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
	sar_to_pkr NUMERIC(10, 4) NOT NULL CHECK (sar_to_pkr > 0),
	usd_to_pkr NUMERIC(10, 4) CHECK (usd_to_pkr IS NULL OR usd_to_pkr > 0),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at triggers (function defined in complete-schema.sql).
DROP TRIGGER IF EXISTS update_rate_cards_updated_at ON public.rate_cards;
CREATE TRIGGER update_rate_cards_updated_at BEFORE UPDATE ON public.rate_cards
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON public.exchange_rates;
CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- Phase C — Staff, Passenger CRM, rich Query intake (per SPEC.md §4.1, §6)
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the new staff table).
-- =====================================================

-- Staff (for attribution on queries/actions). Editable list.
CREATE TABLE IF NOT EXISTS public.staff (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.staff (name) VALUES ('Roohul'), ('Danish'), ('Maaz')
ON CONFLICT (name) DO NOTHING;

-- Passengers: soft-delete flag (history integrity).
ALTER TABLE public.passengers
	ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Queries: link to passenger + flexible intake fields.
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS created_by_staff TEXT,
	ADD COLUMN IF NOT EXISTS package_type TEXT,
	ADD COLUMN IF NOT EXISTS duration_days INTEGER,
	ADD COLUMN IF NOT EXISTS nights_makkah INTEGER,
	ADD COLUMN IF NOT EXISTS nights_madinah INTEGER,
	ADD COLUMN IF NOT EXISTS hotel_preference TEXT,
	ADD COLUMN IF NOT EXISTS client_preference TEXT,
	ADD COLUMN IF NOT EXISTS customer_plan TEXT,
	ADD COLUMN IF NOT EXISTS quick_note TEXT,
	ADD COLUMN IF NOT EXISTS responded BOOLEAN DEFAULT FALSE,
	ADD COLUMN IF NOT EXISTS response_text TEXT,
	ADD COLUMN IF NOT EXISTS initial_quotation TEXT;

-- package_type is constrained to the three offerings (nullable).
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_package_type_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_package_type_check CHECK (
	package_type IS NULL OR package_type IN ('Umrah', 'Tour', 'Leisure')
);

CREATE INDEX IF NOT EXISTS idx_queries_passenger_id ON public.queries (passenger_id);
CREATE INDEX IF NOT EXISTS idx_passengers_is_deleted ON public.passengers (is_deleted);
-- =====================================================
-- Phase D — Quotations (calculator output), per SPEC.md §4.2
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the two new tables).
--
-- A quotation is a priced package built from the daily rates. Multiple per
-- query, versioned. Hotels/Transfer/Visa priced in SAR; Tickets in PKR; one
-- ROE converts the SAR side. Totals are computed in-app via the money layer
-- and stored here; the line breakdown lives in quotation_lines.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quotations (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	version INTEGER NOT NULL DEFAULT 1,
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),

	-- Snapshot of the inputs that produced the totals.
	roe NUMERIC(10, 4) NOT NULL,
	usd_rate NUMERIC(10, 4) CHECK (usd_rate IS NULL OR usd_rate > 0),
	adults INTEGER NOT NULL DEFAULT 1,
	children INTEGER NOT NULL DEFAULT 0,
	infants INTEGER NOT NULL DEFAULT 0,

	-- Subtotals (SAR side and PKR tickets), then PKR grand totals.
	sar_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	sar_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	tickets_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	tickets_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,

	whatsapp_text TEXT,
	notes TEXT,

	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),

	UNIQUE (query_id, version)
);

CREATE TABLE IF NOT EXISTS public.quotation_lines (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
	line_type TEXT NOT NULL CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket')),
	label TEXT NOT NULL,
	rate_card_id UUID REFERENCES public.rate_cards(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),
	unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	unit_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
	line_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	line_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	meta JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_query ON public.quotations (query_id);
CREATE INDEX IF NOT EXISTS idx_quotation_lines_quotation ON public.quotation_lines (quotation_id);

DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ===== Re-applied: 4-stage normalization (idempotent, fixes legacy statuses) =====
-- =====================================================
-- Pipeline -> 4 stages (per SPEC.md) + Booking payment/check-in status
-- =====================================================
-- Run once in the Supabase SQL editor. Robust to any prior stage values
-- (original 10-stage, the interim 5-stage, or already 4-stage).
--
-- Stages:  New Query -> Working -> Quoted -> Booking   (+ Cancelled)
-- Completed is a *booking status*, not a stage.
-- =====================================================

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_status_check;
ALTER TABLE public.queries ALTER COLUMN status DROP DEFAULT;

-- Booking payment + check-in status (only meaningful while status = 'Booking').
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS booking_status TEXT;

-- Map any historical status value onto the new 4-stage model.
UPDATE public.queries SET status = CASE status
	-- interim 5-stage
	WHEN 'Inquiry'   THEN 'New Query'
	WHEN 'Proposal'  THEN 'Working'
	WHEN 'Booking'   THEN 'Booking'
	WHEN 'Delivery'  THEN 'Booking'
	WHEN 'Completed' THEN 'Booking'
	-- original 10-stage
	WHEN 'New Query - Not Responded'  THEN 'New Query'
	WHEN 'Responded - Awaiting Reply' THEN 'Working'
	WHEN 'Working on Proposal'        THEN 'Working'
	WHEN 'Proposal Sent'              THEN 'Quoted'
	WHEN 'Revisions Requested'        THEN 'Working'
	WHEN 'Finalized & Booking'        THEN 'Booking'
	WHEN 'Services Booked'            THEN 'Booking'
	WHEN 'In Delivery'                THEN 'Booking'
	-- already-correct values pass through
	WHEN 'New Query' THEN 'New Query'
	WHEN 'Working'   THEN 'Working'
	WHEN 'Quoted'    THEN 'Quoted'
	WHEN 'Cancelled' THEN 'Cancelled'
	ELSE 'New Query'
END;

-- Anything that used to be 'Completed' lands in Booking, flagged Completed.
UPDATE public.queries
SET booking_status = 'Completed'
WHERE booking_status IS NULL AND status = 'Booking' AND completed_date IS NOT NULL;

ALTER TABLE public.queries ALTER COLUMN status SET DEFAULT 'New Query';

ALTER TABLE public.queries ADD CONSTRAINT queries_status_check CHECK (status IN (
	'New Query',
	'Working',
	'Quoted',
	'Booking',
	'Cancelled'
));

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_booking_status_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_booking_status_check CHECK (
	booking_status IS NULL OR booking_status IN (
		'Payment Done - Check-in Left',
		'Payment Pending - Check-in Left',
		'Payment Pending - Travel Done',
		'Completed'
	)
);


-- =====================================================
-- Phase E — Bookings (actuals vs quote), per SPEC.md §4.4
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the two new tables).
--
-- A booking is created from the accepted quotation and auto-populated with its
-- line items. Staff then record the ACTUAL vendor + actual cost/selling per
-- component; profit/loss is computed against the quoted figures. Amounts are in
-- each line's currency (SAR for hotel/transfer/visa, PKR for tickets); the
-- booking's roe converts the SAR side for PKR totals.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
	roe NUMERIC(10, 4) NOT NULL DEFAULT 1,

	-- PKR roll-ups (computed in-app via the money layer, stored here).
	quoted_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quoted_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,

	-- Order-level discount (PKR) on the package total the client owes.
	discount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	discount_note TEXT,

	notes TEXT,
	is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_items (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
	line_type TEXT NOT NULL CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket')),
	label TEXT NOT NULL,
	vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),

	-- Snapshot from the quotation, plus the editable actuals (line currency).
	quoted_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quoted_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,

	booking_reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_query ON public.bookings (query_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_items_updated_at ON public.booking_items;
CREATE TRIGGER update_booking_items_updated_at BEFORE UPDATE ON public.booking_items
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Quote builder upgrade: per-line vendor, per-person, label
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

-- Per-line vendor (internal). Hotel check-in/out dates live in quotation_lines.meta.
ALTER TABLE public.quotation_lines
	ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Per-person price, the divisor setting, and an optional package label/tier.
ALTER TABLE public.quotations
	ADD COLUMN IF NOT EXISTS label TEXT,
	ADD COLUMN IF NOT EXISTS per_person_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS pp_include_infants BOOLEAN NOT NULL DEFAULT FALSE;


-- =====================================================
-- Carry quotation line detail (hotel dates, room type, route, …) into bookings
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

ALTER TABLE public.booking_items
	ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;


-- =====================================================
-- Passenger document vault: expand document types
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- documents.expiry_date already exists in the base schema.
-- =====================================================

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check CHECK (
	document_type IN (
		'passport', 'cnic', 'visa', 'photo', 'vaccination', 'mahram',
		'ticket', 'voucher', 'invoice', 'receipt', 'other'
	)
);


-- Track when a query last changed stage (for days-in-stage + stuck alerts).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT NOW();


-- Track when the booking voucher was shared with the client (green-tick state).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS voucher_sent_at TIMESTAMPTZ;


-- =====================================================
-- Payment schedule per query (deposit + balance, due dates, receipts)
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.query_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	label TEXT NOT NULL DEFAULT 'Payment',
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
	due_date DATE,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
	paid_date DATE,
	method TEXT,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_payments_query ON public.query_payments (query_id);

DROP TRIGGER IF EXISTS update_query_payments_updated_at ON public.query_payments;
CREATE TRIGGER update_query_payments_updated_at BEFORE UPDATE ON public.query_payments
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Dynamic trip-type capture: Umrah Plus + city blocks
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_package_type_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_package_type_check CHECK (
	package_type IS NULL OR package_type IN ('Umrah', 'Umrah Plus', 'Tour', 'Leisure')
);

-- Repeatable city blocks (Umrah cities, Umrah-Plus extra city, multi-city tours).
-- Each: { city, arrival_date, nights, hotel_preference, activities }.
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS itinerary_cities JSONB DEFAULT '[]'::jsonb,
	ADD COLUMN IF NOT EXISTS trip_country TEXT;


-- =====================================================
-- Tiered proposals: validity + inclusions/exclusions per quotation tier
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- A "proposal" = the set of (non-archived) quotation tiers for a query.
-- `label` is the tier name (e.g. 3-star / Premium).
-- =====================================================

ALTER TABLE public.quotations
	ADD COLUMN IF NOT EXISTS valid_until DATE,
	ADD COLUMN IF NOT EXISTS inclusions TEXT[] DEFAULT '{}',
	ADD COLUMN IF NOT EXISTS exclusions TEXT[] DEFAULT '{}';


-- Vendor WhatsApp group link (Billoo works with vendors via shared WA groups).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.vendors
	ADD COLUMN IF NOT EXISTS whatsapp_group TEXT;


-- =====================================================
-- Vendor ledger: payments we make TO vendors (settlements)
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
--
-- "Owed" is derived live from booking_items (actual_cost × roe per vendor);
-- this table records what we've actually paid. Balance = owed − paid.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
	booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
	booking_item_id UUID REFERENCES public.booking_items(id) ON DELETE SET NULL,
	query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0), -- PKR
	payment_date DATE DEFAULT CURRENT_DATE,
	method TEXT,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON public.vendor_payments (vendor_id);
