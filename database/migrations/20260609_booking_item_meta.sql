-- =====================================================
-- Carry quotation line detail (hotel dates, room type, route, …) into bookings
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

ALTER TABLE public.booking_items
	ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
