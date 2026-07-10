-- =====================================================
-- Passenger manifest (names + optional passport) on the query
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- Stores the trip's passengers so the itinerary/voucher lists real names.
-- JSONB array of { name, passport }. Additive — existing rows default to [].
-- =====================================================

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS passenger_manifest JSONB NOT NULL DEFAULT '[]'::jsonb;
