-- =====================================================
-- rate_observations + backfill (Rate Intelligence — step 2)
-- =====================================================
-- ONE-SHOT, idempotent. Paste into the Supabase SQL editor and Run.
-- Creates the table, opens dev access, resolves hotels (name + aliases), and
-- backfills observations from quotation_lines and rate_cards. Re-runnable: it
-- only rewrites the two *backfill_* sources, never app-captured rows.
--
-- Append-only by convention: app code never UPDATE/DELETEs rows except to set
-- the `invalidated` flag.
-- =====================================================

-- 1. Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_observations (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
	room_type TEXT CHECK (room_type IN ('double', 'triple', 'quad', 'sharing', 'custom')),
	occupancy INTEGER,
	vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
	check_in DATE,
	check_out DATE,
	rate NUMERIC(12, 2) NOT NULL CHECK (rate >= 0),  -- cost_price: what the vendor charges us
	currency TEXT NOT NULL DEFAULT 'SAR' CHECK (currency IN ('SAR', 'PKR')),
	source TEXT NOT NULL CHECK (source IN (
		'workshop_capture', 'manual_entry', 'rate_sheet_import',
		'suggestion_accepted', 'backfill_quotations', 'backfill_rate_cards'
	)),
	query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
	quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
	captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	captured_by TEXT,
	invalidated BOOLEAN NOT NULL DEFAULT FALSE,
	invalidated_reason TEXT,
	notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_rate_obs_hotel_room_checkin
	ON public.rate_observations (hotel_id, room_type, check_in);
CREATE INDEX IF NOT EXISTS idx_rate_obs_vendor
	ON public.rate_observations (vendor_id);

-- Dev open access (anon role), matches dev-open-access.sql. Idempotent.
ALTER TABLE public.rate_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dev_open_access ON public.rate_observations;
CREATE POLICY dev_open_access ON public.rate_observations
	FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Hotel resolver: raw name -> hotel_id via canonical name OR any alias
--    (case-insensitive, trimmed). Prefers a canonical-name match on ties.
CREATE OR REPLACE FUNCTION public.resolve_hotel_id(p_name TEXT)
RETURNS UUID LANGUAGE sql STABLE AS $$
	SELECT h.id
	FROM public.hotels h
	WHERE lower(btrim(p_name)) = lower(h.name)
	   OR lower(btrim(p_name)) = ANY (SELECT lower(a) FROM unnest(h.aliases) AS a)
	ORDER BY (lower(btrim(p_name)) = lower(h.name)) DESC
	LIMIT 1
$$;

-- 3. Backfill (re-runnable: clear prior backfill rows only) ------------------
DELETE FROM public.rate_observations
WHERE source IN ('backfill_quotations', 'backfill_rate_cards');

-- A. quotation_lines — real priced hotel rooms (excludes breakfast lines).
INSERT INTO public.rate_observations
	(hotel_id, room_type, occupancy, vendor_id, check_in, check_out, rate, currency,
	 source, query_id, quotation_id, captured_at)
SELECT
	public.resolve_hotel_id(ql.meta->>'hotel'),
	CASE lower(coalesce(ql.meta->>'room_type', ''))
		WHEN 'double' THEN 'double'
		WHEN 'triple' THEN 'triple'
		WHEN 'quad'   THEN 'quad'
		WHEN 'sharing' THEN 'sharing'
		ELSE 'custom'
	END,
	NULLIF(ql.meta->>'occupancy', '')::numeric::int,
	ql.vendor_id,
	NULLIF(ql.meta->>'check_in', '')::date,
	NULLIF(ql.meta->>'check_out', '')::date,
	ql.unit_cost,
	coalesce(ql.currency, 'SAR'),
	'backfill_quotations',
	q.query_id,
	ql.quotation_id,
	q.created_at
FROM public.quotation_lines ql
JOIN public.quotations q ON q.id = ql.quotation_id
WHERE ql.line_type = 'hotel'
  AND coalesce(ql.meta->>'kind', '') <> 'breakfast'
  AND coalesce(ql.meta->>'hotel', '') <> ''
  AND coalesce(ql.unit_cost, 0) > 0
  AND public.resolve_hotel_id(ql.meta->>'hotel') IS NOT NULL;

-- B. rate_cards — point-in-time hotel rate cards (no stay dates known).
INSERT INTO public.rate_observations
	(hotel_id, room_type, occupancy, vendor_id, check_in, check_out, rate, currency,
	 source, captured_at, notes)
SELECT
	public.resolve_hotel_id(rc.name),
	CASE rc.occupancy
		WHEN 2 THEN 'double'
		WHEN 3 THEN 'triple'
		WHEN 4 THEN 'quad'
		ELSE 'custom'
	END,
	rc.occupancy,
	rc.vendor_id,
	rc.rate_date,
	rc.rate_date,
	rc.cost_price,
	coalesce(rc.currency, 'SAR'),
	'backfill_rate_cards',
	rc.rate_date::timestamptz,
	'point-in-time rate card'
FROM public.rate_cards rc
WHERE rc.item_type = 'hotel'
  AND coalesce(rc.cost_price, 0) > 0
  AND public.resolve_hotel_id(rc.name) IS NOT NULL;

-- =====================================================
-- REPORTS — run these after the script to verify
-- =====================================================

-- Row counts per source:
-- SELECT source, count(*) FROM public.rate_observations GROUP BY source ORDER BY source;

-- 5 sample rows:
-- SELECT h.name, o.room_type, o.occupancy, o.rate, o.currency,
--        o.check_in, o.check_out, o.source, o.captured_at
-- FROM public.rate_observations o
-- JOIN public.hotels h ON h.id = o.hotel_id
-- ORDER BY o.captured_at DESC NULLS LAST
-- LIMIT 5;

-- Unmatched hotel names (skipped — couldn't resolve to a hotel):
-- SELECT 'quotation_lines' AS src, ql.meta->>'hotel' AS raw_name,
--        ql.meta->>'city' AS raw_city, count(*) AS rows
-- FROM public.quotation_lines ql
-- WHERE ql.line_type = 'hotel'
--   AND coalesce(ql.meta->>'kind','') <> 'breakfast'
--   AND coalesce(ql.meta->>'hotel','') <> ''
--   AND public.resolve_hotel_id(ql.meta->>'hotel') IS NULL
-- GROUP BY 1, 2, 3
-- UNION ALL
-- SELECT 'rate_cards', rc.name, rc.city, count(*)
-- FROM public.rate_cards rc
-- WHERE rc.item_type = 'hotel'
--   AND coalesce(rc.name,'') <> ''
--   AND public.resolve_hotel_id(rc.name) IS NULL
-- GROUP BY 1, 2, 3
-- ORDER BY 1, 2;
