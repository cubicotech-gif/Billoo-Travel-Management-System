-- Phase 5: Query Services ROE/Currency + Query PKR Totals + Passenger Auto-Match Index
-- Migration: 20260326_query_services_roe.sql

-- 1. Add ROE/currency columns to query_services
ALTER TABLE public.query_services ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR'
  CHECK (currency IN ('PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP'));
ALTER TABLE public.query_services ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4);
ALTER TABLE public.query_services ADD COLUMN IF NOT EXISTS cost_price_pkr DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.query_services ADD COLUMN IF NOT EXISTS selling_price_pkr DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.query_services ADD COLUMN IF NOT EXISTS profit_pkr DECIMAL(12, 2) DEFAULT 0;

-- 2. Add advance payment tracking + PKR totals to queries
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS advance_payment_recorded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS advance_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS total_cost_pkr DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS total_selling_pkr DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS total_profit_pkr DECIMAL(12, 2) DEFAULT 0;

-- 3. Index for passenger auto-matching (name + phone)
CREATE INDEX IF NOT EXISTS idx_passengers_name_phone ON public.passengers(first_name, last_name, phone);

-- 4. Backfill existing query_services: default to PKR with exchange_rate=1
UPDATE public.query_services
SET currency = 'PKR',
    exchange_rate = 1,
    cost_price_pkr = COALESCE(cost_price, 0),
    selling_price_pkr = COALESCE(selling_price, 0),
    profit_pkr = COALESCE(selling_price, 0) - COALESCE(cost_price, 0)
WHERE currency IS NULL OR cost_price_pkr = 0;

-- 5. Backfill existing queries PKR totals from their services
UPDATE public.queries q
SET total_cost_pkr = sub.tc,
    total_selling_pkr = sub.ts,
    total_profit_pkr = sub.ts - sub.tc
FROM (
  SELECT query_id,
         COALESCE(SUM(COALESCE(cost_price_pkr, cost_price, 0) * COALESCE(quantity, 1)), 0) AS tc,
         COALESCE(SUM(COALESCE(selling_price_pkr, selling_price, 0) * COALESCE(quantity, 1)), 0) AS ts
  FROM public.query_services
  GROUP BY query_id
) sub
WHERE q.id = sub.query_id;
