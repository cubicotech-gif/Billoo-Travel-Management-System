-- =====================================================
-- DEV ONLY — open access without authentication
-- =====================================================
-- The real policies in complete-schema.sql require auth.role() = 'authenticated'.
-- While we build the system with auth disabled in the UI, the anon Supabase key
-- would otherwise be blocked by RLS. This adds a permissive "dev_open_access"
-- policy to every RLS-enabled table in the public schema so the anon role can
-- read & write.
--
-- Run this once in the Supabase SQL editor.
--
-- ⚠️  This makes the database fully readable/writable by anyone holding the
--     anon key + project URL. Acceptable for a private build-out, NOT for
--     production. Run the REVERT block at the bottom before going live, then
--     re-enable real auth.
-- =====================================================

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- Make sure RLS is on (so the policy is the thing granting access).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS dev_open_access ON public.%I;', t.tablename);
    EXECUTE format(
      'CREATE POLICY dev_open_access ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      t.tablename
    );
  END LOOP;
END $$;

-- Storage: allow the anon role to use the documents bucket too.
DROP POLICY IF EXISTS dev_open_storage ON storage.objects;
CREATE POLICY dev_open_storage ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

-- =====================================================
-- REVERT (run before production)
-- =====================================================
-- DO $$
-- DECLARE t RECORD;
-- BEGIN
--   FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
--     EXECUTE format('DROP POLICY IF EXISTS dev_open_access ON public.%I;', t.tablename);
--   END LOOP;
-- END $$;
-- DROP POLICY IF EXISTS dev_open_storage ON storage.objects;
