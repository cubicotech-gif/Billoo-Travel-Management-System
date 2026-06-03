-- =====================================================
-- Phase E — Bookings (actuals vs quote), per SPEC.md §4.4
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the two new tables).
--
-- A booking is created from the accepted quotation and auto-populated with its
-- line items. Staff then record the ACTUAL vendor + actual cost/selling per
-- component; profit/loss is computed against the quoted figures. Amounts are in
-- each line's currency (SAR for hotel/transfer/visa, PKR for tickets); the
-- booking's roe converts the SAR side for PKR totals.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
	roe NUMERIC(10, 4) NOT NULL DEFAULT 1,

	-- PKR roll-ups (computed in-app via the money layer, stored here).
	quoted_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quoted_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,

	notes TEXT,
	is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_items (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
	line_type TEXT NOT NULL CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket')),
	label TEXT NOT NULL,
	vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),

	-- Snapshot from the quotation, plus the editable actuals (line currency).
	quoted_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quoted_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,

	booking_reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_query ON public.bookings (query_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_items_updated_at ON public.booking_items;
CREATE TRIGGER update_booking_items_updated_at BEFORE UPDATE ON public.booking_items
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
