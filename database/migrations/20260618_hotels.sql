-- =====================================================
-- Canonical Hotels table + backfill (Rate Intelligence — step 1)
-- =====================================================
-- ONE-SHOT, idempotent. Paste the whole file into the Supabase SQL editor and
-- Run once — it creates the table, opens dev access (anon), and inserts the
-- reviewed/approved hotel list. Safe to re-run (nothing duplicates).
--
-- This is the canonical hotel entity. Hotels were free text in rate_cards.name /
-- quotation_lines.meta.hotel; this gives them one row each, with `aliases`
-- capturing the name variants seen in the wild (for fuzzy resolution).
-- NOTHING references hotel_id yet — backfill only.
-- =====================================================

-- 1. Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotels (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	name TEXT NOT NULL,
	city TEXT NOT NULL CHECK (city IN ('makkah', 'madinah', 'other')),
	star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 7),  -- nullable
	distance_note TEXT,                                       -- e.g. "300m from Haram"
	aliases TEXT[] NOT NULL DEFAULT '{}',                     -- name variants for fuzzy matching
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One canonical hotel per (name, city), case-insensitive — guards against dupes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotels_name_city ON public.hotels (lower(name), city);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON public.hotels (city);

-- 2. Dev open access (matches dev-open-access.sql, so the app's anon role can
--    read/write while auth is disabled). Idempotent.
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dev_open_access ON public.hotels;
CREATE POLICY dev_open_access ON public.hotels
	FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Backfill — reviewed & approved canonical hotels (fuzzy-clustered from
--    rate_cards + quotation_lines.meta.hotel; variants folded into aliases).
INSERT INTO public.hotels (name, city, aliases) VALUES
	('Grand Plaza',           'madinah', ARRAY['Grand Plaza Madinah']::text[]),
	('Gulnar Taibah',         'madinah', '{}'::text[]),
	('Arkan Al Manar',        'madinah', '{}'::text[]),
	('Al Baraka Kareem',      'madinah', ARRAY['Baraka Kareem']::text[]),
	('Dar Ul Taqwa',          'madinah', ARRAY['Dar ul Taqwa']::text[]),
	('Ritz Al Madinah',       'madinah', '{}'::text[]),
	('Mukhtara International', 'madinah', '{}'::text[]),
	('Makkah Tower',          'makkah',  ARRAY['Makkah tower']::text[]),
	('Makkah Hotel',          'makkah',  '{}'::text[]),
	('Lemeridian Tower',      'makkah',  '{}'::text[]),
	('Al Kiswa Tower',        'makkah',  '{}'::text[]),
	('Makarim Ajyad',         'makkah',  '{}'::text[]),
	('Voco Hotel Makkah',     'makkah',  ARRAY['Voco Hotel makkah']::text[]),
	('Badar Al Masa',         'makkah',  '{}'::text[])
ON CONFLICT (lower(name), city) DO NOTHING;

-- Verify: SELECT name, city, aliases FROM public.hotels ORDER BY city, name;  (14 rows)
