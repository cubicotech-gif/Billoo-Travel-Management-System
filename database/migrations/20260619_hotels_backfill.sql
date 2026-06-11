-- =====================================================
-- Hotels backfill (Rate Intelligence — step 1)
-- =====================================================
-- Canonical hotels extracted from rate_cards + quotation_lines.meta.hotel and
-- clustered with the app's fuzzy logic, then manually reviewed/approved.
-- Run AFTER 20260618_hotels.sql (the table must exist).
-- Idempotent: ON CONFLICT on the case-insensitive (name, city) unique index.
-- =====================================================

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
