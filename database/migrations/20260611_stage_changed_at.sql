-- Track when a query last changed stage (for days-in-stage + stuck alerts).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT NOW();
