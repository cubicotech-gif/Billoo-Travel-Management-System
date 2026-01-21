-- Billoo Travel Management System - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('Admin', 'Agent');
CREATE TYPE travel_type AS ENUM ('Umrah', 'Malaysia', 'Flight', 'Hotel', 'Other');
CREATE TYPE query_status AS ENUM ('New', 'Working', 'Quoted', 'Finalized', 'Cancelled');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'Agent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Queries table
CREATE TABLE public.queries (
  id SERIAL PRIMARY KEY,
  query_number TEXT UNIQUE NOT NULL,
  passenger_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  travel_type travel_type NOT NULL,
  status query_status DEFAULT 'New',
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_queries_created_by ON public.queries(created_by);
CREATE INDEX idx_queries_status ON public.queries(status);
CREATE INDEX idx_queries_query_number ON public.queries(query_number);
CREATE INDEX idx_queries_created_at ON public.queries(created_at);

-- Enable Row Level Security
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

-- Users can read all queries
CREATE POLICY "Users can read all queries" ON public.queries
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can create queries
CREATE POLICY "Users can create queries" ON public.queries
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own queries
CREATE POLICY "Users can update own queries" ON public.queries
  FOR UPDATE USING (auth.uid() = created_by);

-- Admins can update all queries
CREATE POLICY "Admins can update all queries" ON public.queries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
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

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Agent'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default admin user (you'll need to create this user in Supabase Auth first)
-- After creating the auth user, their profile will be automatically created by the trigger

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Success message
SELECT 'Database schema created successfully!' AS message;
