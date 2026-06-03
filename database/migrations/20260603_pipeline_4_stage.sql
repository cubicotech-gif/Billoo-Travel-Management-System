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
		'Pending Payment',
		'Payment Done - Check-in Pending',
		'Check-in Done - Payment Pending',
		'Partial Payment',
		'Completed'
	)
);
