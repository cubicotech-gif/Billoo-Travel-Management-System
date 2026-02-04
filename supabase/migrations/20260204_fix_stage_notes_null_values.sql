-- Fix NULL values in JSONB and array columns to prevent FOREACH errors
-- This resolves the "FOREACH expression must not be null" error
-- Date: 2026-02-04

-- ============================================
-- 1. Fix NULL values in queries.stage_notes
-- ============================================
UPDATE public.queries
SET stage_notes = '{}'::jsonb
WHERE stage_notes IS NULL;

ALTER TABLE public.queries
ALTER COLUMN stage_notes SET DEFAULT '{}'::jsonb;

ALTER TABLE public.queries
ALTER COLUMN stage_notes SET NOT NULL;

COMMENT ON COLUMN public.queries.stage_notes IS 'JSON object containing notes for each stage (must not be NULL, defaults to empty object)';

-- ============================================
-- 2. Fix NULL values in query_proposals.sent_via (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'query_proposals') THEN
    -- Update NULL sent_via arrays to empty array
    UPDATE public.query_proposals
    SET sent_via = '{}'::text[]
    WHERE sent_via IS NULL;

    -- Set default for sent_via
    ALTER TABLE public.query_proposals
    ALTER COLUMN sent_via SET DEFAULT '{}'::text[];

    -- Add NOT NULL constraint
    ALTER TABLE public.query_proposals
    ALTER COLUMN sent_via SET NOT NULL;
  END IF;
END $$;
