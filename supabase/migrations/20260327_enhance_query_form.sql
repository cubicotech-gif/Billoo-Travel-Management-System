-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create queries table if it doesn't exist yet
-- (Safe to run even if table already exists)
CREATE TABLE IF NOT EXISTS public.queries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_number TEXT UNIQUE DEFAULT ('QRY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT NOT NULL,
  destination TEXT NOT NULL DEFAULT '',
  travel_date DATE,
  return_date DATE,
  is_tentative_dates BOOLEAN DEFAULT FALSE,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  infants INTEGER DEFAULT 0,
  query_source TEXT,
  service_type TEXT,
  tentative_plan TEXT,
  internal_reminders TEXT,
  is_responded BOOLEAN DEFAULT FALSE,
  response_given TEXT,
  status TEXT DEFAULT 'New Query - Not Responded',
  priority_level TEXT DEFAULT 'normal',
  follow_up_date DATE,
  assigned_to UUID,
  notes TEXT,

  -- Pricing
  cost_price DECIMAL(10, 2) DEFAULT 0,
  selling_price DECIMAL(10, 2) DEFAULT 0,

  -- Proposal tracking
  proposal_sent_date TIMESTAMPTZ,
  finalized_date TIMESTAMPTZ,
  current_proposal_version INTEGER,
  advance_payment_amount DECIMAL(12, 2),
  advance_payment_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Umrah/Hajj package fields and budget fields
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS package_nights INTEGER;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS city_order TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS makkah_nights INTEGER;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS madinah_nights INTEGER;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS hotel_preferences TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2);
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS budget_type TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'umrah';

-- Add columns that may have been added by other migrations (safe IF NOT EXISTS)
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS is_tentative_dates BOOLEAN DEFAULT FALSE;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS query_source TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS tentative_plan TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS internal_reminders TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS is_responded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS response_given TEXT;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal';
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- JSONB column for service-specific details (Visa, Flight, Hotel, Transport, Leisure, etc.)
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS service_details JSONB DEFAULT '{}'::jsonb;
