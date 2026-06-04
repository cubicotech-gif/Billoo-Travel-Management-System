-- =====================================================
-- Dynamic trip-type capture: Umrah Plus + city blocks
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_package_type_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_package_type_check CHECK (
	package_type IS NULL OR package_type IN ('Umrah', 'Umrah Plus', 'Tour', 'Leisure')
);

-- Repeatable city blocks (Umrah cities, Umrah-Plus extra city, multi-city tours).
-- Each: { city, arrival_date, nights, hotel_preference, activities }.
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS itinerary_cities JSONB DEFAULT '[]'::jsonb,
	ADD COLUMN IF NOT EXISTS trip_country TEXT;
