-- ═══════════════════════════════════════════════
-- QUERY MODULE — COMPLETE REBUILD
-- Run date: 2026-03-30
-- ═══════════════════════════════════════════════

-- Drop old query-related tables (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS public.query_proposals CASCADE;
DROP TABLE IF EXISTS public.query_passengers CASCADE;
DROP TABLE IF EXISTS public.query_services CASCADE;
DROP TABLE IF EXISTS public.document_checklists CASCADE;
DROP TABLE IF EXISTS public.query_templates CASCADE;
DROP TABLE IF EXISTS public.query_quotes CASCADE;
DROP TABLE IF EXISTS public.queries CASCADE;

-- ─── QUERIES TABLE ──────────────────────────────

CREATE TABLE public.queries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_number TEXT UNIQUE,

  -- Client info
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_whatsapp TEXT,
  client_email TEXT,

  -- Trip basics
  service_category TEXT NOT NULL DEFAULT 'umrah' CHECK (service_category IN (
    'umrah', 'hajj', 'visa_only', 'flight_only', 'hotel_only',
    'transport_only', 'leisure', 'other'
  )),
  destination TEXT NOT NULL,
  adults INTEGER DEFAULT 1 CHECK (adults >= 1),
  children INTEGER DEFAULT 0 CHECK (children >= 0),
  infants INTEGER DEFAULT 0 CHECK (infants >= 0),
  total_pax INTEGER GENERATED ALWAYS AS (adults + children + infants) STORED,

  -- Dates
  departure_date DATE,
  return_date DATE,
  dates_tentative BOOLEAN DEFAULT FALSE,

  -- Service-specific details (Umrah nights, flight details, etc.)
  service_details JSONB DEFAULT '{}'::jsonb,

  -- Budget
  budget_amount DECIMAL(12, 2),
  budget_type TEXT CHECK (budget_type IN ('total', 'per_person')),

  -- Client plan (pasted WhatsApp message or call notes)
  client_plan TEXT,

  -- Internal notes
  internal_notes TEXT,

  -- Source
  query_source TEXT CHECK (query_source IN (
    'phone_call', 'whatsapp', 'email', 'walk_in', 'website',
    'social_media', 'referral', 'returning_client', 'other'
  )),

  -- Workflow stage
  stage TEXT NOT NULL DEFAULT 'new_inquiry' CHECK (stage IN (
    'new_inquiry',
    'building_package',
    'quote_sent',
    'negotiating',
    'confirmed_paying',
    'booking_docs',
    'ready_to_travel',
    'completed',
    'cancelled'
  )),

  -- Stage timestamps
  stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  quote_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  booking_started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Financial totals (auto-calculated from services)
  total_cost DECIMAL(12, 2) DEFAULT 0,
  total_cost_pkr DECIMAL(12, 2) DEFAULT 0,
  total_selling DECIMAL(12, 2) DEFAULT 0,
  total_selling_pkr DECIMAL(12, 2) DEFAULT 0,
  total_profit DECIMAL(12, 2) DEFAULT 0,
  total_profit_pkr DECIMAL(12, 2) DEFAULT 0,
  profit_margin DECIMAL(5, 2) DEFAULT 0,

  -- Linked records
  primary_passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Proposal tracking
  current_quote_version INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate query number
CREATE OR REPLACE FUNCTION generate_query_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  seq_num INTEGER;
BEGIN
  today_str := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM public.queries
  WHERE TO_CHAR(created_at, 'YYYYMMDD') = today_str;
  NEW.query_number := 'QRY-' || today_str || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_query_number
  BEFORE INSERT ON public.queries
  FOR EACH ROW EXECUTE FUNCTION generate_query_number();

CREATE TRIGGER update_queries_updated_at
  BEFORE UPDATE ON public.queries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── QUERY SERVICES TABLE ───────────────────────

CREATE TABLE public.query_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,

  -- Service basics
  service_type TEXT NOT NULL CHECK (service_type IN (
    'hotel', 'flight', 'visa', 'transport', 'tour', 'insurance', 'other'
  )),
  description TEXT NOT NULL,

  -- Vendor
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,

  -- Pricing (TOTALS)
  currency TEXT DEFAULT 'SAR' CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP')),
  exchange_rate DECIMAL(10, 4),
  cost_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  profit DECIMAL(12, 2) DEFAULT 0,
  cost_price_pkr DECIMAL(12, 2) DEFAULT 0,
  selling_price_pkr DECIMAL(12, 2) DEFAULT 0,
  profit_pkr DECIMAL(12, 2) DEFAULT 0,

  -- Pricing breakdown (JSONB — varies by service type)
  pricing_details JSONB DEFAULT '{}'::jsonb,

  -- Service-type-specific details
  service_details JSONB DEFAULT '{}'::jsonb,

  -- Booking status
  booking_status TEXT DEFAULT 'not_booked' CHECK (booking_status IN (
    'not_booked', 'pending', 'confirmed', 'cancelled'
  )),
  booking_reference TEXT,
  booking_date DATE,
  booking_notes TEXT,

  -- Voucher
  voucher_url TEXT,
  voucher_uploaded_at TIMESTAMPTZ,

  -- Delivery
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'delivered', 'issue'
  )),

  -- Sort order
  sort_order INTEGER DEFAULT 0,

  -- Dates
  service_start_date DATE,
  service_end_date DATE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_query_services_updated_at
  BEFORE UPDATE ON public.query_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── QUERY PASSENGERS (junction) ────────────────

CREATE TABLE public.query_passengers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  passenger_type TEXT DEFAULT 'adult' CHECK (passenger_type IN ('adult', 'child', 'infant')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query_id, passenger_id)
);

-- ─── QUERY QUOTES ───────────────────────────────

CREATE TABLE public.query_quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  services_snapshot JSONB NOT NULL,
  total_cost DECIMAL(12, 2),
  total_selling DECIMAL(12, 2),
  total_profit DECIMAL(12, 2),
  currency TEXT DEFAULT 'SAR',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_via TEXT CHECK (sent_via IN ('whatsapp', 'email', 'sms', 'in_person', 'other')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'revised')),
  client_feedback TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query_id, version)
);

-- ─── QUERY TEMPLATES ────────────────────────────

CREATE TABLE public.query_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('umrah_economy', 'umrah_standard', 'umrah_premium', 'hajj', 'leisure', 'visa_only', 'custom')),
  destination TEXT,
  duration_days INTEGER,
  services_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_query_templates_updated_at
  BEFORE UPDATE ON public.query_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── DOCUMENT CHECKLISTS ────────────────────────

CREATE TABLE public.document_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'passport', 'passport_photo', 'cnic', 'vaccination', 'visa',
    'ticket', 'hotel_voucher', 'transport_voucher', 'insurance', 'other'
  )),
  status TEXT DEFAULT 'missing' CHECK (status IN ('missing', 'uploaded', 'verified', 'expired', 'rejected')),
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  required BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(query_id, passenger_id, document_type)
);

CREATE TRIGGER update_document_checklists_updated_at
  BEFORE UPDATE ON public.document_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── INDEXES ────────────────────────────────────

CREATE INDEX idx_queries_stage ON public.queries(stage);
CREATE INDEX idx_queries_created_at ON public.queries(created_at DESC);
CREATE INDEX idx_queries_client_name ON public.queries(client_name);
CREATE INDEX idx_queries_client_phone ON public.queries(client_phone);
CREATE INDEX idx_queries_departure_date ON public.queries(departure_date);
CREATE INDEX idx_queries_primary_passenger ON public.queries(primary_passenger_id);

CREATE INDEX idx_query_services_query ON public.query_services(query_id);
CREATE INDEX idx_query_services_vendor ON public.query_services(vendor_id);
CREATE INDEX idx_query_services_type ON public.query_services(service_type);

CREATE INDEX idx_query_passengers_query ON public.query_passengers(query_id);
CREATE INDEX idx_query_passengers_passenger ON public.query_passengers(passenger_id);

CREATE INDEX idx_query_quotes_query ON public.query_quotes(query_id);

CREATE INDEX idx_query_templates_category ON public.query_templates(category);

CREATE INDEX idx_doc_checklists_query ON public.document_checklists(query_id);
CREATE INDEX idx_doc_checklists_passenger ON public.document_checklists(passenger_id);

-- ─── RLS POLICIES ───────────────────────────────

ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage queries" ON public.queries
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage query services" ON public.query_services
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage query passengers" ON public.query_passengers
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage query quotes" ON public.query_quotes
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage query templates" ON public.query_templates
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage document checklists" ON public.document_checklists
  FOR ALL USING (auth.role() = 'authenticated');

-- ─── AUTO-RECALCULATE QUERY TOTALS ─────────────

CREATE OR REPLACE FUNCTION recalculate_query_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_query_id UUID;
  v_totals RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_query_id := OLD.query_id;
  ELSE
    v_query_id := NEW.query_id;
  END IF;

  SELECT
    COALESCE(SUM(cost_price), 0) AS total_cost,
    COALESCE(SUM(cost_price_pkr), 0) AS total_cost_pkr,
    COALESCE(SUM(selling_price), 0) AS total_selling,
    COALESCE(SUM(selling_price_pkr), 0) AS total_selling_pkr,
    COALESCE(SUM(profit), 0) AS total_profit,
    COALESCE(SUM(profit_pkr), 0) AS total_profit_pkr
  INTO v_totals
  FROM public.query_services
  WHERE query_id = v_query_id;

  UPDATE public.queries
  SET
    total_cost = v_totals.total_cost,
    total_cost_pkr = v_totals.total_cost_pkr,
    total_selling = v_totals.total_selling,
    total_selling_pkr = v_totals.total_selling_pkr,
    total_profit = v_totals.total_profit,
    total_profit_pkr = v_totals.total_profit_pkr,
    profit_margin = CASE
      WHEN v_totals.total_selling_pkr > 0
      THEN ROUND((v_totals.total_profit_pkr / v_totals.total_selling_pkr * 100)::numeric, 2)
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = v_query_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_query_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.query_services
  FOR EACH ROW EXECUTE FUNCTION recalculate_query_totals();
