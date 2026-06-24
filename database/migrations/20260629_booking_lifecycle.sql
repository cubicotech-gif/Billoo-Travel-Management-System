-- =====================================================
-- Booking lifecycle: payment-vs-package check-in stages + discount + override
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- Reworks the post-booking `booking_status` model so the stage is driven by
-- money (recorded payments vs the package total) and the trip's final date:
--
--   Pending Payment              -- still building the booking (pre "complete")
--   Payment Done - Check-in Left -- marked complete, paid in full, trip ahead
--   Payment Pending - Check-in Left -- marked complete, balance > 0, trip ahead
--   Payment Pending - Travel Done   -- trip is over but still owed (NEW)
--   Completed                    -- paid in full AND trip's final date passed
--
-- The old `Partial Payment` and `Check-in Done - Payment Pending` collapse into
-- the new buckets (see mapping below).
-- =====================================================

-- 1. Drop the old constraint FIRST so the remap can write the new values.
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_booking_status_check;

-- 2. Map existing rows onto the new values.
UPDATE public.queries SET booking_status = CASE booking_status
	WHEN 'Payment Done - Check-in Pending' THEN 'Payment Done - Check-in Left'
	WHEN 'Check-in Done - Payment Pending' THEN 'Payment Pending - Travel Done'
	WHEN 'Partial Payment'                 THEN 'Payment Pending - Check-in Left'
	ELSE booking_status -- 'Pending Payment', 'Completed', NULL pass through
END
WHERE booking_status IS NOT NULL;

-- 3. Add the CHECK constraint with the new set.
ALTER TABLE public.queries ADD CONSTRAINT queries_booking_status_check CHECK (
	booking_status IS NULL OR booking_status IN (
		'Pending Payment',
		'Payment Done - Check-in Left',
		'Payment Pending - Check-in Left',
		'Payment Pending - Travel Done',
		'Completed'
	)
);

-- 3. Manual override pin: when set, the auto-router leaves booking_status alone.
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS booking_status_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Order-level discount on the booking, in PKR. Reduces the amount owed that
--    the paid-vs-package test measures against.
ALTER TABLE public.bookings
	ADD COLUMN IF NOT EXISTS discount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings
	ADD COLUMN IF NOT EXISTS discount_note TEXT;
