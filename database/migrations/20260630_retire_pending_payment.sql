-- =====================================================
-- Retire the 'Pending Payment' booking status
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- The money/date auto-router never produces 'Pending Payment' — a booking being
-- built has booking_status NULL, and "Mark complete" routes straight to a
-- check-in bucket. So it was a dead column. Remap any rows that still carry it,
-- then drop it from the allowed set.
-- =====================================================

-- 1. Drop the constraint FIRST so the remap can write freely.
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_booking_status_check;

-- 2. Remap: finalised bookings become "unpaid · check-in left"; ones still being
--    built drop back to NULL (they show in "Booking in progress").
UPDATE public.queries
SET booking_status = CASE
	WHEN completed_date IS NOT NULL THEN 'Payment Pending - Check-in Left'
	ELSE NULL
END
WHERE booking_status = 'Pending Payment';

-- 3. Re-add the constraint without 'Pending Payment'.
ALTER TABLE public.queries ADD CONSTRAINT queries_booking_status_check CHECK (
	booking_status IS NULL OR booking_status IN (
		'Payment Done - Check-in Left',
		'Payment Pending - Check-in Left',
		'Payment Pending - Travel Done',
		'Completed'
	)
);
