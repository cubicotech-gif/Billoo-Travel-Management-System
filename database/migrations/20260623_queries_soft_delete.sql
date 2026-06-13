-- =====================================================
-- Queries soft-delete (recoverable) — per SPEC §7 history integrity
-- =====================================================
-- Additive + low-risk. Deleting a query hides it from the board but preserves
-- its quotations/observations/history; it can be restored. Run once.
-- =====================================================

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_queries_is_deleted ON public.queries (is_deleted);
