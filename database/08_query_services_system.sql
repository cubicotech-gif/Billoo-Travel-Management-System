-- Query Services System Migration
-- This migration adds the query_services table for managing services, quotes, and profit calculations
-- Phase 1: Working on Query System

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: query_services
-- =====================================================
-- This table stores all services (hotels, flights, transport, etc.) for each query
CREATE TABLE IF NOT EXISTS public.query_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('Hotel', 'Flight', 'Transport', 'Visa', 'Insurance', 'Tours', 'Other')),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_name TEXT,
  service_description TEXT NOT NULL,
  city TEXT,
  service_date DATE,
  purchase_price DECIMAL(12,2) DEFAULT 0 NOT NULL CHECK (purchase_price >= 0),
  selling_price DECIMAL(12,2) DEFAULT 0 NOT NULL CHECK (selling_price >= 0),
  profit DECIMAL(12,2) GENERATED ALWAYS AS (selling_price - purchase_price) STORED,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN selling_price > 0 THEN ((selling_price - purchase_price) / selling_price * 100) ELSE 0 END
  ) STORED,
  booking_reference TEXT,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Quoted', 'Booked', 'Confirmed', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_services_query_id ON public.query_services(query_id);
CREATE INDEX IF NOT EXISTS idx_query_services_vendor_id ON public.query_services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_query_services_status ON public.query_services(status);
CREATE INDEX IF NOT EXISTS idx_query_services_service_type ON public.query_services(service_type);

-- =====================================================
-- ENHANCE VENDORS TABLE
-- =====================================================
-- Add is_active column if it doesn't exist
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for active vendors
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors(is_active);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on query_services table
ALTER TABLE public.query_services ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view query_services
CREATE POLICY "query_services_select_policy" ON public.query_services
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can insert query_services
CREATE POLICY "query_services_insert_policy" ON public.query_services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: All authenticated users can update query_services
CREATE POLICY "query_services_update_policy" ON public.query_services
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: All authenticated users can delete query_services
CREATE POLICY "query_services_delete_policy" ON public.query_services
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on query_services
DROP TRIGGER IF EXISTS update_query_services_updated_at ON public.query_services;
CREATE TRIGGER update_query_services_updated_at
  BEFORE UPDATE ON public.query_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.query_services IS 'Stores all services (hotels, flights, transport, etc.) for each query with pricing and profit calculations';
COMMENT ON COLUMN public.query_services.profit IS 'Auto-calculated as (selling_price - purchase_price)';
COMMENT ON COLUMN public.query_services.profit_margin IS 'Auto-calculated as ((selling_price - purchase_price) / selling_price * 100)';
COMMENT ON COLUMN public.query_services.vendor_name IS 'Cached vendor name for display even if vendor is deleted or changed';
COMMENT ON COLUMN public.query_services.status IS 'Draft: Initial entry | Quoted: Sent to customer | Booked: Customer accepted | Confirmed: Vendor confirmed | Cancelled: Service cancelled';
