-- Upgrade passengers table with 360° profile fields
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS cnic TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Pakistan';
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.passengers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_passengers_status ON public.passengers(status);
CREATE INDEX IF NOT EXISTS idx_passengers_city ON public.passengers(city);
CREATE INDEX IF NOT EXISTS idx_passengers_tags ON public.passengers USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_passengers_cnic ON public.passengers(cnic);
