-- Add Umrah/Hajj package fields and budget fields to queries table
ALTER TABLE queries ADD COLUMN IF NOT EXISTS package_nights INTEGER;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS city_order TEXT CHECK (city_order IN ('makkah_first', 'madinah_first'));
ALTER TABLE queries ADD COLUMN IF NOT EXISTS makkah_nights INTEGER;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS madinah_nights INTEGER;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS hotel_preferences TEXT;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2);
ALTER TABLE queries ADD COLUMN IF NOT EXISTS budget_type TEXT CHECK (budget_type IN ('total', 'per_person'));
ALTER TABLE queries ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'umrah' CHECK (service_category IN ('umrah', 'hajj', 'leisure', 'visa_only', 'flight_only', 'other'));
