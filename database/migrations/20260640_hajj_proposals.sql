-- =====================================================
-- Hajj: saved proposals (options) per query
-- =====================================================
-- Run once in the Supabase SQL editor (after 20260639_hajj_booking.sql),
-- THEN re-run dev-open-access.sql (covers the new table).
--
-- The Working-stage builder holds ONE live working copy of the family quote.
-- Saving it freezes a copy here as a labelled option ("Economy", "Intercon
-- 14 days", …) — the Hajj equivalent of an Umrah quotation tier. A query can
-- hold several; the client proposal can show any of them side by side.
--
-- `snapshot` is the frozen quote (travellers, their add-ons and the selling
-- prices as they were). Headline totals are copied out for lists and reports.
-- Purely additive.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hajj_proposals (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	version INTEGER NOT NULL DEFAULT 1,
	label TEXT,
	status TEXT NOT NULL DEFAULT 'draft'
		CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),
	roe NUMERIC(10, 4) NOT NULL DEFAULT 77 CHECK (roe > 0),
	usd_rate NUMERIC(10, 4) CHECK (usd_rate IS NULL OR usd_rate > 0),
	snapshot JSONB NOT NULL,
	traveller_count INTEGER NOT NULL DEFAULT 0,
	total_sell_pkr NUMERIC(14, 2) NOT NULL DEFAULT 0, -- SAR @ ROE + tickets
	total_sell_usd NUMERIC(14, 2), -- NULL when no USD package
	profit_pkr NUMERIC(14, 2) NOT NULL DEFAULT 0,
	valid_until DATE,
	whatsapp_text TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (query_id, version)
);

CREATE INDEX IF NOT EXISTS idx_hajj_proposals_query ON public.hajj_proposals (query_id, version DESC);

DROP TRIGGER IF EXISTS update_hajj_proposals_updated_at ON public.hajj_proposals;
CREATE TRIGGER update_hajj_proposals_updated_at BEFORE UPDATE ON public.hajj_proposals
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
