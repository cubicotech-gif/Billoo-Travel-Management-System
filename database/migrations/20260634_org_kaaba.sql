-- =====================================================
-- Branding: uploadable Kaaba emblem for the Umrah/Hajj voucher
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- Like the logo, stored as a data URL (base64) so it embeds in printed PDFs.
-- When empty, the voucher falls back to the built-in Kaaba line-art SVG.
-- Purely additive.
-- =====================================================

ALTER TABLE public.org_settings
	ADD COLUMN IF NOT EXISTS kaaba_url TEXT;
ALTER TABLE public.org_settings
	ADD COLUMN IF NOT EXISTS kaaba_height INTEGER NOT NULL DEFAULT 56 CHECK (kaaba_height BETWEEN 24 AND 240);
