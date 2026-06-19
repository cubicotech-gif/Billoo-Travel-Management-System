-- Activity log: a real timeline of what happened to a query (stage moves, quotes
-- sent, client messages, booking events, payments). Powers the "Recent updates"
-- panel in the query workspace. Append-only; best-effort writes from the app.

CREATE TABLE IF NOT EXISTS public.query_activity (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	-- coarse category for the icon/grouping: stage | quote | message | booking | payment | note
	kind TEXT NOT NULL DEFAULT 'note',
	summary TEXT NOT NULL,
	actor TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_activity_query ON public.query_activity (query_id, created_at DESC);

-- RLS: dev-open-access.sql adds the permissive anon/authenticated policy to every
-- public table (re-run it after applying this migration).
ALTER TABLE public.query_activity ENABLE ROW LEVEL SECURITY;
