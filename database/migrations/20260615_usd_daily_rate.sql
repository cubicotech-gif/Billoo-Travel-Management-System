-- Multi-currency daily rates: keep the SAR->PKR ROE, add an optional USD->PKR
-- rate on the same per-day row. Umrah is priced wholly in SAR; Umrah-Plus and
-- other trips may carry USD components (hotels/transfers/visa). Final selling
-- prices are always PKR, converted at the day's rate.
ALTER TABLE public.exchange_rates
	ADD COLUMN IF NOT EXISTS usd_to_pkr NUMERIC(10, 4) CHECK (usd_to_pkr IS NULL OR usd_to_pkr > 0);

COMMENT ON COLUMN public.exchange_rates.usd_to_pkr IS '1 USD = ? PKR for the day (optional; used by non-SAR quote components).';
