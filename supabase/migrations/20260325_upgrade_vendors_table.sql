-- =====================================================
-- Migration: Upgrade vendors table for 360° profiles
-- Date: 2026-03-25
-- Description: Adds service_types array, location, country, tags
-- Safe to run multiple times (idempotent)
-- =====================================================

-- Add new columns
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS service_types TEXT[] DEFAULT '{}';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Migrate existing single 'type' values into service_types array
-- Only for vendors where service_types is still empty
UPDATE public.vendors SET service_types = ARRAY[type] WHERE service_types = '{}' AND type IS NOT NULL;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vendors_service_types ON public.vendors USING GIN (service_types);
CREATE INDEX IF NOT EXISTS idx_vendors_tags ON public.vendors USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors (is_active);
