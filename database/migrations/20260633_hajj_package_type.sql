-- =====================================================
-- Add 'Hajj' to the package_type options
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- Widens the CHECK constraint (additive — no existing rows change). Hajj is
-- treated like Umrah for the religious voucher design.
-- =====================================================

ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_package_type_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_package_type_check CHECK (
	package_type IS NULL OR package_type IN ('Umrah', 'Umrah Plus', 'Hajj', 'Tour', 'Leisure')
);
