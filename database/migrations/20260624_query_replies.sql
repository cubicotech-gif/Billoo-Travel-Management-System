-- Client reply thread on a query. When a quote is sent the query sits in the
-- Quoted stage; each time the client responds, staff log it here and the query
-- moves back to Working. Kept as an append-only thread so the full back-and-forth
-- is visible on the card.

CREATE TABLE IF NOT EXISTS public.query_replies (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	author TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_replies_query ON public.query_replies (query_id, created_at);

-- RLS: dev-open-access.sql adds the permissive anon/authenticated policy to every
-- public table (re-run it after applying this migration). Real policies land in
-- Phase 4 with auth.
ALTER TABLE public.query_replies ENABLE ROW LEVEL SECURITY;
