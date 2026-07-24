-- =====================================================
-- Multi-currency vendor payments
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- Vendor settlements aren't always paid in PKR: some vendors are paid in SAR
-- (e.g. Mawasim), others in USD (e.g. DOTW). Until now `amount` was assumed to
-- be PKR, so those payments had to be pre-converted and the original figure was
-- lost.
--
-- This is purely additive:
--   * `currency`     — the currency the payment was actually made in.
--   * `rate_to_pkr`  — "1 unit of currency = rate_to_pkr PKR" (1 for PKR).
-- `amount` now holds the value in `currency`; the PKR value is amount ×
-- rate_to_pkr, computed in-app via the money layer. Existing rows default to
-- ('PKR', 1), so amount keeps meaning exactly what it did — nothing else changes.
-- =====================================================

ALTER TABLE public.vendor_payments
	ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR'
		CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP')),
	ADD COLUMN IF NOT EXISTS rate_to_pkr NUMERIC(10, 4) NOT NULL DEFAULT 1
		CHECK (rate_to_pkr > 0);
