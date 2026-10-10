-- =====================================================
-- Hajj: booking bridge, traveller details, GMC settlement, commission receipts
-- =====================================================
-- Run once in the Supabase SQL editor (after 20260638_hajj_quote.sql),
-- THEN re-run dev-open-access.sql (covers the new table).
--
-- Purely additive: new nullable columns + one new table.
-- =====================================================

-- USD -> PKR rate for a Hajj family. Payments, finance and the booking
-- lifecycle are PKR-based, so the USD part of a quote needs a rate to be
-- counted there. The client-facing proposal still shows USD unconverted.
ALTER TABLE public.hajj_quotes
	ADD COLUMN IF NOT EXISTS usd_rate NUMERIC(10, 4) CHECK (usd_rate IS NULL OR usd_rate > 0);

-- Hajj application details per traveller (what the booking form asks for).
-- Name, CNIC, passport, DOB, gender and address live on the passenger profile.
ALTER TABLE public.hajj_travellers
	ADD COLUMN IF NOT EXISTS marital_status TEXT,
	ADD COLUMN IF NOT EXISTS blood_group TEXT
		CHECK (blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
	ADD COLUMN IF NOT EXISTS fiqah TEXT,
	ADD COLUMN IF NOT EXISTS performed_hajj_5y BOOLEAN,
	ADD COLUMN IF NOT EXISTS hajj_e_badal BOOLEAN,
	ADD COLUMN IF NOT EXISTS group_worker BOOLEAN,
	ADD COLUMN IF NOT EXISTS is_diabetic BOOLEAN,
	ADD COLUMN IF NOT EXISTS is_smoker BOOLEAN,
	ADD COLUMN IF NOT EXISTS profession TEXT,
	-- A woman's mehram: another traveller on the same family quote, plus the relation.
	ADD COLUMN IF NOT EXISTS mehram_traveller_id UUID REFERENCES public.hajj_travellers(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS mehram_relation TEXT,
	-- Next of kin / nominee in case of emergency.
	ADD COLUMN IF NOT EXISTS kin_name TEXT,
	ADD COLUMN IF NOT EXISTS kin_phone TEXT,
	ADD COLUMN IF NOT EXISTS kin_cnic TEXT,
	ADD COLUMN IF NOT EXISTS kin_relation TEXT;

-- GMC settlement. While a query is still being quoted, a GMC share is computed
-- from its own family. Once queries are in the Booking stage, the shared pool is
-- settled across clients and packages and the result is stored on the line:
--   pool_cost    — this traveller's final share of the vehicle (vehicle currency)
--   pool_sharers — how many people share that vehicle
--   pool_vehicle — which vehicle, e.g. 'SAR-3'
-- NULL = not settled (still quoting).
ALTER TABLE public.hajj_traveller_addons
	ADD COLUMN IF NOT EXISTS pool_cost NUMERIC(12, 2) CHECK (pool_cost IS NULL OR pool_cost >= 0),
	ADD COLUMN IF NOT EXISTS pool_sharers INTEGER CHECK (pool_sharers IS NULL OR pool_sharers > 0),
	ADD COLUMN IF NOT EXISTS pool_vehicle TEXT;

-- Commission the vendor has actually paid us. What we are OWED is computed from
-- confirmed travellers x each package's commission_per_person; this records what
-- has been received, so the outstanding amount is expected - received.
CREATE TABLE IF NOT EXISTS public.hajj_commission_receipts (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
	currency TEXT NOT NULL CHECK (currency IN ('USD', 'SAR', 'PKR')),
	received_date DATE NOT NULL DEFAULT CURRENT_DATE,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hajj_commission_receipts_date
	ON public.hajj_commission_receipts (received_date DESC);
