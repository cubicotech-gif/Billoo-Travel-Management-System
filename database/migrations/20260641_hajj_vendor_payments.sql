-- =====================================================
-- Hajj: payments WE make to the vendor
-- =====================================================
-- Run once in the Supabase SQL editor (after 20260640_hajj_proposals.sql),
-- THEN re-run dev-open-access.sql (covers the new table).
--
-- What we owe the vendor is computed (confirmed travellers' catalogue cost,
-- per currency); this table records what we have actually paid. A payment may
-- be tied to one query (optional) so each booking's balance can be followed.
-- The vendor is paid in its own currencies (USD / SAR). Purely additive.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hajj_vendor_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
	currency TEXT NOT NULL CHECK (currency IN ('USD', 'SAR')),
	paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
	query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hajj_vendor_payments_date
	ON public.hajj_vendor_payments (paid_date DESC);
CREATE INDEX IF NOT EXISTS idx_hajj_vendor_payments_query
	ON public.hajj_vendor_payments (query_id);
