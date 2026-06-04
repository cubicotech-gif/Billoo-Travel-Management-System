-- =====================================================
-- Tiered proposals: validity + inclusions/exclusions per quotation tier
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- A "proposal" = the set of (non-archived) quotation tiers for a query.
-- `label` is the tier name (e.g. 3-star / Premium).
-- =====================================================

ALTER TABLE public.quotations
	ADD COLUMN IF NOT EXISTS valid_until DATE,
	ADD COLUMN IF NOT EXISTS inclusions TEXT[] DEFAULT '{}',
	ADD COLUMN IF NOT EXISTS exclusions TEXT[] DEFAULT '{}';
