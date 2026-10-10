-- =====================================================
-- Hajj package catalogue (fixed, vendor-priced packages)
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql
-- (covers the new tables). Then load the 2027 data with
-- database/seeds/hajj-2027-catalogue.sql.
--
-- Hajj does NOT use the nightly stay-based Umrah quote builder. It sells from a
-- catalogue of fixed, dated packages (UB001…UB026) priced PER PERSON by room
-- sharing. The vendor publishes two separate price lists — USD and SAR — and we
-- keep them as two separate catalogues (never merged).
--
-- Prices stored here are OUR COST (what the vendor charges). Selling prices are
-- set per quote. The vendor pays a fixed commission per person, per package;
-- the PDFs don't state it, so `commission_per_person` starts NULL and is filled
-- in later from an admin screen.
--
-- Purely additive: no existing table is touched.
-- =====================================================

-- One price list per currency (e.g. "Hajj 2027 · USD"), per season.
CREATE TABLE IF NOT EXISTS public.hajj_catalogues (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	code TEXT NOT NULL UNIQUE, -- e.g. '2027-USD'
	name TEXT NOT NULL,
	season_year INTEGER NOT NULL, -- Gregorian, e.g. 2027
	hijri_year INTEGER, -- e.g. 1448
	currency TEXT NOT NULL CHECK (currency IN ('USD', 'SAR')),
	mina_category TEXT, -- vendor's Mina camp tier label ('A', 'A Plus')
	price_list_date DATE, -- date printed on the vendor's price list
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A package (UB001…). Dates are fixed by the vendor, so a package IS a departure.
CREATE TABLE IF NOT EXISTS public.hajj_packages (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	catalogue_id UUID NOT NULL REFERENCES public.hajj_catalogues(id) ON DELETE CASCADE,
	code TEXT NOT NULL, -- 'UB001'
	alt_code TEXT, -- code printed on the brochure page when it differs ('UHS018')
	tier_label TEXT NOT NULL DEFAULT 'Executive Platinum',
	title TEXT NOT NULL, -- 'Intercon / Fairmont – Medinah First'
	hotel_focus TEXT, -- 'Intercon / Fairmont', 'Swissotel', 'Flex 14', …
	series TEXT NOT NULL CHECK (series IN (
		'platinum_makkah_medinah', -- UB001–013: non-Aziziya
		'platinum_aziziya_makkah_medinah', -- UB014–021: with Aziziya
		'platinum_aziziya_medinah' -- UB022–026: with Aziziya (Value)
	)),
	first_city TEXT NOT NULL CHECK (first_city IN ('Makkah', 'Medinah')),
	total_days INTEGER NOT NULL CHECK (total_days > 0), -- itinerary rows
	duration_label TEXT, -- headline as printed ('14 Days', 'Flex 10 Days'); can differ from total_days
	is_short BOOLEAN NOT NULL DEFAULT FALSE,
	is_shifting BOOLEAN NOT NULL DEFAULT FALSE,
	has_aziziya BOOLEAN NOT NULL DEFAULT FALSE,
	start_date DATE NOT NULL, -- day 1 (earliest, for flexible arrival)
	end_date DATE NOT NULL, -- departure day
	notes TEXT,

	-- Fixed amount WE receive from the vendor per person, in the catalogue's
	-- currency. NULL until entered; unaffected by room type or add-ons.
	commission_per_person NUMERIC(12, 2) CHECK (commission_per_person >= 0),

	sort_order INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (catalogue_id, code)
);

-- Hotel option A / B. Chosen per traveller. Single-option packages have only 'A'.
CREATE TABLE IF NOT EXISTS public.hajj_package_options (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	package_id UUID NOT NULL REFERENCES public.hajj_packages(id) ON DELETE CASCADE,
	code TEXT NOT NULL CHECK (code IN ('A', 'B')),
	label TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (package_id, code)
);

-- Per-person price per room sharing. A combination the vendor marks "N/A" is
-- simply absent (no row).
CREATE TABLE IF NOT EXISTS public.hajj_package_prices (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	option_id UUID NOT NULL REFERENCES public.hajj_package_options(id) ON DELETE CASCADE,
	room_type TEXT NOT NULL CHECK (room_type IN ('Sharing', 'Quad', 'Triple', 'Double')),
	price NUMERIC(12, 2) NOT NULL CHECK (price >= 0), -- our cost, in the catalogue currency
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (option_id, room_type)
);

-- Day-by-day itinerary, as printed by the vendor.
--   hotel_a = Option A hotel; hotel_b = Option B hotel, NULL when B shares A's.
CREATE TABLE IF NOT EXISTS public.hajj_package_days (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	package_id UUID NOT NULL REFERENCES public.hajj_packages(id) ON DELETE CASCADE,
	day_no INTEGER NOT NULL CHECK (day_no > 0),
	date_ad DATE NOT NULL,
	date_ad_end DATE, -- set when arrival is a window (e.g. 10–12 May)
	hijri_label TEXT, -- '04 Zil Hajj'
	city_label TEXT, -- 'To Medinah', 'Mina', '' on departure day
	kind TEXT NOT NULL DEFAULT 'stay' CHECK (kind IN ('stay', 'mina', 'arafat', 'departure')),
	hotel_a TEXT NOT NULL,
	stars_a NUMERIC(2, 1),
	hotel_b TEXT,
	stars_b NUMERIC(2, 1),
	UNIQUE (package_id, day_no)
);

-- Add-ons and supplements, per catalogue (so each carries its own currency).
-- unit_price is OUR COST. NULL = price not published yet (tents, business class).
CREATE TABLE IF NOT EXISTS public.hajj_addons (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	catalogue_id UUID NOT NULL REFERENCES public.hajj_catalogues(id) ON DELETE CASCADE,
	code TEXT NOT NULL,
	name TEXT NOT NULL,
	group_name TEXT NOT NULL, -- UI grouping: 'Accommodation', 'Transport', 'Mina tent', …
	description TEXT,
	pricing_kind TEXT NOT NULL CHECK (pricing_kind IN (
		'per_person', -- flat per traveller
		'per_person_by_room', -- per traveller, price depends on room sharing
		'per_night_by_room', -- per traveller per night, depends on room sharing
		'pooled_vehicle' -- one price per vehicle, split across its occupants
	)),
	unit_price NUMERIC(12, 2) CHECK (unit_price >= 0),
	capacity INTEGER CHECK (capacity > 0), -- pooled_vehicle: max occupants
	is_estimate BOOLEAN NOT NULL DEFAULT FALSE, -- vendor says "approx"
	package_codes TEXT[], -- NULL = applies to every package in the catalogue
	sort_order INTEGER NOT NULL DEFAULT 0,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (catalogue_id, code)
);

-- Room-dependent prices for per_person_by_room / per_night_by_room add-ons.
CREATE TABLE IF NOT EXISTS public.hajj_addon_room_prices (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	addon_id UUID NOT NULL REFERENCES public.hajj_addons(id) ON DELETE CASCADE,
	room_type TEXT NOT NULL CHECK (room_type IN ('Sharing', 'Quad', 'Triple', 'Double')),
	price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
	UNIQUE (addon_id, room_type)
);

CREATE INDEX IF NOT EXISTS idx_hajj_packages_catalogue ON public.hajj_packages (catalogue_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hajj_options_package ON public.hajj_package_options (package_id);
CREATE INDEX IF NOT EXISTS idx_hajj_prices_option ON public.hajj_package_prices (option_id);
CREATE INDEX IF NOT EXISTS idx_hajj_days_package ON public.hajj_package_days (package_id, day_no);
CREATE INDEX IF NOT EXISTS idx_hajj_addons_catalogue ON public.hajj_addons (catalogue_id, sort_order);

DROP TRIGGER IF EXISTS update_hajj_catalogues_updated_at ON public.hajj_catalogues;
CREATE TRIGGER update_hajj_catalogues_updated_at BEFORE UPDATE ON public.hajj_catalogues
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hajj_packages_updated_at ON public.hajj_packages;
CREATE TRIGGER update_hajj_packages_updated_at BEFORE UPDATE ON public.hajj_packages
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hajj_package_prices_updated_at ON public.hajj_package_prices;
CREATE TRIGGER update_hajj_package_prices_updated_at BEFORE UPDATE ON public.hajj_package_prices
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hajj_addons_updated_at ON public.hajj_addons;
CREATE TRIGGER update_hajj_addons_updated_at BEFORE UPDATE ON public.hajj_addons
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
