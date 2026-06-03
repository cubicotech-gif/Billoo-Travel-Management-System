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
