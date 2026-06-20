-- Bookings carry a SAR->PKR rate (roe); add a USD->PKR rate too so booking
-- services priced in USD convert correctly (mirrors the quotation builder's
-- two rates). Existing rows fall back to roe at read time.

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS usd_rate NUMERIC;
