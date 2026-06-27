-- =====================================================
-- Per-service vendor payments
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- Lets a vendor payment be attributed to a specific booked service (a
-- booking_items row), so the vendor ledger can show owed vs paid vs balance per
-- service / per booking / per passenger. Purely additive: a nullable column +
-- index; existing payments keep booking_item_id = NULL (general/unattributed)
-- and nothing else changes.
-- =====================================================

ALTER TABLE public.vendor_payments
	ADD COLUMN IF NOT EXISTS booking_item_id UUID REFERENCES public.booking_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_payments_item ON public.vendor_payments (booking_item_id);
