-- Enable Supabase Realtime on the query tables so the board, activity timeline
-- and conversation stay in sync across open consoles. Idempotent: only adds a
-- table to the publication if it isn't already a member.

DO $$
DECLARE
	t TEXT;
BEGIN
	FOREACH t IN ARRAY ARRAY['queries', 'query_activity', 'query_replies']
	LOOP
		IF NOT EXISTS (
			SELECT 1 FROM pg_publication_tables
			WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
		) THEN
			EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
		END IF;
	END LOOP;
END $$;
