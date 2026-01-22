-- Billoo Travel Management System - Supabase Schema (Simplified - No Auth)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up old schema if exists (migration from auth version)
DROP TABLE IF EXISTS public.users CASCADE;
DROP POLICY IF EXISTS "Users can view all queries" ON public.queries;
DROP POLICY IF EXISTS "Users can insert own queries" ON public.queries;
DROP POLICY IF EXISTS "Users can update own queries" ON public.queries;

-- Remove created_by column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'queries'
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.queries DROP COLUMN created_by;
  END IF;
END $$;

-- Create custom types (only if they don't exist)
DO $$ BEGIN
  CREATE TYPE travel_type AS ENUM ('Umrah', 'Malaysia', 'Flight', 'Hotel', 'Other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE query_status AS ENUM ('New', 'Working', 'Quoted', 'Finalized', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Queries table (simplified - no user relationships)
CREATE TABLE IF NOT EXISTS public.queries (
  id SERIAL PRIMARY KEY,
  query_number TEXT UNIQUE NOT NULL,
  passenger_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  travel_type travel_type NOT NULL,
  status query_status DEFAULT 'New',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_queries_status ON public.queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_query_number ON public.queries(query_number);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON public.queries(created_at);

-- Disable Row Level Security (no auth needed)
ALTER TABLE public.queries DISABLE ROW LEVEL SECURITY;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_queries_updated_at ON public.queries;
CREATE TRIGGER update_queries_updated_at
  BEFORE UPDATE ON public.queries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate query number
CREATE OR REPLACE FUNCTION generate_query_number()
RETURNS TEXT AS $$
DECLARE
  today_date TEXT;
  query_count INTEGER;
  new_number TEXT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COUNT(*) INTO query_count
  FROM public.queries
  WHERE DATE(created_at) = CURRENT_DATE;

  new_number := 'QRY-' || today_date || '-' || LPAD((query_count + 1)::TEXT, 3, '0');

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (no auth, so everyone can access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Insert some sample data for testing
INSERT INTO public.queries (query_number, passenger_name, phone, email, travel_type, status) VALUES
  ('QRY-20260122-001', 'Ahmed Khan', '+92-300-1234567', 'ahmed@example.com', 'Umrah', 'New'),
  ('QRY-20260122-002', 'Fatima Ali', '+92-321-9876543', 'fatima@example.com', 'Malaysia', 'Working'),
  ('QRY-20260122-003', 'Hassan Raza', '+92-333-5555555', 'hassan@example.com', 'Flight', 'Quoted')
ON CONFLICT (query_number) DO NOTHING;

-- Success message
SELECT 'Database schema created successfully! No authentication required.' AS message;
