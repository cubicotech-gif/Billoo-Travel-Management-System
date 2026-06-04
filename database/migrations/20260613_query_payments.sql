-- =====================================================
-- Payment schedule per query (deposit + balance, due dates, receipts)
-- =====================================================
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.query_payments (
	id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
	query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
	label TEXT NOT NULL DEFAULT 'Payment',
	amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
	due_date DATE,
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
	paid_date DATE,
	method TEXT,
	reference TEXT,
	notes TEXT,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_payments_query ON public.query_payments (query_id);

DROP TRIGGER IF EXISTS update_query_payments_updated_at ON public.query_payments;
CREATE TRIGGER update_query_payments_updated_at BEFORE UPDATE ON public.query_payments
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
