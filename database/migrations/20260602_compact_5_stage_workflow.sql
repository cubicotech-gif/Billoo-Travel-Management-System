-- =====================================================
-- Compact the query workflow: 10 stages -> 5 (+ Cancelled)
-- =====================================================
-- Run in the Supabase SQL editor. Safe to run once.
--
-- New model:
--   Inquiry  ->  Proposal  ->  Booking  ->  Delivery  ->  Completed
--   (Cancelled is a manual side-exit)
--
-- Maps any existing rows from the old 10-stage values onto the new 5.
-- =====================================================

-- 1. Drop the old CHECK constraint (name from complete-schema.sql).
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_status_check;

-- 2. Drop the old default so the UPDATE/constraint swap is clean.
ALTER TABLE public.queries ALTER COLUMN status DROP DEFAULT;

-- 3. Map existing data onto the new stage names.
UPDATE public.queries SET status = CASE status
	WHEN 'New Query - Not Responded'  THEN 'Inquiry'
	WHEN 'Responded - Awaiting Reply' THEN 'Inquiry'
	WHEN 'Working on Proposal'        THEN 'Proposal'
	WHEN 'Proposal Sent'              THEN 'Proposal'
	WHEN 'Revisions Requested'        THEN 'Proposal'
	WHEN 'Finalized & Booking'        THEN 'Booking'
	WHEN 'Services Booked'            THEN 'Booking'
	WHEN 'In Delivery'                THEN 'Delivery'
	WHEN 'Completed'                  THEN 'Completed'
	WHEN 'Cancelled'                  THEN 'Cancelled'
	ELSE 'Inquiry'
END;

-- 4. New default + new constraint.
ALTER TABLE public.queries ALTER COLUMN status SET DEFAULT 'Inquiry';

ALTER TABLE public.queries ADD CONSTRAINT queries_status_check CHECK (status IN (
	'Inquiry',
	'Proposal',
	'Booking',
	'Delivery',
	'Completed',
	'Cancelled'
));
