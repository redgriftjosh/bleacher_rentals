-- ============================================================================
-- Tests for the ChangeLog table and Users.changelog_last_read_at.
-- Verifies:
--   * version is unique (one row per released version, insert is idempotent)
--   * released_at defaults to now()
--   * changelog_last_read_at exists on Users and defaults to NULL
--   * RLS: authenticated users may SELECT, but may NOT write
-- ============================================================================

\set ON_ERROR_STOP on
\timing off

BEGIN;
SET search_path TO extensions, public, "$user";
SELECT plan(1);

DO $$
DECLARE
  v_id        UUID;
  v_released  TIMESTAMPTZ;
  v_last_read TIMESTAMPTZ;
  v_user_id   UUID;
  v_count     INTEGER;
  v_failed    BOOLEAN;
BEGIN
  RAISE NOTICE '--- changelog tests ---';

  -- Insert populates defaults
  INSERT INTO "ChangeLog" (version, body_md)
  VALUES ('99.0.0', '## Test release')
  RETURNING id, released_at INTO v_id, v_released;

  ASSERT v_id IS NOT NULL, 'insert returns a generated id';
  ASSERT v_released IS NOT NULL, 'released_at defaults to now()';

  -- version is unique: a second insert of the same version must fail
  v_failed := FALSE;
  BEGIN
    INSERT INTO "ChangeLog" (version, body_md) VALUES ('99.0.0', 'duplicate');
  EXCEPTION WHEN unique_violation THEN
    v_failed := TRUE;
  END;
  ASSERT v_failed, 'duplicate version is rejected by the unique constraint';

  -- Users.changelog_last_read_at exists and starts NULL
  INSERT INTO "Users" (first_name, last_name, email, clerk_user_id, is_admin)
  VALUES ('Change', 'Log', 'changelog_test@test.com', 'clerk_changelog_test', false)
  RETURNING id, changelog_last_read_at INTO v_user_id, v_last_read;

  ASSERT v_last_read IS NULL, 'changelog_last_read_at starts NULL';

  UPDATE "Users" SET changelog_last_read_at = now() WHERE id = v_user_id;
  SELECT changelog_last_read_at INTO v_last_read FROM "Users" WHERE id = v_user_id;
  ASSERT v_last_read IS NOT NULL, 'changelog_last_read_at is writable';

  -- RLS is on, with exactly one policy: SELECT for authenticated.
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'ChangeLog';
  ASSERT v_count = 1, 'ChangeLog has exactly one policy (select only)';

  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ChangeLog'
    AND cmd = 'SELECT'
    AND 'authenticated' = ANY(roles);
  ASSERT v_count = 1, 'authenticated users may select the changelog';

  -- No write policies exist, so PostgREST writes are impossible for
  -- authenticated/anon. Inserts come from CI via the service role, which
  -- bypasses RLS entirely.
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ChangeLog'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  ASSERT v_count = 0, 'no insert/update/delete policies on ChangeLog';

  SELECT relrowsecurity INTO v_failed FROM pg_class WHERE relname = 'ChangeLog';
  ASSERT v_failed, 'row level security is enabled on ChangeLog';

  RAISE NOTICE '--- all changelog assertions passed ---';
END $$;

SELECT ok(true, 'all assertions passed');

SELECT * FROM finish();

ROLLBACK;
