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
);

CREATE INDEX IF NOT EXISTS idx_queries_passenger_id ON public.queries (passenger_id);
CREATE INDEX IF NOT EXISTS idx_passengers_is_deleted ON public.passengers (is_deleted);
