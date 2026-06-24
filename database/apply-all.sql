-- =====================================================
-- apply-all.sql — bring a LIVE database up to date (safe to re-run)
-- =====================================================
-- Concatenates every migration (date order), then dev-open-access, then a
-- schema-cache reload. Designed to run on a database that already has data:
--   * every column/table/index uses IF NOT EXISTS,
--   * every replayed CHECK constraint is added NOT VALID, so the historical
--     (narrower) constraint definitions can't fail on rows that later migrations
--     made valid (e.g. package_type 'Umrah Plus', the 4-stage statuses). New
--     writes are still validated against the final constraint.
--
-- Run this in the Supabase SQL editor whenever the app reports a 400
-- "could not find column" (schema drift).
--
-- DO NOT run database/complete-schema.sql on an existing database — that file is
-- the from-scratch baseline and its early constraints predate your data.
-- =====================================================


-- ----------------------------------------------------------------
-- migration: 20260602_compact_5_stage_workflow.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Compact the query workflow: 10 stages -> 5 (+ Cancelled)
-- =====================================================
-- Run in the Supabase SQL editor. Safe to run once.
--
-- New model:
--   Inquiry  ->  Proposal  ->  Booking  ->  Delivery  ->  Completed
--   (Cancelled is a manual side-exit)
--
-- Maps any existing rows from the old 10-stage values onto the new 5.
-- =====================================================

-- 1. Drop the old CHECK constraint (name from complete-schema.sql).
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_status_check;

-- 2. Drop the old default so the UPDATE/constraint swap is clean.
ALTER TABLE public.queries ALTER COLUMN status DROP DEFAULT;

-- 3. Map existing data onto the new stage names.
UPDATE public.queries SET status = CASE status
	WHEN 'New Query - Not Responded'  THEN 'Inquiry'
	WHEN 'Responded - Awaiting Reply' THEN 'Inquiry'
	WHEN 'Working on Proposal'        THEN 'Proposal'
	WHEN 'Proposal Sent'              THEN 'Proposal'
	WHEN 'Revisions Requested'        THEN 'Proposal'
	WHEN 'Finalized & Booking'        THEN 'Booking'
	WHEN 'Services Booked'            THEN 'Booking'
	WHEN 'In Delivery'                THEN 'Delivery'
	WHEN 'Completed'                  THEN 'Completed'
	WHEN 'Cancelled'                  THEN 'Cancelled'
	ELSE 'Inquiry'
END;

-- 4. New default + new constraint.
ALTER TABLE public.queries ALTER COLUMN status SET DEFAULT 'Inquiry';

ALTER TABLE public.queries ADD CONSTRAINT queries_status_check CHECK (status IN (
	'Inquiry',
	'Proposal',
	'Booking',
	'Delivery',
	'Completed',
	'Cancelled'
)) NOT VALID;


-- ----------------------------------------------------------------
-- migration: 20260603_pipeline_4_stage.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Pipeline -> 4 stages (per SPEC.md) + Booking payment/check-in status
-- =====================================================
-- Run once in the Supabase SQL editor. Robust to any prior stage values
-- (original 10-stage, the interim 5-stage, or already 4-stage).
--
-- Stages:  New Query -> Working -> Quoted -> Booking   (+ Cancelled)
-- Completed is a *booking status*, not a stage.
-- =====================================================

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_status_check;
ALTER TABLE public.queries ALTER COLUMN status DROP DEFAULT;

-- Booking payment + check-in status (only meaningful while status = 'Booking').
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS booking_status TEXT;

-- Map any historical status value onto the new 4-stage model.
UPDATE public.queries SET status = CASE status
	-- interim 5-stage
	WHEN 'Inquiry'   THEN 'New Query'
	WHEN 'Proposal'  THEN 'Working'
	WHEN 'Booking'   THEN 'Booking'
	WHEN 'Delivery'  THEN 'Booking'
	WHEN 'Completed' THEN 'Booking'
	-- original 10-stage
	WHEN 'New Query - Not Responded'  THEN 'New Query'
	WHEN 'Responded - Awaiting Reply' THEN 'Working'
	WHEN 'Working on Proposal'        THEN 'Working'
	WHEN 'Proposal Sent'              THEN 'Quoted'
	WHEN 'Revisions Requested'        THEN 'Working'
	WHEN 'Finalized & Booking'        THEN 'Booking'
	WHEN 'Services Booked'            THEN 'Booking'
	WHEN 'In Delivery'                THEN 'Booking'
	-- already-correct values pass through
	WHEN 'New Query' THEN 'New Query'
	WHEN 'Working'   THEN 'Working'
	WHEN 'Quoted'    THEN 'Quoted'
	WHEN 'Cancelled' THEN 'Cancelled'
	ELSE 'New Query'
END;

-- Anything that used to be 'Completed' lands in Booking, flagged Completed.
UPDATE public.queries
SET booking_status = 'Completed'
WHERE booking_status IS NULL AND status = 'Booking' AND completed_date IS NOT NULL;

ALTER TABLE public.queries ALTER COLUMN status SET DEFAULT 'New Query';

ALTER TABLE public.queries ADD CONSTRAINT queries_status_check CHECK (status IN (
	'New Query',
	'Working',
	'Quoted',
	'Booking',
	'Cancelled'
)) NOT VALID;

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_booking_status_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_booking_status_check CHECK (
	booking_status IS NULL OR booking_status IN (
		'Pending Payment',
		'Payment Done - Check-in Pending',
		'Check-in Done - Payment Pending',
		'Partial Payment',
		'Completed'
	)
) NOT VALID;


-- ----------------------------------------------------------------
-- migration: 20260604_rates_and_exchange.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Daily Rates + Exchange Rate (ROE) — per SPEC.md §5
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql so the
-- anon role gets policies on these new tables (it loops every public table).
--
-- Rates are date-stamped (history kept). Quoting uses the latest rate per item.
-- Hotels/Transfer/Visa are priced in SAR; Airline tickets in PKR. A single
-- daily ROE (SAR->PKR) converts the SAR side for the package total.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_cards (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
	item_type TEXT NOT NULL CHECK (item_type IN ('hotel', 'transfer', 'visa', 'airline')),
	name TEXT NOT NULL,
	city TEXT,                 -- 'Makkah' / 'Madinah' for hotels
	vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),
	cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
	selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
	unit TEXT,                 -- 'per room/night', 'per vehicle', 'per person', 'per adult'
	occupancy INTEGER,         -- hotels: persons per room (drives room count)
	active BOOLEAN NOT NULL DEFAULT TRUE,
	notes TEXT,
	meta JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_cards_type_date ON public.rate_cards (item_type, rate_date DESC);
CREATE INDEX IF NOT EXISTS idx_rate_cards_active ON public.rate_cards (active);

-- One ROE per day (SAR -> PKR).
CREATE TABLE IF NOT EXISTS public.exchange_rates (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	rate_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
	sar_to_pkr NUMERIC(10, 4) NOT NULL CHECK (sar_to_pkr > 0),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at triggers (function defined in complete-schema.sql).
DROP TRIGGER IF EXISTS update_rate_cards_updated_at ON public.rate_cards;
CREATE TRIGGER update_rate_cards_updated_at BEFORE UPDATE ON public.rate_cards
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON public.exchange_rates;
CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------
-- migration: 20260605_staff_passengers_intake.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Phase C — Staff, Passenger CRM, rich Query intake (per SPEC.md §4.1, §6)
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the new staff table).
-- =====================================================

-- Staff (for attribution on queries/actions). Editable list.
CREATE TABLE IF NOT EXISTS public.staff (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.staff (name) VALUES ('Roohul'), ('Danish'), ('Maaz')
ON CONFLICT (name) DO NOTHING;

-- Passengers: soft-delete flag (history integrity).
ALTER TABLE public.passengers
	ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Queries: link to passenger + flexible intake fields.
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS created_by_staff TEXT,
	ADD COLUMN IF NOT EXISTS package_type TEXT,
	ADD COLUMN IF NOT EXISTS duration_days INTEGER,
	ADD COLUMN IF NOT EXISTS nights_makkah INTEGER,
	ADD COLUMN IF NOT EXISTS nights_madinah INTEGER,
	ADD COLUMN IF NOT EXISTS hotel_preference TEXT,
	ADD COLUMN IF NOT EXISTS client_preference TEXT,
	ADD COLUMN IF NOT EXISTS customer_plan TEXT,
	ADD COLUMN IF NOT EXISTS quick_note TEXT,
	ADD COLUMN IF NOT EXISTS responded BOOLEAN DEFAULT FALSE,
	ADD COLUMN IF NOT EXISTS response_text TEXT,
	ADD COLUMN IF NOT EXISTS initial_quotation TEXT;

-- package_type is constrained to the three offerings (nullable).
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_package_type_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_package_type_check CHECK (
	package_type IS NULL OR package_type IN ('Umrah', 'Tour', 'Leisure')
) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_queries_passenger_id ON public.queries (passenger_id);
CREATE INDEX IF NOT EXISTS idx_passengers_is_deleted ON public.passengers (is_deleted);


-- ----------------------------------------------------------------
-- migration: 20260606_quotations.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Phase D — Quotations (calculator output), per SPEC.md §4.2
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the two new tables).
--
-- A quotation is a priced package built from the daily rates. Multiple per
-- query, versioned. Hotels/Transfer/Visa priced in SAR; Tickets in PKR; one
-- ROE converts the SAR side. Totals are computed in-app via the money layer
-- and stored here; the line breakdown lives in quotation_lines.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.quotations (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	version INTEGER NOT NULL DEFAULT 1,
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'archived')),

	-- Snapshot of the inputs that produced the totals.
	roe NUMERIC(10, 4) NOT NULL,
	adults INTEGER NOT NULL DEFAULT 1,
	children INTEGER NOT NULL DEFAULT 0,
	infants INTEGER NOT NULL DEFAULT 0,

	-- Subtotals (SAR side and PKR tickets), then PKR grand totals.
	sar_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	sar_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	tickets_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	tickets_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	total_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,

	whatsapp_text TEXT,
	notes TEXT,

	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),

	UNIQUE (query_id, version)
);

CREATE TABLE IF NOT EXISTS public.quotation_lines (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
	line_type TEXT NOT NULL CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket')),
	label TEXT NOT NULL,
	rate_card_id UUID REFERENCES public.rate_cards(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),
	unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	unit_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
	line_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	line_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	meta JSONB DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_query ON public.quotations (query_id);
CREATE INDEX IF NOT EXISTS idx_quotation_lines_quotation ON public.quotation_lines (quotation_id);

DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------
-- migration: 20260607_bookings.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Phase E — Bookings (actuals vs quote), per SPEC.md §4.4
-- =====================================================
-- Run once, THEN re-run dev-open-access.sql (covers the two new tables).
--
-- A booking is created from the accepted quotation and auto-populated with its
-- line items. Staff then record the ACTUAL vendor + actual cost/selling per
-- component; profit/loss is computed against the quoted figures. Amounts are in
-- each line's currency (SAR for hotel/transfer/visa, PKR for tickets); the
-- booking's roe converts the SAR side for PKR totals.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bookings (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
	roe NUMERIC(10, 4) NOT NULL DEFAULT 1,

	-- PKR roll-ups (computed in-app via the money layer, stored here).
	quoted_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quoted_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	profit_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,

	notes TEXT,
	is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.booking_items (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
	line_type TEXT NOT NULL CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket')),
	label TEXT NOT NULL,
	vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
	currency TEXT NOT NULL CHECK (currency IN ('SAR', 'PKR')),

	-- Snapshot from the quotation, plus the editable actuals (line currency).
	quoted_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	quoted_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
	actual_sell NUMERIC(12, 2) NOT NULL DEFAULT 0,

	booking_reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_query ON public.bookings (query_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_items_updated_at ON public.booking_items;
CREATE TRIGGER update_booking_items_updated_at BEFORE UPDATE ON public.booking_items
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------
-- migration: 20260608_quote_builder_upgrade.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Quote builder upgrade: per-line vendor, per-person, label
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

-- Per-line vendor (internal). Hotel check-in/out dates live in quotation_lines.meta.
ALTER TABLE public.quotation_lines
	ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

-- Per-person price, the divisor setting, and an optional package label/tier.
ALTER TABLE public.quotations
	ADD COLUMN IF NOT EXISTS label TEXT,
	ADD COLUMN IF NOT EXISTS per_person_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS pp_include_infants BOOLEAN NOT NULL DEFAULT FALSE;


-- ----------------------------------------------------------------
-- migration: 20260609_booking_item_meta.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Carry quotation line detail (hotel dates, room type, route, …) into bookings
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

ALTER TABLE public.booking_items
	ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;


-- ----------------------------------------------------------------
-- migration: 20260610_passenger_document_types.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Passenger document vault: expand document types
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- documents.expiry_date already exists in the base schema.
-- =====================================================

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check CHECK (
	document_type IN (
		'passport', 'cnic', 'visa', 'photo', 'vaccination', 'mahram',
		'ticket', 'voucher', 'invoice', 'receipt', 'other'
	)
) NOT VALID;


-- ----------------------------------------------------------------
-- migration: 20260611_stage_changed_at.sql
-- ----------------------------------------------------------------
-- Track when a query last changed stage (for days-in-stage + stuck alerts).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT NOW();


-- ----------------------------------------------------------------
-- migration: 20260612_voucher_sent.sql
-- ----------------------------------------------------------------
-- Track when the booking voucher was shared with the client (green-tick state).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS voucher_sent_at TIMESTAMPTZ;


-- ----------------------------------------------------------------
-- migration: 20260613_query_payments.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Payment schedule per query (deposit + balance, due dates, receipts)
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.query_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	label TEXT NOT NULL DEFAULT 'Payment',
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
	due_date DATE,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
	paid_date DATE,
	method TEXT,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_payments_query ON public.query_payments (query_id);

DROP TRIGGER IF EXISTS update_query_payments_updated_at ON public.query_payments;
CREATE TRIGGER update_query_payments_updated_at BEFORE UPDATE ON public.query_payments
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------
-- migration: 20260614_trip_type_city_blocks.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Dynamic trip-type capture: Umrah Plus + city blocks
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_package_type_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_package_type_check CHECK (
	package_type IS NULL OR package_type IN ('Umrah', 'Umrah Plus', 'Tour', 'Leisure')
) NOT VALID;

-- Repeatable city blocks (Umrah cities, Umrah-Plus extra city, multi-city tours).
-- Each: { city, arrival_date, nights, hotel_preference, activities }.
ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS itinerary_cities JSONB DEFAULT '[]'::jsonb,
	ADD COLUMN IF NOT EXISTS trip_country TEXT;


-- ----------------------------------------------------------------
-- migration: 20260615_proposal_tiers.sql
-- ----------------------------------------------------------------
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


-- ----------------------------------------------------------------
-- migration: 20260615_usd_daily_rate.sql
-- ----------------------------------------------------------------
-- Multi-currency daily rates: keep the SAR->PKR ROE, add an optional USD->PKR
-- rate on the same per-day row. Umrah is priced wholly in SAR; Umrah-Plus and
-- other trips may carry USD components (hotels/transfers/visa). Final selling
-- prices are always PKR, converted at the day's rate.
ALTER TABLE public.exchange_rates
	ADD COLUMN IF NOT EXISTS usd_to_pkr NUMERIC(10, 4) CHECK (usd_to_pkr IS NULL OR usd_to_pkr > 0);

COMMENT ON COLUMN public.exchange_rates.usd_to_pkr IS '1 USD = ? PKR for the day (optional; used by non-SAR quote components).';

-- Persist the USD rate used on a quotation so reopening recomputes identically.
ALTER TABLE public.quotations
	ADD COLUMN IF NOT EXISTS usd_rate NUMERIC(10, 4) CHECK (usd_rate IS NULL OR usd_rate > 0);

COMMENT ON COLUMN public.quotations.usd_rate IS '1 USD = ? PKR snapshot used when this quote was priced (null if all-SAR).';


-- ----------------------------------------------------------------
-- migration: 20260616_vendor_whatsapp_group.sql
-- ----------------------------------------------------------------
-- Vendor WhatsApp group link (Billoo works with vendors via shared WA groups).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.vendors
	ADD COLUMN IF NOT EXISTS whatsapp_group TEXT;


-- ----------------------------------------------------------------
-- migration: 20260617_other_services.sql
-- ----------------------------------------------------------------
-- Other services on quotations (Polio cert, insurance, …) + multi-currency lines.
-- 1) Adds 'other' to the line_type CHECKs.
-- 2) Widens the line currency CHECK to include USD (USD components were already
--    priced in-app but the constraint still only allowed SAR/PKR).
-- Safe & additive: existing rows are unaffected.

ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_line_type_check;
ALTER TABLE public.quotation_lines
	ADD CONSTRAINT quotation_lines_line_type_check
	CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket', 'other')) NOT VALID;

ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_currency_check;
ALTER TABLE public.quotation_lines
	ADD CONSTRAINT quotation_lines_currency_check
	CHECK (currency IN ('SAR', 'PKR', 'USD')) NOT VALID;

-- The bookings line table mirrors the same shape.
ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_line_type_check;
ALTER TABLE public.booking_items
	ADD CONSTRAINT booking_items_line_type_check
	CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket', 'other')) NOT VALID;

ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_currency_check;
ALTER TABLE public.booking_items
	ADD CONSTRAINT booking_items_currency_check
	CHECK (currency IN ('SAR', 'PKR', 'USD')) NOT VALID;

-- ROLLBACK (run manually if needed):
-- ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_line_type_check;
-- ALTER TABLE public.quotation_lines ADD CONSTRAINT quotation_lines_line_type_check
--   CHECK (line_type IN ('hotel', 'transfer', 'visa', 'ticket'));
-- ALTER TABLE public.quotation_lines DROP CONSTRAINT IF EXISTS quotation_lines_currency_check;
-- ALTER TABLE public.quotation_lines ADD CONSTRAINT quotation_lines_currency_check
--   CHECK (currency IN ('SAR', 'PKR'));
-- (and the equivalent reverts on booking_items)


-- ----------------------------------------------------------------
-- migration: 20260617_vendor_payments.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Vendor ledger: payments we make TO vendors (settlements)
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
--
-- "Owed" is derived live from booking_items (actual_cost × roe per vendor);
-- this table records what we've actually paid. Balance = owed − paid.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vendor_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
	booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
	query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0), -- PKR
	payment_date DATE DEFAULT CURRENT_DATE,
	method TEXT,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor ON public.vendor_payments (vendor_id);


-- ----------------------------------------------------------------
-- migration: 20260618_hotels.sql
-- ----------------------------------------------------------------
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


-- ----------------------------------------------------------------
-- migration: 20260620_rate_observations.sql
-- ----------------------------------------------------------------
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


-- ----------------------------------------------------------------
-- migration: 20260621_rate_sheet_import.sql
-- ----------------------------------------------------------------
-- =====================================================
-- Vendor rate-sheet import (Rate Intelligence — step 3)
-- =====================================================
-- ONE-TIME import of 373 rows from 3 vendor rate sheets (Fazal-e-Haq,
-- World Region Aviation, Country Club Travel). Generated from
-- vendor-rate-sheet-import.csv. Run AFTER 20260620_rate_observations.sql.
-- Re-runnable: clears prior rate_sheet_import rows only.
-- =====================================================

-- 1. meal_plan column (RO/BB/HB/FB) — keeps BB/HB/FB from mixing with RO.
ALTER TABLE public.rate_observations
	ADD COLUMN IF NOT EXISTS meal_plan TEXT NOT NULL DEFAULT 'RO'
	CHECK (meal_plan IN ('RO', 'BB', 'HB', 'FB'));

-- 2. Ensure the 3 vendors exist (insert if missing, by case-insensitive name).
INSERT INTO public.vendors (name, type, service_types)
SELECT v.name, 'Hotel', ARRAY['Hotel']::text[]
FROM (VALUES ('Fazal-e-Haq'), ('World Region Aviation'), ('Country Club Travel')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM public.vendors x WHERE lower(x.name) = lower(v.name));

-- 3. Import (clear prior import first so this is re-runnable).
DELETE FROM public.rate_observations WHERE source = 'rate_sheet_import';

WITH raw(vendor, hotel_name, room_type, occupancy, meal_plan, valid_from, valid_to, rate_sar, notes) AS (
	VALUES
	('Fazal-e-Haq','Nusk Al Madinah','double',2,'RO','2026-06-30','2026-08-20',290,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat rate up to quad; 100m walk'),
	('Fazal-e-Haq','Nusk Al Madinah','triple',3,'RO','2026-06-30','2026-08-20',290,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat rate up to quad; 100m walk'),
	('Fazal-e-Haq','Nusk Al Madinah','quad',4,'RO','2026-06-30','2026-08-20',290,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat rate up to quad; 100m walk'),
	('Fazal-e-Haq','Nusk Al Madinah','double',2,'RO','2026-08-20','2026-10-20',330,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad'),
	('Fazal-e-Haq','Nusk Al Madinah','triple',3,'RO','2026-08-20','2026-10-20',330,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad'),
	('Fazal-e-Haq','Nusk Al Madinah','quad',4,'RO','2026-08-20','2026-10-20',330,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad'),
	('Fazal-e-Haq','Nusuk Al Hijra','double',2,'RO','2026-06-30','2026-08-20',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 100m'),
	('Fazal-e-Haq','Nusuk Al Hijra','triple',3,'RO','2026-06-30','2026-08-20',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 100m'),
	('Fazal-e-Haq','Nusuk Al Hijra','quad',4,'RO','2026-06-30','2026-08-20',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 100m'),
	('Fazal-e-Haq','Nusuk Al Hijra','double',2,'RO','2026-08-20','2026-10-20',440,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Nusuk Al Hijra','triple',3,'RO','2026-08-20','2026-10-20',440,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Nusuk Al Hijra','quad',4,'RO','2026-08-20','2026-10-20',440,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Mysk Touch','double',2,'RO','2026-06-30','2026-08-20',520,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 100m'),
	('Fazal-e-Haq','Mysk Touch','triple',3,'RO','2026-06-30','2026-08-20',520,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 100m'),
	('Fazal-e-Haq','Mysk Touch','quad',4,'RO','2026-06-30','2026-08-20',520,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 100m'),
	('Fazal-e-Haq','Mysk Touch','double',2,'RO','2026-08-20','2026-10-20',620,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Mysk Touch','triple',3,'RO','2026-08-20','2026-10-20',620,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Mysk Touch','quad',4,'RO','2026-08-20','2026-10-20',620,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','One Inn','double',2,'RO','2026-06-30','2026-07-15',425,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); 50m'),
	('Fazal-e-Haq','One Inn','triple',3,'RO','2026-06-30','2026-07-15',480,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); 50m'),
	('Fazal-e-Haq','One Inn','quad',4,'RO','2026-06-30','2026-07-15',535,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); 50m'),
	('Fazal-e-Haq','One Inn','double',2,'RO','2026-07-15','2026-09-12',470,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','One Inn','triple',3,'RO','2026-07-15','2026-09-12',525,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','One Inn','quad',4,'RO','2026-07-15','2026-09-12',580,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Triple One','double',2,'RO','2026-06-30','2026-07-15',260,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 50m'),
	('Fazal-e-Haq','Triple One','triple',3,'RO','2026-06-30','2026-07-15',260,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 50m'),
	('Fazal-e-Haq','Triple One','quad',4,'RO','2026-06-30','2026-07-15',260,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat up to quad; 50m'),
	('Fazal-e-Haq','Triple One','double',2,'RO','2026-07-15','2026-08-14',330,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Triple One','triple',3,'RO','2026-07-15','2026-08-14',330,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Triple One','quad',4,'RO','2026-07-15','2026-08-14',330,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','double',2,'RO','2026-06-30','2026-07-15',260,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); custom row = SUITE 350; 100m'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','triple',3,'RO','2026-06-30','2026-07-15',260,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); custom row = SUITE 350; 100m'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','quad',4,'RO','2026-06-30','2026-07-15',260,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); custom row = SUITE 350; 100m'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','custom',2,'RO','2026-06-30','2026-07-15',350,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); custom row = SUITE 350; 100m'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','double',2,'RO','2026-07-15','2026-09-12',300,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear on sheet; custom row = SUITE 460'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','triple',3,'RO','2026-07-15','2026-09-12',300,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear on sheet; custom row = SUITE 460'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','quad',4,'RO','2026-07-15','2026-09-12',300,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear on sheet; custom row = SUITE 460'),
	('Fazal-e-Haq','Qasr Al Ansar Golden','custom',2,'RO','2026-07-15','2026-09-12',460,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear on sheet; custom row = SUITE 460'),
	('Fazal-e-Haq','Jada Al Ghamama','double',2,'RO','2026-06-30','2026-07-15',130,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); shuttle hotel'),
	('Fazal-e-Haq','Jada Al Ghamama','triple',3,'RO','2026-06-30','2026-07-15',130,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); shuttle hotel'),
	('Fazal-e-Haq','Jada Al Ghamama','quad',4,'RO','2026-06-30','2026-07-15',130,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); shuttle hotel'),
	('Fazal-e-Haq','Jada Al Ghamama','double',2,'RO','2026-07-15','2026-09-12',190,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear'),
	('Fazal-e-Haq','Jada Al Ghamama','triple',3,'RO','2026-07-15','2026-09-12',190,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear'),
	('Fazal-e-Haq','Jada Al Ghamama','quad',4,'RO','2026-07-15','2026-09-12',190,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates unclear'),
	('Fazal-e-Haq','Al Saman Al Jadid','double',2,'RO','2026-06-30','2026-07-15',130,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); shuttle hotel; second band illegible on sheet'),
	('Fazal-e-Haq','Al Saman Al Jadid','triple',3,'RO','2026-06-30','2026-07-15',130,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); shuttle hotel; second band illegible on sheet'),
	('Fazal-e-Haq','Al Saman Al Jadid','quad',4,'RO','2026-06-30','2026-07-15',130,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); shuttle hotel; second band illegible on sheet'),
	('Fazal-e-Haq','Grand Plaza Badar Al Maqam','double',2,'RO','2026-06-26','2026-09-20',400,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); start date 26 Jun approx; cross-check: WRA quotes 410/435/460 same hotel'),
	('Fazal-e-Haq','Grand Plaza Badar Al Maqam','triple',3,'RO','2026-06-26','2026-09-20',425,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); start date 26 Jun approx; cross-check: WRA quotes 410/435/460 same hotel'),
	('Fazal-e-Haq','Grand Plaza Badar Al Maqam','quad',4,'RO','2026-06-26','2026-09-20',450,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); start date 26 Jun approx; cross-check: WRA quotes 410/435/460 same hotel'),
	('Fazal-e-Haq','Grand Plaza Badar Al Maqam','double',2,'RO','2026-07-20','2026-10-13',430,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Grand Plaza Badar Al Maqam','triple',3,'RO','2026-07-20','2026-10-13',455,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Grand Plaza Badar Al Maqam','quad',4,'RO','2026-07-20','2026-10-13',480,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Shaza Regency','double',2,'RO','2026-06-26','2026-09-20',380,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); dates approx; cross-check: WRA 410/435/460'),
	('Fazal-e-Haq','Shaza Regency','triple',3,'RO','2026-06-26','2026-09-20',405,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); dates approx; cross-check: WRA 410/435/460'),
	('Fazal-e-Haq','Shaza Regency','quad',4,'RO','2026-06-26','2026-09-20',430,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); dates approx; cross-check: WRA 410/435/460'),
	('Fazal-e-Haq','Shaza Regency','double',2,'RO','2026-07-20','2026-10-13',410,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Shaza Regency','triple',3,'RO','2026-07-20','2026-10-13',435,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Shaza Regency','quad',4,'RO','2026-07-20','2026-10-13',460,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Grand Plaza Al Madinah','double',2,'RO','2026-06-26','2026-09-20',340,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); cross-check: WRA 350/375/400'),
	('Fazal-e-Haq','Grand Plaza Al Madinah','triple',3,'RO','2026-06-26','2026-09-20',365,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); cross-check: WRA 350/375/400'),
	('Fazal-e-Haq','Grand Plaza Al Madinah','quad',4,'RO','2026-06-26','2026-09-20',390,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); cross-check: WRA 350/375/400'),
	('Fazal-e-Haq','Grand Plaza Al Madinah','double',2,'RO','2026-07-20','2026-10-12',380,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 digits/dates verify (quad could be 430)'),
	('Fazal-e-Haq','Grand Plaza Al Madinah','triple',3,'RO','2026-07-20','2026-10-12',405,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 digits/dates verify (quad could be 430)'),
	('Fazal-e-Haq','Grand Plaza Al Madinah','quad',4,'RO','2026-07-20','2026-10-12',440,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 digits/dates verify (quad could be 430)'),
	('Fazal-e-Haq','Maysan Rehab Al Mysk','double',2,'RO','2026-06-25','2026-09-20',300,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); sheet groups Rehab/Rotana Al Mysk together; cross-check WRA 310/335/360'),
	('Fazal-e-Haq','Maysan Rehab Al Mysk','triple',3,'RO','2026-06-25','2026-09-20',325,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); sheet groups Rehab/Rotana Al Mysk together; cross-check WRA 310/335/360'),
	('Fazal-e-Haq','Maysan Rehab Al Mysk','quad',4,'RO','2026-06-25','2026-09-20',350,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); sheet groups Rehab/Rotana Al Mysk together; cross-check WRA 310/335/360'),
	('Fazal-e-Haq','Maysan Rehab Al Mysk','double',2,'RO','2026-07-20','2026-10-13',325,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Maysan Rehab Al Mysk','triple',3,'RO','2026-07-20','2026-10-13',350,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Maysan Rehab Al Mysk','quad',4,'RO','2026-07-20','2026-10-13',375,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Arkan Al Manar','double',2,'RO','2026-06-30','2026-09-20',300,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); digits partially unclear; cross-check WRA 310/335/360; band-2 illegible'),
	('Fazal-e-Haq','Arkan Al Manar','triple',3,'RO','2026-06-30','2026-09-20',325,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); digits partially unclear; cross-check WRA 310/335/360; band-2 illegible'),
	('Fazal-e-Haq','Arkan Al Manar','quad',4,'RO','2026-06-30','2026-09-20',350,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); digits partially unclear; cross-check WRA 310/335/360; band-2 illegible'),
	('Fazal-e-Haq','Maysan Al Taqwa','double',2,'RO','2026-06-30','2026-09-20',260,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; cross-check WRA 270 flat'),
	('Fazal-e-Haq','Maysan Al Taqwa','triple',3,'RO','2026-06-30','2026-09-20',260,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; cross-check WRA 270 flat'),
	('Fazal-e-Haq','Maysan Al Taqwa','quad',4,'RO','2026-06-30','2026-09-20',260,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; cross-check WRA 270 flat'),
	('Fazal-e-Haq','Maysan Al Taqwa','double',2,'RO','2026-07-20','2026-10-13',290,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Maysan Al Taqwa','triple',3,'RO','2026-07-20','2026-10-13',290,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Maysan Al Taqwa','quad',4,'RO','2026-07-20','2026-10-13',290,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Plaza Inn Ohud','double',2,'RO','2026-06-26','2026-09-20',235,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; matches WRA exactly (235 flat, 26/6-20/9)'),
	('Fazal-e-Haq','Plaza Inn Ohud','triple',3,'RO','2026-06-26','2026-09-20',235,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; matches WRA exactly (235 flat, 26/6-20/9)'),
	('Fazal-e-Haq','Plaza Inn Ohud','quad',4,'RO','2026-06-26','2026-09-20',235,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; matches WRA exactly (235 flat, 26/6-20/9)'),
	('Fazal-e-Haq','Plaza Inn Ohud','double',2,'RO','2026-09-20','2026-10-20',270,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates assumed from column header'),
	('Fazal-e-Haq','Plaza Inn Ohud','triple',3,'RO','2026-09-20','2026-10-20',270,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates assumed from column header'),
	('Fazal-e-Haq','Plaza Inn Ohud','quad',4,'RO','2026-09-20','2026-10-20',270,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates assumed from column header'),
	('Fazal-e-Haq','Ancyra Hotel','double',2,'RO','2026-06-18','2026-10-01',310,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); matches CCT early-bird exactly (high confidence)'),
	('Fazal-e-Haq','Ancyra Hotel','triple',3,'RO','2026-06-18','2026-10-01',335,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); matches CCT early-bird exactly (high confidence)'),
	('Fazal-e-Haq','Ancyra Hotel','quad',4,'RO','2026-06-18','2026-10-01',360,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); matches CCT early-bird exactly (high confidence)'),
	('Fazal-e-Haq','Al Hayat International','double',2,'RO','2026-06-30','2026-08-14',340,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Al Hayat International','triple',3,'RO','2026-06-30','2026-08-14',360,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Al Hayat International','quad',4,'RO','2026-06-30','2026-08-14',380,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Al Hayat International','double',2,'RO','2026-08-14','2026-09-20',390,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Al Hayat International','triple',3,'RO','2026-08-14','2026-09-20',410,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Al Hayat International','quad',4,'RO','2026-08-14','2026-09-20',430,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO)'),
	('Fazal-e-Haq','Keyan International','double',2,'RO','2026-06-30','2026-08-14',360,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); Ex Artal Munawara'),
	('Fazal-e-Haq','Keyan International','triple',3,'RO','2026-06-30','2026-08-14',380,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); Ex Artal Munawara'),
	('Fazal-e-Haq','Keyan International','quad',4,'RO','2026-06-30','2026-08-14',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); Ex Artal Munawara'),
	('Fazal-e-Haq','Keyan International','double',2,'RO','2026-08-14','2026-09-20',410,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 end date approx'),
	('Fazal-e-Haq','Keyan International','triple',3,'RO','2026-08-14','2026-09-20',430,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 end date approx'),
	('Fazal-e-Haq','Keyan International','quad',4,'RO','2026-08-14','2026-09-20',450,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 end date approx'),
	('Fazal-e-Haq','Mokhtara Gharbi','double',2,'RO','2026-06-30','2026-08-14',310,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); dates approx'),
	('Fazal-e-Haq','Mokhtara Gharbi','triple',3,'RO','2026-06-30','2026-08-14',320,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); dates approx'),
	('Fazal-e-Haq','Mokhtara Gharbi','quad',4,'RO','2026-06-30','2026-08-14',330,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); dates approx'),
	('Fazal-e-Haq','Mokhtara Gharbi','double',2,'RO','2026-08-14','2026-09-20',340,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Mokhtara Gharbi','triple',3,'RO','2026-08-14','2026-09-20',350,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Mokhtara Gharbi','quad',4,'RO','2026-08-14','2026-09-20',360,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); band-2 dates approx'),
	('Fazal-e-Haq','Arjwan Al Madinah','double',2,'RO','2026-06-15','2026-08-15',270,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat'),
	('Fazal-e-Haq','Arjwan Al Madinah','triple',3,'RO','2026-06-15','2026-08-15',270,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat'),
	('Fazal-e-Haq','Arjwan Al Madinah','quad',4,'RO','2026-06-15','2026-08-15',270,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat'),
	('Fazal-e-Haq','Marjan International','double',2,'RO','2026-06-15','2026-08-15',320,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; dates approx'),
	('Fazal-e-Haq','Marjan International','triple',3,'RO','2026-06-15','2026-08-15',320,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; dates approx'),
	('Fazal-e-Haq','Marjan International','quad',4,'RO','2026-06-15','2026-08-15',320,'VERIFY: FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); flat; dates approx'),
	('Fazal-e-Haq','Winner Inn Al Khair','double',2,'RO','2026-06-30','2026-09-20',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); Ex Concord Dar Al Khair; matches WRA exactly (400 flat)'),
	('Fazal-e-Haq','Winner Inn Al Khair','triple',3,'RO','2026-06-30','2026-09-20',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); Ex Concord Dar Al Khair; matches WRA exactly (400 flat)'),
	('Fazal-e-Haq','Winner Inn Al Khair','quad',4,'RO','2026-06-30','2026-09-20',400,'FEH 2026-27 Umrah sheet; meal plan not stated (assume RO); Ex Concord Dar Al Khair; matches WRA exactly (400 flat)'),
	('World Region Aviation','Biltmore Madina','double',2,'BB','2026-06-16','2026-08-15',1800,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Biltmore Madina','triple',3,'BB','2026-06-16','2026-08-15',2100,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Taqwa','double',2,'BB','2026-06-05','2026-09-01',1080,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','InterContinental Dar Al Eiman','double',2,'BB','2026-06-11','2026-08-01',980,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','InterContinental Dar Al Eiman','triple',3,'BB','2026-06-11','2026-08-01',1140,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','InterContinental Dar Al Eiman','quad',4,'BB','2026-06-11','2026-08-01',1300,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Makarem Burj Al Madina','double',2,'BB','2026-06-01','2026-08-15',960,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Makarem Burj Al Madina','triple',3,'BB','2026-06-01','2026-08-15',1110,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Makarem Burj Al Madina','quad',4,'BB','2026-06-01','2026-08-15',1260,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Hotel','double',2,'BB','2026-06-25','2026-10-01',825,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Hotel','triple',3,'BB','2026-06-25','2026-10-01',975,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Hotel','quad',4,'BB','2026-06-25','2026-10-01',1125,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Hijra InterContinental','double',2,'BB','2026-06-25','2026-09-01',740,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Hijra InterContinental','triple',3,'BB','2026-06-25','2026-09-01',860,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Hijra InterContinental','quad',4,'BB','2026-06-25','2026-09-01',980,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Eiman Al Haram','double',2,'BB','2026-07-15','2026-09-16',670,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Eiman Al Haram','triple',3,'BB','2026-07-15','2026-09-16',770,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Eiman Al Haram','quad',4,'BB','2026-07-15','2026-09-16',870,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Ancyra Hotel','double',2,'BB','2026-06-18','2026-06-25',720,'VERIFY: WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; SUSPECT: short window + rates 2x other vendors'' Ancyra quotes (310/335/360) - verify with WRA'),
	('World Region Aviation','Ancyra Hotel','triple',3,'BB','2026-06-18','2026-06-25',820,'VERIFY: WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; SUSPECT: short window + rates 2x other vendors'' Ancyra quotes (310/335/360) - verify with WRA'),
	('World Region Aviation','Ancyra Hotel','quad',4,'BB','2026-06-18','2026-06-25',920,'VERIFY: WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; SUSPECT: short window + rates 2x other vendors'' Ancyra quotes (310/335/360) - verify with WRA'),
	('World Region Aviation','Millennium Al Aqeeq','double',2,'BB','2026-06-30','2026-08-19',670,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Millennium Al Aqeeq','triple',3,'BB','2026-06-30','2026-08-19',770,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Millennium Al Aqeeq','quad',4,'BB','2026-06-30','2026-08-19',870,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Taiba Front','double',2,'BB','2026-06-30','2026-09-01',670,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Taiba Front','triple',3,'BB','2026-06-30','2026-09-01',770,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Taiba Front','quad',4,'BB','2026-06-30','2026-09-01',870,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Worth Peninsula','double',2,'BB','2026-06-30','2026-08-19',660,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Worth Peninsula','triple',3,'BB','2026-06-30','2026-08-19',760,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Worth Peninsula','quad',4,'BB','2026-06-30','2026-08-19',860,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Taiba Hotel','double',2,'BB','2026-06-25','2026-10-01',625,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Taiba Hotel','triple',3,'BB','2026-06-25','2026-10-01',775,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Taiba Hotel','quad',4,'BB','2026-06-25','2026-10-01',925,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Al Harithia','double',2,'BB','2026-07-01','2026-09-16',645,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Al Harithia','triple',3,'BB','2026-07-01','2026-09-16',755,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Al Harithia','quad',4,'BB','2026-07-01','2026-09-16',865,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Al Rawda','double',2,'BB','2026-06-25','2026-09-22',630,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Al Rawda','triple',3,'BB','2026-06-25','2026-09-22',730,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maden Al Rawda','quad',4,'BB','2026-06-25','2026-09-22',830,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Pullman Zamzam Madina','double',2,'BB','2026-07-01','2026-08-19',570,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Pullman Zamzam Madina','triple',3,'BB','2026-07-01','2026-08-19',690,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Pullman Zamzam Madina','quad',4,'BB','2026-07-01','2026-08-19',810,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Leader Al Munna Kareem','double',2,'BB','2026-06-25','2026-09-15',610,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Leader Al Munna Kareem','triple',3,'BB','2026-06-25','2026-09-15',685,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Leader Al Munna Kareem','quad',4,'BB','2026-06-25','2026-09-15',765,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Royal','double',2,'BB','2026-06-30','2026-08-19',585,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Royal','triple',3,'BB','2026-06-30','2026-08-19',660,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Royal','quad',4,'BB','2026-06-30','2026-08-19',735,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Elite','double',2,'BB','2026-06-30','2026-08-19',560,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Elite','triple',3,'BB','2026-06-30','2026-08-19',635,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Elite','quad',4,'BB','2026-06-30','2026-08-19',710,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Mektan','double',2,'BB','2026-06-16','2026-08-19',560,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Mektan','triple',3,'BB','2026-06-16','2026-08-19',635,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Mektan','quad',4,'BB','2026-06-16','2026-08-19',710,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Novotel Hotel','double',2,'BB','2026-06-21','2026-09-15',560,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Rotana Al Manakha','double',2,'BB','2026-06-19','2026-10-15',525,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Rotana Al Manakha','triple',3,'BB','2026-06-19','2026-10-15',635,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Rotana Al Manakha','quad',4,'BB','2026-06-19','2026-10-15',725,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nozol Royal Inn','double',2,'BB','2026-06-25','2026-10-01',525,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nozol Royal Inn','triple',3,'BB','2026-06-25','2026-10-01',625,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nozol Royal Inn','quad',4,'BB','2026-06-25','2026-10-01',725,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Jayden Hotel','double',2,'BB','2026-07-01','2026-10-15',485,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Jayden Hotel','triple',3,'BB','2026-07-01','2026-10-15',560,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Jayden Hotel','quad',4,'BB','2026-07-01','2026-10-15',635,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Diyar Al Diwaniah','double',2,'BB','2026-06-30','2026-08-15',455,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; Ex Golden Tulip Shakren'),
	('World Region Aviation','Diyar Al Diwaniah','triple',3,'BB','2026-06-30','2026-08-15',505,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; Ex Golden Tulip Shakren'),
	('World Region Aviation','Diyar Al Diwaniah','quad',4,'BB','2026-06-30','2026-08-15',580,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; Ex Golden Tulip Shakren'),
	('World Region Aviation','Al Ansar Golden Tulip','double',2,'RO','2026-07-01','2026-09-16',435,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Ansar Golden Tulip','triple',3,'RO','2026-07-01','2026-09-16',435,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Ansar Golden Tulip','quad',4,'RO','2026-07-01','2026-09-16',435,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Plaza Badar Al Maqam','double',2,'RO','2026-06-20','2026-09-20',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Plaza Badar Al Maqam','triple',3,'RO','2026-06-20','2026-09-20',435,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Plaza Badar Al Maqam','quad',4,'RO','2026-06-20','2026-09-20',460,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Marsa Hotel','double',2,'RO','2026-06-16','2026-08-15',430,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Marsa Hotel','triple',3,'RO','2026-06-16','2026-08-15',430,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Marsa Hotel','quad',4,'RO','2026-06-16','2026-08-15',450,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Shaza Regency','double',2,'RO','2026-06-27','2026-09-20',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Shaza Regency','triple',3,'RO','2026-06-27','2026-09-20',435,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Shaza Regency','quad',4,'RO','2026-06-27','2026-09-20',460,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','AstonEast Taiba','double',2,'RO','2026-07-01','2026-09-16',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; Ex-Artal Int'),
	('World Region Aviation','AstonEast Taiba','triple',3,'RO','2026-07-01','2026-09-16',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; Ex-Artal Int'),
	('World Region Aviation','AstonEast Taiba','quad',4,'RO','2026-07-01','2026-09-16',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar; Ex-Artal Int'),
	('World Region Aviation','Winner Inn Al Khair','double',2,'RO','2026-06-30','2026-09-20',400,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Winner Inn Al Khair','triple',3,'RO','2026-06-30','2026-09-20',400,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Winner Inn Al Khair','quad',4,'RO','2026-06-30','2026-09-20',400,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','ODST Al Madina','double',2,'RO','2026-06-30','2026-08-14',370,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','ODST Al Madina','triple',3,'RO','2026-06-30','2026-08-14',390,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','ODST Al Madina','quad',4,'RO','2026-06-30','2026-08-14',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Saha Hotel','double',2,'RO','2026-06-30','2026-08-19',370,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Saha Hotel','triple',3,'RO','2026-06-30','2026-08-19',390,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Al Saha Hotel','quad',4,'RO','2026-06-30','2026-08-19',410,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nusuk Al Hijra','double',2,'RO','2026-06-30','2026-08-19',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nusuk Al Hijra','triple',3,'RO','2026-06-30','2026-08-19',380,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nusuk Al Hijra','quad',4,'RO','2026-06-30','2026-08-19',400,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Plaza Al Madinah','double',2,'RO','2026-06-20','2026-09-20',350,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Plaza Al Madinah','triple',3,'RO','2026-06-20','2026-09-20',375,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Plaza Al Madinah','quad',4,'RO','2026-06-20','2026-09-20',400,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Deyar Al Eiman Hotel','double',2,'RO','2026-06-30','2026-08-15',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Deyar Al Eiman Hotel','triple',3,'RO','2026-06-30','2026-08-15',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Deyar Al Eiman Hotel','quad',4,'RO','2026-06-30','2026-08-15',385,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Manazil Al Safia','double',2,'RO','2026-06-30','2026-08-15',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Manazil Al Safia','triple',3,'RO','2026-06-30','2026-08-15',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Manazil Al Safia','quad',4,'RO','2026-06-30','2026-08-15',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Rawaby Al Zahra','double',2,'RO','2026-06-30','2026-08-15',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Rawaby Al Zahra','triple',3,'RO','2026-06-30','2026-08-15',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Rawaby Al Zahra','quad',4,'RO','2026-06-30','2026-08-15',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Zowar','double',2,'RO','2026-06-30','2026-08-14',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Zowar','triple',3,'RO','2026-06-30','2026-08-14',320,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Grand Zowar','quad',4,'RO','2026-06-30','2026-08-14',330,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Taiba Hills','double',2,'RO','2026-06-16','2026-08-19',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Taiba Hills','triple',3,'RO','2026-06-16','2026-08-19',335,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Taiba Hills','quad',4,'RO','2026-06-16','2026-08-19',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nusuk Al Madinah','double',2,'RO','2026-06-16','2026-08-19',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nusuk Al Madinah','triple',3,'RO','2026-06-16','2026-08-19',335,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Nusuk Al Madinah','quad',4,'RO','2026-06-16','2026-08-19',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Rehab Al Mysk','double',2,'RO','2026-06-30','2026-09-20',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Rehab Al Mysk','triple',3,'RO','2026-06-30','2026-09-20',335,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Rehab Al Mysk','quad',4,'RO','2026-06-30','2026-09-20',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Rotana Al Mysk','double',2,'RO','2026-07-15','2026-09-20',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Rotana Al Mysk','triple',3,'RO','2026-07-15','2026-09-20',335,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Rotana Al Mysk','quad',4,'RO','2026-07-15','2026-09-20',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Arkan Al Manar','double',2,'RO','2026-06-30','2026-09-20',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Arkan Al Manar','triple',3,'RO','2026-06-30','2026-09-20',335,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Arkan Al Manar','quad',4,'RO','2026-06-30','2026-09-20',360,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Durrat Al Eiman Hotel','double',2,'RO','2026-06-30','2026-08-15',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Durrat Al Eiman Hotel','triple',3,'RO','2026-06-30','2026-08-15',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Durrat Al Eiman Hotel','quad',4,'RO','2026-06-30','2026-08-15',335,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Taiba','double',2,'RO','2026-06-30','2026-08-19',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Taiba','triple',3,'RO','2026-06-30','2026-08-19',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Emaar Taiba','quad',4,'RO','2026-06-30','2026-08-19',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Naeem','double',2,'RO','2026-07-01','2026-09-01',280,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Naeem','triple',3,'RO','2026-07-01','2026-09-01',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Dar Al Naeem','quad',4,'RO','2026-07-01','2026-09-01',340,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','The Season Hotel','double',2,'RO','2026-06-16','2026-08-15',260,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','The Season Hotel','triple',3,'RO','2026-06-16','2026-08-15',285,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','The Season Hotel','quad',4,'RO','2026-06-16','2026-08-15',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','GH Hotel','double',2,'RO','2026-06-16','2026-08-15',260,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','GH Hotel','triple',3,'RO','2026-06-16','2026-08-15',285,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','GH Hotel','quad',4,'RO','2026-06-16','2026-08-15',310,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Al Taqwa','double',2,'RO','2026-06-23','2026-09-20',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Al Taqwa','triple',3,'RO','2026-06-23','2026-09-20',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Maysan Al Taqwa','quad',4,'RO','2026-06-23','2026-09-20',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Anwar Al Zahraa','double',2,'RO','2026-06-30','2026-08-15',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Anwar Al Zahraa','triple',3,'RO','2026-06-30','2026-08-15',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Anwar Al Zahraa','quad',4,'RO','2026-06-30','2026-08-15',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Mohamdiah Al Zahraa','double',2,'RO','2026-06-30','2026-08-15',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Mohamdiah Al Zahraa','triple',3,'RO','2026-06-30','2026-08-15',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Mohamdiah Al Zahraa','quad',4,'RO','2026-06-30','2026-08-15',270,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Wadi Al Sufaraa','double',2,'RO','2026-06-01','2026-08-15',210,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Wadi Al Sufaraa','triple',3,'RO','2026-06-01','2026-08-15',235,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Wadi Al Sufaraa','quad',4,'RO','2026-06-01','2026-08-15',260,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Plaza Inn Ohud','double',2,'RO','2026-06-26','2026-09-20',235,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Plaza Inn Ohud','triple',3,'RO','2026-06-26','2026-09-20',235,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('World Region Aviation','Plaza Inn Ohud','quad',4,'RO','2026-06-26','2026-09-20',235,'WRA Madina Hotel Rates 1448H Vol-3; per room per night, net non-commissionable; non-refundable via Nusuk Masar'),
	('Country Club Travel','Le Meridien Towers','custom',1,'RO','2026-06-05','2026-08-31',235,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'RO','2026-06-05','2026-08-31',235,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'RO','2026-06-05','2026-08-31',235,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'RO','2026-06-05','2026-08-31',235,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'BB','2026-06-05','2026-08-31',240,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'BB','2026-06-05','2026-08-31',285,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'BB','2026-06-05','2026-08-31',330,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'BB','2026-06-05','2026-08-31',375,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'HB','2026-06-05','2026-08-31',235,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'HB','2026-06-05','2026-08-31',285,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'HB','2026-06-05','2026-08-31',335,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'HB','2026-06-05','2026-08-31',385,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'FB','2026-06-05','2026-08-31',260,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'FB','2026-06-05','2026-08-31',335,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'FB','2026-06-05','2026-08-31',410,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'FB','2026-06-05','2026-08-31',485,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Diplomatic Room; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'RO','2026-06-05','2026-08-31',285,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'RO','2026-06-05','2026-08-31',285,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'RO','2026-06-05','2026-08-31',285,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'RO','2026-06-05','2026-08-31',285,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'RO','2026-06-05','2026-08-31',310,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'BB','2026-06-05','2026-08-31',280,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'BB','2026-06-05','2026-08-31',325,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'BB','2026-06-05','2026-08-31',370,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'BB','2026-06-05','2026-08-31',415,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'BB','2026-06-05','2026-08-31',460,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'HB','2026-06-05','2026-08-31',250,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'HB','2026-06-05','2026-08-31',300,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'HB','2026-06-05','2026-08-31',350,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'HB','2026-06-05','2026-08-31',400,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'HB','2026-06-05','2026-08-31',450,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',1,'FB','2026-06-05','2026-08-31',275,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','double',2,'FB','2026-06-05','2026-08-31',350,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','triple',3,'FB','2026-06-05','2026-08-31',425,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'FB','2026-06-05','2026-08-31',500,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'FB','2026-06-05','2026-08-31',575,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Executive Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'RO','2026-06-05','2026-08-31',540,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'RO','2026-06-05','2026-08-31',540,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',6,'RO','2026-06-05','2026-08-31',540,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'BB','2026-06-05','2026-08-31',685,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'BB','2026-06-05','2026-08-31',730,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',6,'BB','2026-06-05','2026-08-31',775,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'HB','2026-06-05','2026-08-31',565,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'HB','2026-06-05','2026-08-31',615,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',6,'HB','2026-06-05','2026-08-31',665,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','quad',4,'FB','2026-06-05','2026-08-31',665,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',5,'FB','2026-06-05','2026-08-31',740,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Le Meridien Towers','custom',6,'FB','2026-06-05','2026-08-31',815,'CCT flyer (Jaweria Sheikh / Jennifer Davis); category: Royal Suite; occ1=single occ5=quint occ6=hexa; HB/FB = Pak-Indian menu'),
	('Country Club Travel','Fajr Al Badie 4','double',2,'RO','2026-06-25','2026-07-31',150,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Ibrahim Khalil Road; double/triple flat 150'),
	('Country Club Travel','Fajr Al Badie 4','triple',3,'RO','2026-06-25','2026-07-31',150,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Ibrahim Khalil Road; double/triple flat 150'),
	('Country Club Travel','Fajr Al Badie 4','quad',4,'RO','2026-06-25','2026-07-31',170,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Ibrahim Khalil Road; double/triple flat 150'),
	('Country Club Travel','Ancyra Hotel','double',2,'RO','2026-06-18','2026-10-01',310,'CCT flyer (Jaweria Sheikh / Jennifer Davis); EARLY BIRD offer; matches FEH exactly'),
	('Country Club Travel','Ancyra Hotel','triple',3,'RO','2026-06-18','2026-10-01',335,'CCT flyer (Jaweria Sheikh / Jennifer Davis); EARLY BIRD offer; matches FEH exactly'),
	('Country Club Travel','Ancyra Hotel','quad',4,'RO','2026-06-18','2026-10-01',360,'CCT flyer (Jaweria Sheikh / Jennifer Davis); EARLY BIRD offer; matches FEH exactly'),
	('Country Club Travel','Badar Al Massa','double',2,'RO','2026-06-16','2026-07-17',195,'CCT flyer (Jaweria Sheikh / Jennifer Davis); DBL/TPL/QUAD flat 195; custom=quint'),
	('Country Club Travel','Badar Al Massa','triple',3,'RO','2026-06-16','2026-07-17',195,'CCT flyer (Jaweria Sheikh / Jennifer Davis); DBL/TPL/QUAD flat 195; custom=quint'),
	('Country Club Travel','Badar Al Massa','quad',4,'RO','2026-06-16','2026-07-17',195,'CCT flyer (Jaweria Sheikh / Jennifer Davis); DBL/TPL/QUAD flat 195; custom=quint'),
	('Country Club Travel','Badar Al Massa','custom',5,'RO','2026-06-16','2026-07-17',220,'CCT flyer (Jaweria Sheikh / Jennifer Davis); DBL/TPL/QUAD flat 195; custom=quint'),
	('Country Club Travel','Al Ritz Al Madinah','double',2,'RO','2026-06-30','2026-08-14',500,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','triple',3,'RO','2026-06-30','2026-08-14',520,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','quad',4,'RO','2026-06-30','2026-08-14',540,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','custom',2,'RO','2026-06-30','2026-08-14',670,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','double',2,'RO','2026-08-15','2026-09-20',550,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','triple',3,'RO','2026-08-15','2026-09-20',570,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','quad',4,'RO','2026-08-15','2026-09-20',600,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','custom',2,'RO','2026-08-15','2026-09-20',720,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','double',2,'RO','2026-09-21','2026-12-08',620,'VERIFY: CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90; flyer prints band end as 08-09-2026 (typo) - read as 08-12-2026'),
	('Country Club Travel','Al Ritz Al Madinah','triple',3,'RO','2026-09-21','2026-12-08',650,'VERIFY: CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90; flyer prints band end as 08-09-2026 (typo) - read as 08-12-2026'),
	('Country Club Travel','Al Ritz Al Madinah','quad',4,'RO','2026-09-21','2026-12-08',680,'VERIFY: CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90; flyer prints band end as 08-09-2026 (typo) - read as 08-12-2026'),
	('Country Club Travel','Al Ritz Al Madinah','custom',2,'RO','2026-09-21','2026-12-08',800,'VERIFY: CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90; flyer prints band end as 08-09-2026 (typo) - read as 08-12-2026'),
	('Country Club Travel','Al Ritz Al Madinah','double',2,'RO','2026-12-09','2027-02-01',820,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','triple',3,'RO','2026-12-09','2027-02-01',870,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','quad',4,'RO','2026-12-09','2027-02-01',920,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Al Ritz Al Madinah','custom',2,'RO','2026-12-09','2027-02-01',1120,'CCT flyer (Jaweria Sheikh / Jennifer Davis); suite=custom occ2; extras: Intl FB 140, BB 50/person, Intl HB 90'),
	('Country Club Travel','Burj Al Mukhtara','triple',3,'RO','2026-06-30','2026-08-14',250,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','quad',4,'RO','2026-06-30','2026-08-14',270,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','triple',3,'RO','2026-08-15','2026-09-20',280,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','quad',4,'RO','2026-08-15','2026-09-20',300,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','triple',3,'RO','2026-09-21','2026-12-08',300,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','quad',4,'RO','2026-09-21','2026-12-08',320,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','triple',3,'RO','2026-12-09','2027-02-01',370,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','Burj Al Mukhtara','quad',4,'RO','2026-12-09','2027-02-01',390,'CCT flyer (Jaweria Sheikh / Jennifer Davis)'),
	('Country Club Travel','VOCO Makkah','quad',4,'RO','2026-06-07','2026-07-31',170,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Deluxe Room Quad WEEKDAY rate (weekend 180)'),
	('Country Club Travel','VOCO Makkah','quad',4,'RO','2026-06-07','2026-07-31',180,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Deluxe Room Quad WEEKEND rate'),
	('Country Club Travel','VOCO Makkah','custom',7,'RO','2026-06-07','2026-07-31',355,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Family Room (2 rooms 7 beds 2 toilets) WEEKDAY (weekend 375)'),
	('Country Club Travel','VOCO Makkah','custom',7,'RO','2026-06-07','2026-07-31',375,'CCT flyer (Jaweria Sheikh / Jennifer Davis); Family Room WEEKEND rate'),
	('Country Club Travel','VOCO Makkah','double',2,'RO','2026-06-07','2026-07-31',520,'CCT flyer (Jaweria Sheikh / Jennifer Davis); One Bed Room Suite (double); meals: BB 45 lunch 65 dinner 65 HB 65 FB 65'),
	('Country Club Travel','Furdaq Dossat Al Ashayr','custom',0,'RO','2026-06-11','2026-07-15',70,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: shuttle service'),
	('Country Club Travel','Masarat Royal','custom',0,'RO','2026-06-11','2026-07-15',90,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: shuttle service'),
	('Country Club Travel','Masarat Alghadra','custom',0,'RO','2026-06-11','2026-07-15',85,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 800-1000m'),
	('Country Club Travel','Nozol Sharoon','custom',0,'RO','2026-06-11','2026-07-15',120,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 900-1000m'),
	('Country Club Travel','Masarat Khair','custom',0,'RO','2026-06-11','2026-07-15',140,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 700m'),
	('Country Club Travel','Masarat Rulyem','custom',0,'RO','2026-06-11','2026-07-15',150,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 700m'),
	('Country Club Travel','Zem Al Muzalal','custom',0,'RO','2026-06-11','2026-07-15',260,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 850-1000m'),
	('Country Club Travel','Heraa Almuazzefin','custom',0,'RO','2026-06-11','2026-07-15',270,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 150-250m'),
	('Country Club Travel','Wasan Al Zahra','custom',0,'RO','2026-06-11','2026-07-15',105,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: shuttle service'),
	('Country Club Travel','Qaidat Al Diyafah','custom',0,'RO','2026-06-11','2026-07-15',135,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 400-500m'),
	('Country Club Travel','Masarat Mano Tazia','custom',0,'RO','2026-06-11','2026-07-15',140,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 300-350m'),
	('Country Club Travel','Ghadaf Silver','custom',0,'RO','2026-06-11','2026-07-15',215,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 400-500m'),
	('Country Club Travel','Fundaq Mira Korkom','custom',0,'RO','2026-06-11','2026-07-15',220,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 400-500m'),
	('Country Club Travel','Taqwa 2','custom',0,'RO','2026-06-11','2026-07-15',200,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 300-350m'),
	('Country Club Travel','Diyar Al Manniec','custom',0,'RO','2026-06-11','2026-07-15',315,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 1500m'),
	('Country Club Travel','Rayan Al Manisi','custom',0,'RO','2026-06-11','2026-07-15',330,'VERIFY: CCT by Noor E Deen early-bird (Mehwish Jabeen); FLAT rate, room type not specified - CONFIRM; offer valid till 15 Jul 2026 (booking deadline, stay dates TBC); distance: 800m')
)
INSERT INTO public.rate_observations
	(hotel_id, room_type, occupancy, vendor_id, check_in, check_out, rate, currency, meal_plan,
	 source, captured_at, notes)
SELECT
	public.resolve_hotel_id(r.hotel_name),
	r.room_type,
	r.occupancy,
	(SELECT id FROM public.vendors v WHERE lower(v.name) = lower(r.vendor) LIMIT 1),
	r.valid_from::date,
	r.valid_to::date,
	r.rate_sar,
	'SAR',
	r.meal_plan,
	'rate_sheet_import',
	now(),
	r.notes
FROM raw r
WHERE public.resolve_hotel_id(r.hotel_name) IS NOT NULL;  -- unresolved hotels skipped

-- 4. Verification — counts per vendor and per meal_plan.
SELECT v.name AS vendor, o.meal_plan, count(*) AS observations
FROM public.rate_observations o
JOIN public.vendors v ON v.id = o.vendor_id
WHERE o.source = 'rate_sheet_import'
GROUP BY GROUPING SETS ((v.name), (o.meal_plan))
ORDER BY v.name NULLS LAST, o.meal_plan NULLS LAST;


-- ----------------------------------------------------------------
-- migration: 20260622_rate_cards_hotel_id.sql
-- ----------------------------------------------------------------
-- =====================================================
-- rate_cards.hotel_id (Rate Intelligence — builder wiring)
-- =====================================================
-- Low-risk additive column: links a rate card to a canonical hotel. Nullable,
-- ON DELETE SET NULL, so existing rate_cards keep working (the canonical hotel
-- name is still written for backward compatibility). Run once.
-- =====================================================

ALTER TABLE public.rate_cards
	ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rate_cards_hotel_id ON public.rate_cards (hotel_id);


-- ----------------------------------------------------------------
-- migration: 20260623_queries_soft_delete.sql
-- ----------------------------------------------------------------
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


-- ----------------------------------------------------------------
-- migration: 20260624_query_replies.sql
-- ----------------------------------------------------------------
-- Client reply thread on a query. When a quote is sent the query sits in the
-- Quoted stage; each time the client responds, staff log it here and the query
-- moves back to Working. Kept as an append-only thread so the full back-and-forth
-- is visible on the card.

CREATE TABLE IF NOT EXISTS public.query_replies (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	-- who said it: the client's message, or our own note/suggestion back to them.
	sender TEXT NOT NULL DEFAULT 'client' CHECK (sender IN ('client', 'us')),
	body TEXT NOT NULL,
	author TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_replies_query ON public.query_replies (query_id, created_at);

-- RLS: dev-open-access.sql adds the permissive anon/authenticated policy to every
-- public table (re-run it after applying this migration). Real policies land in
-- Phase 4 with auth.
ALTER TABLE public.query_replies ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- migration: 20260625_query_activity.sql
-- ----------------------------------------------------------------
-- Activity log: a real timeline of what happened to a query (stage moves, quotes
-- sent, client messages, booking events, payments). Powers the "Recent updates"
-- panel in the query workspace. Append-only; best-effort writes from the app.

CREATE TABLE IF NOT EXISTS public.query_activity (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	-- coarse category for the icon/grouping: stage | quote | message | booking | payment | note
	kind TEXT NOT NULL DEFAULT 'note',
	summary TEXT NOT NULL,
	actor TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_activity_query ON public.query_activity (query_id, created_at DESC);

-- RLS: dev-open-access.sql adds the permissive anon/authenticated policy to every
-- public table (re-run it after applying this migration).
ALTER TABLE public.query_activity ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- migration: 20260626_realtime.sql
-- ----------------------------------------------------------------
-- Enable Supabase Realtime on the query tables so the board, activity timeline
-- and conversation stay in sync across open consoles. Idempotent: only adds a
-- table to the publication if it isn't already a member.

DO $$
DECLARE
	t TEXT;
BEGIN
	FOREACH t IN ARRAY ARRAY['queries', 'query_activity', 'query_replies']
	LOOP
		IF NOT EXISTS (
			SELECT 1 FROM pg_publication_tables
			WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
		) THEN
			EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
		END IF;
	END LOOP;
END $$;


-- ----------------------------------------------------------------
-- migration: 20260627_query_replies_sender.sql
-- ----------------------------------------------------------------
-- Fix: the sender column was added to the query_replies create-migration, but
-- databases that already had the table never got it (CREATE TABLE IF NOT EXISTS
-- is a no-op on re-run), so reply/note inserts fail. Add it idempotently here.

ALTER TABLE public.query_replies ADD COLUMN IF NOT EXISTS sender TEXT NOT NULL DEFAULT 'client';

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'query_replies_sender_check'
	) THEN
		ALTER TABLE public.query_replies
			ADD CONSTRAINT query_replies_sender_check CHECK (sender IN ('client', 'us')) NOT VALID;
	END IF;
END $$;


-- ----------------------------------------------------------------
-- migration: 20260628_booking_usd_rate.sql
-- ----------------------------------------------------------------
-- Bookings carry a SAR->PKR rate (roe); add a USD->PKR rate too so booking
-- services priced in USD convert correctly (mirrors the quotation builder's
-- two rates). Existing rows fall back to roe at read time.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS usd_rate NUMERIC;


-- ----------------------------------------------------------------
-- migration: 20260629_booking_lifecycle.sql
-- ----------------------------------------------------------------
-- Money-driven booking lifecycle: payment-vs-package check-in stages, a
-- "trip over but still owed" column, an order discount, and a manual override.

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_booking_status_check;

UPDATE public.queries SET booking_status = CASE booking_status
	WHEN 'Payment Done - Check-in Pending' THEN 'Payment Done - Check-in Left'
	WHEN 'Check-in Done - Payment Pending' THEN 'Payment Pending - Travel Done'
	WHEN 'Partial Payment'                 THEN 'Payment Pending - Check-in Left'
	ELSE booking_status
END
WHERE booking_status IS NOT NULL;

ALTER TABLE public.queries ADD CONSTRAINT queries_booking_status_check CHECK (
	booking_status IS NULL OR booking_status IN (
		'Pending Payment',
		'Payment Done - Check-in Left',
		'Payment Pending - Check-in Left',
		'Payment Pending - Travel Done',
		'Completed'
	)
);

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS booking_status_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.bookings
	ADD COLUMN IF NOT EXISTS discount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings
	ADD COLUMN IF NOT EXISTS discount_note TEXT;


-- ----------------------------------------------------------------
-- dev-open-access.sql (anon RLS for the build-out phase)
-- ----------------------------------------------------------------
-- =====================================================
-- DEV ONLY — open access without authentication
-- =====================================================
-- The real policies in complete-schema.sql require auth.role() = 'authenticated'.
-- While we build the system with auth disabled in the UI, the anon Supabase key
-- would otherwise be blocked by RLS. This adds a permissive "dev_open_access"
-- policy to every RLS-enabled table in the public schema so the anon role can
-- read & write.
--
-- Run this once in the Supabase SQL editor.
--
-- ⚠️  This makes the database fully readable/writable by anyone holding the
--     anon key + project URL. Acceptable for a private build-out, NOT for
--     production. Run the REVERT block at the bottom before going live, then
--     re-enable real auth.
-- =====================================================

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- Make sure RLS is on (so the policy is the thing granting access).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS dev_open_access ON public.%I;', t.tablename);
    EXECUTE format(
      'CREATE POLICY dev_open_access ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      t.tablename
    );
  END LOOP;
END $$;

-- Storage: allow the anon role to use the documents bucket too.
DROP POLICY IF EXISTS dev_open_storage ON storage.objects;
CREATE POLICY dev_open_storage ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

-- =====================================================
-- REVERT (run before production)
-- =====================================================
-- DO $$
-- DECLARE t RECORD;
-- BEGIN
--   FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
--     EXECUTE format('DROP POLICY IF EXISTS dev_open_access ON public.%I;', t.tablename);
--   END LOOP;
-- END $$;
-- DROP POLICY IF EXISTS dev_open_storage ON storage.objects;


-- ----------------------------------------------------------------
-- Reload PostgREST schema cache so new columns are visible immediately.
-- ----------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
