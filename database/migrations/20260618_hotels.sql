-- =====================================================
-- Canonical Hotels table + backfill (Rate Intelligence — step 1)
-- =====================================================
-- ONE-SHOT, idempotent. Paste the whole file into the Supabase SQL editor and
-- Run once — it creates the table, opens dev access (anon), and loads the final
-- reviewed/approved hotel list (92 hotels). Safe to re-run.
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_hotels_name_city ON public.hotels (lower(name), city);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON public.hotels (city);

-- 2. Dev open access (matches dev-open-access.sql, so the app's anon role can
--    read/write while auth is disabled). Idempotent.
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dev_open_access ON public.hotels;
CREATE POLICY dev_open_access ON public.hotels
	FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Backfill — final approved canonical list (92). TRUNCATE first so the table
--    matches the file exactly (replaces the earlier 14-row seed; some canonical
--    names were renamed). Safe: nothing references hotels yet. `notes` from the
--    CSV is intentionally not loaded (no notes column on this table).
TRUNCATE public.hotels;
INSERT INTO public.hotels (name, city, aliases) VALUES
	('Grand Plaza Al Madinah',        'madinah', ARRAY['Grand Plaza Madinah','Grand Plaza']::text[]),
	('Gulnar Taibah',                 'madinah', '{}'::text[]),
	('Al Baraka Kareem',              'madinah', ARRAY['Baraka Kareem']::text[]),
	('Arkan Al Manar',                'madinah', '{}'::text[]),
	('Dar Al Taqwa',                  'madinah', ARRAY['Dar Ul Taqwa','Dar ul Taqwa']::text[]),
	('Al Ritz Al Madinah',            'madinah', ARRAY['Ritz Al Madinah']::text[]),
	('Mukhtara International',         'madinah', ARRAY['Al Mukhtara International']::text[]),
	('Al Ansar Golden Tulip',         'madinah', ARRAY['AL Ansar Golden Tulip','Qasr Al Ansar Golden','AL Ansar Golden']::text[]),
	('Al Hayat International',         'madinah', '{}'::text[]),
	('Al Marsa Hotel',                'madinah', '{}'::text[]),
	('Al Saha Hotel',                 'madinah', '{}'::text[]),
	('Al Saman Al Jadid',             'madinah', '{}'::text[]),
	('Ancyra Hotel',                  'madinah', ARRAY['Ancyra']::text[]),
	('Anwar Al Zahraa',               'madinah', '{}'::text[]),
	('Arjwan Al Madinah',             'madinah', '{}'::text[]),
	('AstonEast Taiba',               'madinah', ARRAY['Artal International']::text[]),
	('Biltmore Madina',               'madinah', '{}'::text[]),
	('Burj Al Mukhtara',              'madinah', ARRAY['Al Mukhtara Tower']::text[]),
	('Dar Al Eiman Al Haram',         'madinah', ARRAY['Dar Al Eiman Al Haram Hotel']::text[]),
	('Dar Al Hijra InterContinental', 'madinah', '{}'::text[]),
	('Dar Al Naeem',                  'madinah', '{}'::text[]),
	('Deyar Al Eiman Hotel',          'madinah', '{}'::text[]),
	('Diyar Al Diwaniah',             'madinah', ARRAY['Golden Tulip Shakren','Gldn Tulip Shakren']::text[]),
	('Diyar Al Manniec',              'madinah', '{}'::text[]),
	('Durrat Al Eiman Hotel',         'madinah', '{}'::text[]),
	('Emaar Elite',                   'madinah', '{}'::text[]),
	('Emaar Mektan',                  'madinah', '{}'::text[]),
	('Emaar Royal',                   'madinah', '{}'::text[]),
	('Emaar Taiba',                   'madinah', '{}'::text[]),
	('Fundaq Mira Korkom',            'madinah', '{}'::text[]),
	('GH Hotel',                      'madinah', '{}'::text[]),
	('Ghadaf Silver',                 'madinah', '{}'::text[]),
	('Grand Plaza Badar Al Maqam',    'madinah', ARRAY['Badar Al Maqam','Al Maqam','Badar']::text[]),
	('Grand Zowar',                   'madinah', '{}'::text[]),
	('InterContinental Dar Al Eiman', 'madinah', ARRAY['Inter Continental Dar Al Eiman']::text[]),
	('Jada Al Ghamama',               'madinah', '{}'::text[]),
	('Jayden Hotel',                  'madinah', '{}'::text[]),
	('Keyan International',            'madinah', ARRAY['Artal Munawara']::text[]),
	('Leader Al Munna Kareem',        'madinah', '{}'::text[]),
	('Maden Al Rawda',                'madinah', '{}'::text[]),
	('Maden Hotel',                   'madinah', '{}'::text[]),
	('Maden Taiba Hotel',             'madinah', '{}'::text[]),
	('Makarem Burj Al Madina',        'madinah', '{}'::text[]),
	('Manazil Al Safia',              'madinah', '{}'::text[]),
	('Marjan International',           'madinah', '{}'::text[]),
	('Masarat Mano Tazia',            'madinah', '{}'::text[]),
	('Maysan Al Harithia',            'madinah', '{}'::text[]),
	('Maysan Al Taqwa',               'madinah', '{}'::text[]),
	('Maysan Rehab Al Mysk',          'madinah', ARRAY['Maysan Rehab El Mysk']::text[]),
	('Maysan Rotana Al Mysk',         'madinah', ARRAY['Maysan Rotana El Mysk']::text[]),
	('Millennium Al Aqeeq',           'madinah', '{}'::text[]),
	('Mohamdiah Al Zahraa',           'madinah', '{}'::text[]),
	('Mokhtara Gharbi',               'madinah', '{}'::text[]),
	('Mysk Touch',                    'madinah', '{}'::text[]),
	('Novotel Madinah',               'madinah', ARRAY['Novotel Hotel']::text[]),
	('Nozol Royal Inn',               'madinah', ARRAY['Nozol Royal INN']::text[]),
	('Nusuk Al Hijra',                'madinah', ARRAY['Nusuk Al Hijra Hotel']::text[]),
	('Nusuk Al Madinah',              'madinah', ARRAY['Nusk Al Madinah','Nusuk Al Madina']::text[]),
	('ODST Al Madina',                'madinah', ARRAY['ODST AL Madina']::text[]),
	('One Inn',                       'madinah', '{}'::text[]),
	('Plaza Inn Ohud',                'madinah', ARRAY['Plaza INN Ohud','Plaza in Ohud']::text[]),
	('Pullman Zamzam Madina',         'madinah', '{}'::text[]),
	('Qaidat Al Diyafah',             'madinah', '{}'::text[]),
	('Rawaby Al Zahra',               'madinah', '{}'::text[]),
	('Rayan Al Manisi',               'madinah', '{}'::text[]),
	('Rotana Al Manakha',             'madinah', '{}'::text[]),
	('Shaza Regency',                 'madinah', ARRAY['Shaza Regency Plaza']::text[]),
	('Taiba Front',                   'madinah', '{}'::text[]),
	('Taiba Hills',                   'madinah', '{}'::text[]),
	('Taqwa 2',                       'madinah', '{}'::text[]),
	('The Season Hotel',              'madinah', '{}'::text[]),
	('Triple One',                    'madinah', '{}'::text[]),
	('Wadi Al Sufaraa',               'madinah', '{}'::text[]),
	('Wasan Al Zahra',                'madinah', '{}'::text[]),
	('Winner Inn Al Khair',           'madinah', ARRAY['Winner INN Al Khair','Winner Al Khair','Concord Dar Al Khair']::text[]),
	('Worth Peninsula',               'madinah', '{}'::text[]),
	('Makkah Towers',                 'makkah',  ARRAY['Makkah Tower','Makkah tower']::text[]),
	('Le Meridien Towers',            'makkah',  ARRAY['Lemeridian Tower','Le Meridien Towers Makkah']::text[]),
	('Makkah Hotel',                  'makkah',  '{}'::text[]),
	('Al Kiswah Towers',              'makkah',  ARRAY['Al Kiswa Tower']::text[]),
	('Makarem Ajyad',                 'makkah',  ARRAY['Makarim Ajyad']::text[]),
	('VOCO Makkah',                   'makkah',  ARRAY['Voco Hotel Makkah','Voco Hotel makkah','VOCO Intercontinental']::text[]),
	('Badar Al Massa',                'makkah',  ARRAY['Badar Al Masa']::text[]),
	('Fajr Al Badie 4',               'makkah',  '{}'::text[]),
	('Furdaq Dossat Al Ashayr',       'makkah',  '{}'::text[]),
	('Heraa Almuazzefin',             'makkah',  '{}'::text[]),
	('Masarat Alghadra',              'makkah',  '{}'::text[]),
	('Masarat Khair',                 'makkah',  '{}'::text[]),
	('Masarat Royal',                 'makkah',  '{}'::text[]),
	('Masarat Rulyem',                'makkah',  '{}'::text[]),
	('Nozol Sharoon',                 'makkah',  '{}'::text[]),
	('Zem Al Muzalal',                'makkah',  '{}'::text[]);

-- Verify: SELECT count(*) FROM public.hotels;  -- 92  (76 madinah, 16 makkah)
