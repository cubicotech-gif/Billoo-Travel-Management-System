-- Track when the booking voucher was shared with the client (green-tick state).
-- Run once (or re-run complete-schema.sql), then dev-open-access.sql.

ALTER TABLE public.queries
	ADD COLUMN IF NOT EXISTS voucher_sent_at TIMESTAMPTZ;
