-- =====================================================
-- Hajj: other services (custom lines per traveller)
-- =====================================================
-- Run once in the Supabase SQL editor (after 20260641_hajj_vendor_payments.sql),
-- THEN re-run dev-open-access.sql (covers the new table).
--
-- Services a client asks for that are not in the vendor catalogue — wheelchair
-- assistance, extra luggage, a private car … — entered by hand with their own
-- cost and selling price, in USD, SAR or PKR. Like catalogue add-ons they are
-- never sold below cost (enforced in-app). Purely additive.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hajj_traveller_extras (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	traveller_id UUID NOT NULL REFERENCES public.hajj_travellers(id) ON DELETE CASCADE,
	label TEXT NOT NULL CHECK (length(btrim(label)) > 0),
	currency TEXT NOT NULL DEFAULT 'SAR' CHECK (currency IN ('USD', 'SAR', 'PKR')),
	cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
	sell_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hajj_traveller_extras_traveller
	ON public.hajj_traveller_extras (traveller_id, sort_order);

DROP TRIGGER IF EXISTS update_hajj_traveller_extras_updated_at ON public.hajj_traveller_extras;
CREATE TRIGGER update_hajj_traveller_extras_updated_at BEFORE UPDATE ON public.hajj_traveller_extras
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
