-- =====================================================
-- Hajj package builder — quote, travellers, add-ons
-- =====================================================
-- Run once in the Supabase SQL editor (after 20260637_hajj_catalogue.sql),
-- THEN re-run dev-open-access.sql (covers the new tables).
--
-- One query = one family. A Hajj query has one `hajj_quotes` row (the ROE and
-- notes) and one `hajj_travellers` row per person. Each traveller links to a
-- passenger profile (own passport / documents) and picks a catalogue package,
-- hotel option and room sharing — by default the same as the rest of the family,
-- but each can differ. Costs always come live from the catalogue; only the
-- selling prices (and manual cost overrides) are stored here.
--
-- Purely additive: no existing table is touched.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hajj_quotes (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL UNIQUE REFERENCES public.queries(id) ON DELETE CASCADE,
	roe NUMERIC(10, 4) NOT NULL DEFAULT 77 CHECK (roe > 0), -- SAR -> PKR
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hajj_travellers (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	passenger_id UUID NOT NULL REFERENCES public.passengers(id) ON DELETE RESTRICT,
	is_lead BOOLEAN NOT NULL DEFAULT FALSE, -- the family's lead traveller
	package_id UUID NOT NULL REFERENCES public.hajj_packages(id) ON DELETE RESTRICT,
	option_code TEXT NOT NULL DEFAULT 'A' CHECK (option_code IN ('A', 'B')),
	room_type TEXT NOT NULL CHECK (room_type IN ('Sharing', 'Quad', 'Triple', 'Double')),

	-- Selling price of the base package, in the package's catalogue currency.
	-- May be set below the catalogue cost; add-ons may not (enforced in-app).
	sell_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),

	-- Air ticket: not part of any package; sold by us in PKR (adult fare).
	ticket_airline TEXT,
	ticket_cost_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (ticket_cost_pkr >= 0),
	ticket_sell_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (ticket_sell_pkr >= 0),

	notes TEXT,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (query_id, passenger_id) -- a person can only be on a family quote once
);

-- Add-ons a traveller has taken.
--   qty            — e.g. number of extra Medinah nights; 1 for everything else.
--   cost_override  — manual cost, for add-ons the catalogue has no price for yet
--                    (tents, business class). NULL = use the catalogue cost.
--   sell_price     — NULL = sell at cost; otherwise must be >= cost (in-app).
CREATE TABLE IF NOT EXISTS public.hajj_traveller_addons (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	traveller_id UUID NOT NULL REFERENCES public.hajj_travellers(id) ON DELETE CASCADE,
	addon_id UUID NOT NULL REFERENCES public.hajj_addons(id) ON DELETE RESTRICT,
	qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
	cost_override NUMERIC(12, 2) CHECK (cost_override >= 0),
	sell_price NUMERIC(12, 2) CHECK (sell_price >= 0),
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW(),
	UNIQUE (traveller_id, addon_id)
);

CREATE INDEX IF NOT EXISTS idx_hajj_travellers_query ON public.hajj_travellers (query_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hajj_traveller_addons_traveller ON public.hajj_traveller_addons (traveller_id);

DROP TRIGGER IF EXISTS update_hajj_quotes_updated_at ON public.hajj_quotes;
CREATE TRIGGER update_hajj_quotes_updated_at BEFORE UPDATE ON public.hajj_quotes
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hajj_travellers_updated_at ON public.hajj_travellers;
CREATE TRIGGER update_hajj_travellers_updated_at BEFORE UPDATE ON public.hajj_travellers
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hajj_traveller_addons_updated_at ON public.hajj_traveller_addons;
CREATE TRIGGER update_hajj_traveller_addons_updated_at BEFORE UPDATE ON public.hajj_traveller_addons
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
