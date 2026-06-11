-- =====================================================
-- Canonical Hotels table (Rate Intelligence — step 1)
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql so the
-- anon role gets a policy on this new table (it loops every public table).
--
-- This is the canonical hotel entity. Hotels are currently free text in
-- rate_cards.name / quotation_lines.meta.hotel; this table gives them one row
-- each, with `aliases` capturing the name variants seen in the wild (used for
-- fuzzy resolution). NOTHING references hotel_id yet — backfill only.
-- =====================================================

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
