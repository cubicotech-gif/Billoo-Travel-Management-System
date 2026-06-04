-- =====================================================
-- Vendor ledger: payments we make TO vendors (settlements)
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
--
-- "Owed" is derived live from booking_items (actual_cost × roe per vendor);
-- this table records what we've actually paid. Balance = owed − paid.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
	booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
	query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0), -- PKR
	payment_date DATE DEFAULT CURRENT_DATE,
	method TEXT,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON public.vendor_payments (vendor_id);
