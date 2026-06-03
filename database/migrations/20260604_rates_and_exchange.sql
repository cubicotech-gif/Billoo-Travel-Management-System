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
