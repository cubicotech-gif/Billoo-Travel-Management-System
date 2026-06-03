-- =====================================================
-- Phase D — Quotations (calculator output), per SPEC.md §4.2
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the two new tables).
--
-- A quotation is a priced package built from the daily rates. Multiple per
-- query, versioned. Hotels/Transfer/Visa priced in SAR; Tickets in PKR; one
-- ROE converts the SAR side. Totals are computed in-app via the money layer
-- and stored here; the line breakdown lives in quotation_lines.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quotations (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	version INTEGER NOT NULL DEFAULT 1,
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),

	-- Snapshot of the inputs that produced the totals.
	roe NUMERIC(10, 4) NOT NULL,
	adults INTEGER NOT NULL DEFAULT 1,
	children INTEGER NOT NULL DEFAULT 0,
	infants INTEGER NOT NULL DEFAULT 0,

	-- Subtotals (SAR side and PKR tickets), then PKR grand totals.
	sar_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	sar_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	tickets_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	tickets_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,

	whatsapp_text TEXT,
	notes TEXT,

	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),

	UNIQUE (query_id, version)
);

CREATE TABLE IF NOT EXISTS public.quotation_lines (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
	line_type TEXT NOT NULL CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket')),
	label TEXT NOT NULL,
	rate_card_id UUID REFERENCES public.rate_cards(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),
	unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	unit_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
	line_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	line_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	meta JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_query ON public.quotations (query_id);
CREATE INDEX IF NOT EXISTS idx_quotation_lines_quotation ON public.quotation_lines (quotation_id);

DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
