-- =====================================================
-- Organisation settings (branding for documents)
-- =====================================================
-- Run once in the Supabase SQL editor, THEN re-run dev-open-access.sql.
--
-- A single-row settings table holding the company logo + details that the
-- voucher / invoice print from. The logo is stored as a data URL (base64) so it
-- embeds directly in printed PDFs without needing a signed storage URL.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.org_settings (
	id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- enforce a single row
	company_name TEXT NOT NULL DEFAULT 'Billoo Travels',
	tagline TEXT DEFAULT 'Since 1969 · Umrah & Travel',
	logo_url TEXT, -- data URL (base64), or null to fall back to the text wordmark
	logo_height INTEGER NOT NULL DEFAULT 80 CHECK (logo_height BETWEEN 24 AND 240),
	address TEXT DEFAULT 'M-2 Mezzanine Floor, Plot No 41-C, 27th Commercial Street, Phase-V, Tauheed Commercial, DHA Karachi',
	phone TEXT DEFAULT '021 35876791 / 92 / 93',
	email TEXT DEFAULT 'Billootravels@gmail.com',
	website TEXT DEFAULT 'www.Billootravels.com',
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the single row.
INSERT INTO public.org_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_org_settings_updated_at ON public.org_settings;
CREATE TRIGGER update_org_settings_updated_at BEFORE UPDATE ON public.org_settings
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
