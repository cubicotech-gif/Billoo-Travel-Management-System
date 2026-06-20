-- Fix: the sender column was added to the query_replies create-migration, but
-- databases that already had the table never got it (CREATE TABLE IF NOT EXISTS
-- is a no-op on re-run), so reply/note inserts fail. Add it idempotently here.

ALTER TABLE public.query_replies ADD COLUMN IF NOT EXISTS sender TEXT NOT NULL DEFAULT 'client';

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'query_replies_sender_check'
	) THEN
		ALTER TABLE public.query_replies
			ADD CONSTRAINT query_replies_sender_check CHECK (sender IN ('client', 'us'));
	END IF;
END $$;
